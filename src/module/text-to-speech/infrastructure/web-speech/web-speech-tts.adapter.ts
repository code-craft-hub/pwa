import type { SpeechRequest } from '../../domain/entities/speech-request.entity';
import type { SpeechState } from '../../domain/entities/speech-state.entity';
import type { TTSPort } from '../../domain/ports/tts.port';

interface WordMark {
  charIndex: number;
  charLength: number;
  startMs: number;
}

/**
 * TTS adapter using the browser's built-in Web Speech API.
 *
 * Word highlighting strategy:
 *  - If the voice fires native `onboundary` word events (local voices, Microsoft
 *    cloud voices in Edge) those are used directly — most accurate.
 *  - If the first boundary never fires (Google cloud voices), a timer-based
 *    fallback kicks in automatically. It estimates each word's start time from
 *    character counts, speech rate and punctuation pauses. The timer resets at
 *    every chunk boundary so drift never accumulates beyond one chunk (~10 s).
 *
 * Long texts are split into ≤300-char chunks so Chrome reliably fires onstart
 * (Chrome silently refuses to process very large single utterances).
 */
export class WebSpeechTTSAdapter implements TTSPort {
  private utterance: SpeechSynthesisUtterance | null = null;
  private stopped   = false;
  private wordTimer: ReturnType<typeof setInterval> | null = null;

  speak(
    request: SpeechRequest,
    onStateChange: (state: SpeechState) => void,
    onWordBoundary?: (charIndex: number, charLength: number) => void
  ): Promise<void> {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      onStateChange({ status: 'error', error: 'Web Speech API is not supported in this browser.' });
      return Promise.resolve();
    }

    this.stop();
    this.stopped = false;

    const chunks = WebSpeechTTSAdapter.splitIntoChunks(request.text);
    const synth  = window.speechSynthesis;

    return new Promise<void>((resolve) => {
      const speakChunk = (idx: number): void => {
        if (this.stopped || idx >= chunks.length) {
          if (!this.stopped) onStateChange({ status: 'idle' });
          resolve();
          return;
        }

        const { text: chunkText, start: chunkStart } = chunks[idx];
        const utterance = new SpeechSynthesisUtterance(chunkText);
        this.utterance = utterance;

        const matched = synth.getVoices().find((v) => v.voiceURI === request.voice.id);
        if (matched) utterance.voice = matched;
        utterance.rate   = Math.max(0.1, Math.min(10, request.rate));
        utterance.volume = Math.max(0, Math.min(1, request.volume));
        utterance.pitch  = 1;

        let keepAlive: ReturnType<typeof setInterval>;

        // ── Word boundary helpers ──────────────────────────────────────────
        const clearWordTimer = () => {
          if (this.wordTimer) { clearInterval(this.wordTimer); this.wordTimer = null; }
        };

        // onstart: begin timer-based fallback; cancelled if native fires
        utterance.onstart = () => {
          onStateChange({ status: 'playing', currentChunk: idx + 1, totalChunks: chunks.length });

          if (!onWordBoundary) return;

          clearWordTimer();
          const timeline  = WebSpeechTTSAdapter.buildWordTimeline(chunkText, request.rate);
          let startTime   = Date.now();
          let pauseTime   = 0;
          let timerActive = true;
          let lastMark    = -1;
          let nativeFired = false;

          // Expose pause/resume controls to the utterance handlers below
          utterance.onpause = () => {
            timerActive = false;
            pauseTime   = Date.now();
          };
          utterance.onresume = () => {
            if (pauseTime > 0) startTime += Date.now() - pauseTime;
            timerActive = true;
          };

          // Cancel timer the moment a native boundary arrives
          const cancelTimerOnNative = () => {
            nativeFired = true;
            clearWordTimer();
          };

          // Override the onboundary set below to also stop the timer
          const prevBoundary = utterance.onboundary as ((e: SpeechSynthesisEvent) => void) | null;
          utterance.onboundary = (e: SpeechSynthesisEvent) => {
            if (e.name === 'word') cancelTimerOnNative();
            prevBoundary?.call(utterance, e);
          };

          this.wordTimer = setInterval(() => {
            if (nativeFired || !timerActive) return;
            const elapsed = Date.now() - startTime;
            for (let i = lastMark + 1; i < timeline.length; i++) {
              if (timeline[i].startMs <= elapsed) {
                lastMark = i;
                const w = timeline[i];
                onWordBoundary(chunkStart + w.charIndex, w.charLength);
              } else {
                break;
              }
            }
          }, 50);
        };

        // ── Lifecycle ──────────────────────────────────────────────────────
        utterance.onend = () => {
          clearInterval(keepAlive);
          clearWordTimer();
          speakChunk(idx + 1);
        };

        utterance.onerror = (e) => {
          clearInterval(keepAlive);
          clearWordTimer();
          if (e.error === 'interrupted' || e.error === 'canceled') {
            onStateChange({ status: 'idle' });
          } else {
            onStateChange({ status: 'error', error: `Speech error: ${e.error}` });
          }
          resolve();
        };

        // ── Native word boundary (local voices / Edge Microsoft voices) ────
        if (onWordBoundary) {
          utterance.onboundary = (e) => {
            if (e.name !== 'word') return;
            const charLen: number =
              (e as SpeechSynthesisEvent & { charLength?: number }).charLength ??
              WebSpeechTTSAdapter.estimateWordLength(chunkText, e.charIndex);
            onWordBoundary(chunkStart + e.charIndex, charLen);
          };
        }

        if (idx === 0) {
          onStateChange({ status: 'loading', currentChunk: 1, totalChunks: chunks.length });
        }

        synth.speak(utterance);

        // Chrome pauses silently after ~15 s; keep it alive by cycling pause/resume
        keepAlive = setInterval(() => {
          if (synth.speaking && !synth.paused) {
            synth.pause();
            synth.resume();
          } else {
            clearInterval(keepAlive);
          }
        }, 10_000);
      };

      speakChunk(0);
    });
  }

  pause(): void  { window.speechSynthesis?.pause(); }
  resume(): void { window.speechSynthesis?.resume(); }

  stop(): void {
    this.stopped = true;
    if (this.wordTimer) { clearInterval(this.wordTimer); this.wordTimer = null; }
    if (this.utterance) {
      this.utterance.onstart    = null;
      this.utterance.onend      = null;
      this.utterance.onerror    = null;
      this.utterance.onboundary = null;
      this.utterance.onpause    = null;
      this.utterance.onresume   = null;
      this.utterance = null;
    }
    window.speechSynthesis?.cancel();
  }

  // ── Word timeline builder ────────────────────────────────────────────────────
  /**
   * Estimates the start time (in ms from utterance start) of every word in
   * `text` at the given speech `rate`.  Used as a fallback when the voice does
   * not fire native boundary events.
   *
   * Model (all values divided by `rate`):
   *  - 13 chars/s  → base speaking speed for English at rate=1
   *  - 60 ms       → gap between words
   *  - 350 ms      → pause after sentence-ending punctuation  (. ! ?)
   *  - 160 ms      → pause after clause-separating punctuation (, ; :)
   */
  private static buildWordTimeline(text: string, rate: number): WordMark[] {
    const msPerChar  = 1000 / (13 * rate);
    const wordGap    =  60  / rate;
    const sentPause  = 350  / rate;
    const clausePause = 160 / rate;

    const marks: WordMark[] = [];
    let t = 0;
    let i = 0;

    while (i < text.length) {
      // Skip whitespace, adding a pause proportional to what came before it
      if (/\s/.test(text[i])) {
        const prev = i > 0 ? text[i - 1] : '';
        while (i < text.length && /\s/.test(text[i])) i++;
        if      (/[.!?]/.test(prev))  t += sentPause;
        else if (/[,;:]/.test(prev))  t += clausePause;
        else                          t += wordGap;
        continue;
      }

      // Read one word token (non-whitespace run)
      const start = i;
      while (i < text.length && !/\s/.test(text[i])) i++;
      const word = text.slice(start, i);

      marks.push({ charIndex: start, charLength: word.length, startMs: t });
      t += word.length * msPerChar;
    }

    return marks;
  }

  // ── Text chunker ─────────────────────────────────────────────────────────────
  private static splitIntoChunks(
    text: string,
    maxLen = 300
  ): Array<{ text: string; start: number }> {
    if (text.length <= maxLen) return [{ text, start: 0 }];

    const chunks: Array<{ text: string; start: number }> = [];
    let i = 0;

    while (i < text.length) {
      while (i < text.length && /\s/.test(text[i])) i++;
      if (i >= text.length) break;

      const start = i;
      let end = Math.min(i + maxLen, text.length);

      if (end < text.length) {
        let j = end;
        while (j > start && !/[.!?\n]/.test(text[j - 1])) j--;
        if (j > start) {
          end = j;
        } else {
          j = end;
          while (j > start && !/\s/.test(text[j])) j--;
          if (j > start) end = j;
        }
      }

      chunks.push({ text: text.slice(start, end), start });
      i = end;
    }

    return chunks;
  }

  private static estimateWordLength(text: string, charIndex: number): number {
    const match = text.slice(charIndex).match(/^[^\s]*/);
    return match ? match[0].length : 0;
  }
}

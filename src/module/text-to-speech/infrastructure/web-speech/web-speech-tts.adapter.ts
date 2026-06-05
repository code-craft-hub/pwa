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
 * Word highlighting strategy
 * ──────────────────────────
 * 1. Native onboundary  – fires for local OS voices and Microsoft cloud voices
 *    (Edge).  Used as-is; most accurate.
 * 2. Timer fallback     – for Google cloud voices that never fire onboundary.
 *    On onstart, a 50 ms interval walks a pre-built per-word timeline derived
 *    from character counts, speech rate and punctuation pauses.  The moment a
 *    native boundary arrives the timer is cancelled, so both paths coexist
 *    without conflict.  The timer resets at every chunk boundary so drift never
 *    accumulates beyond one chunk (~10 s of speech).
 *
 * All per-chunk state (nativeFired, timerActive, …) is declared at the
 * speakChunk scope so every handler closure shares the exact same variables —
 * no handler override tricks needed.
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
        this.utterance  = utterance;

        // ── Voice / rate / volume ──────────────────────────────────────────
        const matched = synth.getVoices().find((v) => v.voiceURI === request.voice.id);
        if (matched) utterance.voice = matched;
        utterance.rate   = Math.max(0.1, Math.min(10, request.rate));
        utterance.volume = Math.max(0, Math.min(1, request.volume));
        utterance.pitch  = 1;

        // ── Per-chunk shared state (all handlers close over these) ────────
        let nativeFired = false;  // true once a real onboundary fires
        let timerActive = true;   // false while speech is paused
        let timerStart  = 0;      // wall-clock ms when onstart fired
        let pausedAt    = 0;      // wall-clock ms when last pause started
        let lastMark    = -1;     // last timeline index fired by the timer

        let keepAlive: ReturnType<typeof setInterval>;

        const clearWordTimer = () => {
          if (this.wordTimer) { clearInterval(this.wordTimer); this.wordTimer = null; }
        };

        // ── onstart: begin timer fallback ──────────────────────────────────
        utterance.onstart = () => {
          onStateChange({ status: 'playing', currentChunk: idx + 1, totalChunks: chunks.length });

          if (!onWordBoundary) return;

          timerStart = Date.now();
          clearWordTimer();

          const timeline = WebSpeechTTSAdapter.buildWordTimeline(chunkText, request.rate);

          this.wordTimer = setInterval(() => {
            if (nativeFired || !timerActive) return;
            const elapsed = Date.now() - timerStart;
            for (let i = lastMark + 1; i < timeline.length; i++) {
              if (timeline[i].startMs <= elapsed) {
                lastMark = i;
                onWordBoundary(chunkStart + timeline[i].charIndex, timeline[i].charLength);
              } else {
                break;
              }
            }
          }, 50);
        };

        // ── onboundary: native word events (local / Microsoft voices) ──────
        utterance.onboundary = (e) => {
          if (e.name !== 'word') return;
          // First native event → cancel the timer fallback permanently
          if (!nativeFired) {
            nativeFired = true;
            clearWordTimer();
          }
          const charLen: number =
            (e as SpeechSynthesisEvent & { charLength?: number }).charLength ??
            WebSpeechTTSAdapter.estimateWordLength(chunkText, e.charIndex);
          onWordBoundary?.(chunkStart + e.charIndex, charLen);
        };

        // ── pause / resume: keep timer in sync with speech state ──────────
        utterance.onpause  = () => { timerActive = false; pausedAt = Date.now(); };
        utterance.onresume = () => {
          if (pausedAt > 0) timerStart += Date.now() - pausedAt; // exclude paused time
          timerActive = true;
        };

        // ── onend / onerror ────────────────────────────────────────────────
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

        // Show loading indicator only while waiting for the very first chunk
        if (idx === 0) {
          onStateChange({ status: 'loading', currentChunk: 1, totalChunks: chunks.length });
        }

        synth.speak(utterance);

        // Chrome pauses silently after ~15 s; cycling pause/resume keeps it alive
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
    clearInterval(this.wordTimer as ReturnType<typeof setInterval>);
    this.wordTimer = null;
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

  // ── Word timeline ────────────────────────────────────────────────────────────
  /**
   * Builds an array of { charIndex, charLength, startMs } for every word in
   * `text`.  startMs is the estimated time from utterance start at which the
   * word begins, accounting for character-based speaking speed and punctuation
   * pauses.
   *
   * Constants at rate = 1 (all divided by rate for other speeds):
   *   13 chars/s  base speaking speed for English
   *   60 ms       gap between words
   *   350 ms      pause after sentence-ending punctuation (. ! ?)
   *   160 ms      pause after clause punctuation (, ; :)
   */
  private static buildWordTimeline(text: string, rate: number): WordMark[] {
    const msPerChar   = 1000 / (13 * rate);
    const wordGap     =   60 / rate;
    const sentPause   =  350 / rate;
    const clausePause =  160 / rate;

    const marks: WordMark[] = [];
    let t = 0;
    let i = 0;

    while (i < text.length) {
      // ── Whitespace run → add inter-word pause ────────────────────────────
      if (/\s/.test(text[i])) {
        const prev = i > 0 ? text[i - 1] : '';
        while (i < text.length && /\s/.test(text[i])) i++;
        if      (/[.!?]/.test(prev))  t += sentPause;
        else if (/[,;:]/.test(prev))  t += clausePause;
        else                          t += wordGap;
        continue;
      }

      // ── Non-whitespace run → one word token ─────────────────────────────
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
        // Prefer splitting at a sentence boundary
        let j = end;
        while (j > start && !/[.!?\n]/.test(text[j - 1])) j--;
        if (j > start) {
          end = j;
        } else {
          // Fall back to last whitespace
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

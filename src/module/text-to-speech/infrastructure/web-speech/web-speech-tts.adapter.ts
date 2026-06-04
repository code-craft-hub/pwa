import type { SpeechRequest } from '../../domain/entities/speech-request.entity';
import type { SpeechState } from '../../domain/entities/speech-state.entity';
import type { TTSPort } from '../../domain/ports/tts.port';

/**
 * TTS adapter using the browser's built-in Web Speech API.
 *
 * Long texts are split into ~300-char chunks so Chrome reliably fires onstart
 * (Chrome silently refuses to process very large single utterances).
 */
export class WebSpeechTTSAdapter implements TTSPort {
  private utterance: SpeechSynthesisUtterance | null = null;
  private stopped = false;

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

        const matched = synth.getVoices().find((v) => v.voiceURI === request.voice.id);
        if (matched) utterance.voice = matched;
        utterance.rate   = Math.max(0.1, Math.min(10, request.rate));
        utterance.volume = Math.max(0, Math.min(1, request.volume));
        utterance.pitch  = 1;

        let keepAlive: ReturnType<typeof setInterval>;

        utterance.onstart = () =>
          onStateChange({ status: 'playing', currentChunk: idx + 1, totalChunks: chunks.length });

        utterance.onend = () => {
          clearInterval(keepAlive);
          speakChunk(idx + 1);
        };

        utterance.onerror = (e) => {
          clearInterval(keepAlive);
          if (e.error === 'interrupted' || e.error === 'canceled') {
            onStateChange({ status: 'idle' });
          } else {
            onStateChange({ status: 'error', error: `Speech error: ${e.error}` });
          }
          resolve();
        };

        if (onWordBoundary) {
          utterance.onboundary = (e) => {
            if (e.name !== 'word') return;
            const charLen: number =
              (e as SpeechSynthesisEvent & { charLength?: number }).charLength ??
              WebSpeechTTSAdapter.estimateWordLength(chunkText, e.charIndex);
            onWordBoundary(chunkStart + e.charIndex, charLen);
          };
        }

        // Only show loading spinner while waiting for the very first chunk to start
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

  pause(): void {
    window.speechSynthesis?.pause();
  }

  resume(): void {
    window.speechSynthesis?.resume();
  }

  stop(): void {
    this.stopped = true;
    if (this.utterance) {
      this.utterance.onstart    = null;
      this.utterance.onend      = null;
      this.utterance.onerror    = null;
      this.utterance.onboundary = null;
      this.utterance = null;
    }
    window.speechSynthesis?.cancel();
  }

  /**
   * Splits text into chunks ≤ maxLen chars, preferring sentence boundaries then
   * word boundaries so the speech engine never receives an oversized utterance.
   * Returns each chunk with its start offset in the original string for correct
   * word-highlight charIndex mapping.
   */
  private static splitIntoChunks(
    text: string,
    maxLen = 300
  ): Array<{ text: string; start: number }> {
    if (text.length <= maxLen) return [{ text, start: 0 }];

    const chunks: Array<{ text: string; start: number }> = [];
    let i = 0;

    while (i < text.length) {
      // skip leading whitespace
      while (i < text.length && /\s/.test(text[i])) i++;
      if (i >= text.length) break;

      const start = i;
      let end = Math.min(i + maxLen, text.length);

      if (end < text.length) {
        // prefer a sentence boundary (.!?\n) near end
        let j = end;
        while (j > start && !/[.!?\n]/.test(text[j - 1])) j--;
        if (j > start) {
          end = j;
        } else {
          // fall back to last whitespace
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

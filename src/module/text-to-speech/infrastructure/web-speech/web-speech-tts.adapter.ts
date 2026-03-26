import type { SpeechRequest } from '../../domain/entities/speech-request.entity';
import type { SpeechState } from '../../domain/entities/speech-state.entity';
import type { TTSPort } from '../../domain/ports/tts.port';

/**
 * TTS adapter using the browser's built-in Web Speech API.
 *
 * Word-boundary events:
 *  - Chrome / Edge fire `boundary` with name === 'word', providing charIndex and
 *    charLength — used for live word highlighting.
 *  - Firefox / Safari have limited boundary-event support; highlighting degrades
 *    gracefully (no highlight instead of error).
 */
export class WebSpeechTTSAdapter implements TTSPort {
  private utterance: SpeechSynthesisUtterance | null = null;

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

    return new Promise((resolve) => {
      const synth     = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(request.text);
      this.utterance  = utterance;

      // ── Voice resolution ──────────────────────────────────────────────
      const matched = synth.getVoices().find((v) => v.voiceURI === request.voice.id);
      if (matched) utterance.voice = matched;

      utterance.rate   = Math.max(0.1, Math.min(10, request.rate));
      utterance.volume = Math.max(0, Math.min(1, request.volume));
      utterance.pitch  = 1;

      // ── Lifecycle events ──────────────────────────────────────────────
      utterance.onstart = () =>
        onStateChange({ status: 'playing', currentChunk: 1, totalChunks: 1 });

      utterance.onend = () => {
        onStateChange({ status: 'idle' });
        resolve();
      };

      utterance.onerror = (e) => {
        // 'interrupted' / 'canceled' are expected when stop() is called
        if (e.error === 'interrupted' || e.error === 'canceled') {
          onStateChange({ status: 'idle' });
        } else {
          onStateChange({ status: 'error', error: `Speech error: ${e.error}` });
        }
        resolve();
      };

      // ── Word boundary (Chrome/Edge only) ──────────────────────────────
      if (onWordBoundary) {
        utterance.onboundary = (e) => {
          if (e.name !== 'word') return;
          // charLength is part of the spec but typed as optional in some TS versions
          const charLen: number =
            (e as SpeechSynthesisEvent & { charLength?: number }).charLength ??
            WebSpeechTTSAdapter.estimateWordLength(request.text, e.charIndex);
          onWordBoundary(e.charIndex, charLen);
        };
      }

      onStateChange({ status: 'loading', currentChunk: 1, totalChunks: 1 });
      synth.speak(utterance);

      // Chrome has a bug where speech pauses after ~15 s on long texts;
      // periodically resuming the synth keeps it going.
      const keepAlive = setInterval(() => {
        if (synth.speaking && !synth.paused) {
          synth.pause();
          synth.resume();
        } else {
          clearInterval(keepAlive);
        }
      }, 10_000);

      const origOnEnd = utterance.onend;
      utterance.onend = (e) => {
        clearInterval(keepAlive);
        origOnEnd?.call(utterance, e);
      };
    });
  }

  pause(): void {
    window.speechSynthesis?.pause();
  }

  resume(): void {
    window.speechSynthesis?.resume();
  }

  stop(): void {
    if (this.utterance) {
      this.utterance.onend    = null;
      this.utterance.onerror  = null;
      this.utterance.onboundary = null;
      this.utterance = null;
    }
    window.speechSynthesis?.cancel();
  }

  /** Estimate word length by scanning to the next whitespace or punctuation. */
  private static estimateWordLength(text: string, charIndex: number): number {
    const slice = text.slice(charIndex);
    const match = slice.match(/^[^\s]*/);
    return match ? match[0].length : 0;
  }
}

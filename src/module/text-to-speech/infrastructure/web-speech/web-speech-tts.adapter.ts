import type { SpeechRequest } from '../../domain/entities/speech-request.entity';
import type { SpeechState } from '../../domain/entities/speech-state.entity';
import type { TTSPort } from '../../domain/ports/tts.port';

/**
 * Offline-first TTS adapter using the browser's Web Speech API.
 * Falls back to the first available voice if the requested voice is not found.
 */
export class WebSpeechTTSAdapter implements TTSPort {
  private utterance: SpeechSynthesisUtterance | null = null;

  speak(
    request: SpeechRequest,
    onStateChange: (state: SpeechState) => void
  ): Promise<void> {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      onStateChange({ status: 'error', error: 'Web Speech API not supported in this browser.' });
      return Promise.resolve();
    }

    this.stop();

    return new Promise((resolve) => {
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(request.text);
      this.utterance = utterance;

      // Resolve the SpeechSynthesisVoice object by voiceURI
      const allVoices = synth.getVoices();
      const matchedVoice = allVoices.find((v) => v.voiceURI === request.voice.id);
      if (matchedVoice) utterance.voice = matchedVoice;

      utterance.rate   = Math.max(0.1, Math.min(10, request.rate));
      utterance.volume = Math.max(0, Math.min(1, request.volume));
      utterance.pitch  = 1;

      utterance.onstart = () =>
        onStateChange({ status: 'playing', currentChunk: 1, totalChunks: 1, currentText: request.text });

      utterance.onend = () => {
        onStateChange({ status: 'idle' });
        resolve();
      };

      utterance.onerror = (e) => {
        // 'interrupted' fires when stop() is called — not a real error
        if (e.error === 'interrupted' || e.error === 'canceled') {
          onStateChange({ status: 'idle' });
        } else {
          onStateChange({ status: 'error', error: `Speech error: ${e.error}` });
        }
        resolve();
      };

      onStateChange({ status: 'loading', currentChunk: 1, totalChunks: 1 });
      synth.speak(utterance);
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
      this.utterance.onend = null;
      this.utterance.onerror = null;
      this.utterance = null;
    }
    window.speechSynthesis?.cancel();
  }
}

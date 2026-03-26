import type { Voice } from '../../domain/entities/voice.entity';
import type { VoiceCatalogPort } from '../../domain/ports/voice-catalog.port';

/**
 * Loads voices from the browser's built-in Web Speech API.
 * Voices with localService === false are cloud-based (Chrome/Edge load them
 * from Google or Microsoft servers when the device is online).
 */
export class WebSpeechVoiceCatalogAdapter implements VoiceCatalogPort {
  getVoices(): Promise<Voice[]> {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return Promise.resolve([]);
    }

    return new Promise((resolve) => {
      const synth = window.speechSynthesis;

      const mapVoices = (rawVoices: SpeechSynthesisVoice[]): Voice[] =>
        rawVoices.map((v) => ({
          id: v.voiceURI,
          name: v.name,
          language: v.lang,
          languageCode: v.lang,
          gender: 'neutral' as const,
          provider: 'web-speech' as const,
          isLocal: v.localService,
        }));

      const voices = synth.getVoices();
      if (voices.length > 0) {
        resolve(mapVoices(voices));
        return;
      }

      // Browsers fire this event when the voice list is ready
      const onVoicesChanged = () => {
        resolve(mapVoices(synth.getVoices()));
        synth.removeEventListener('voiceschanged', onVoicesChanged);
      };
      synth.addEventListener('voiceschanged', onVoicesChanged);

      // Safety timeout: resolve with empty array if voices never load
      setTimeout(() => {
        synth.removeEventListener('voiceschanged', onVoicesChanged);
        resolve(mapVoices(synth.getVoices()));
      }, 3000);
    });
  }
}

import type { Voice } from '../../domain/entities/voice.entity';
import type { VoiceCatalogPort } from '../../domain/ports/voice-catalog.port';

/**
 * Loads all voices from the browser's Web Speech API.
 *
 * Cloud voices (localService = false):
 *  - Chrome/Edge automatically download Google / Microsoft neural voices from
 *    their servers when the device is online. These are the same engines that
 *    power Google Cloud TTS and Azure Cognitive Services — entirely free.
 *  - They appear in the list as e.g. "Google US English", "Microsoft Aria Online",
 *    "Google UK English Female", etc.
 *
 * Local voices (localService = true):
 *  - OS-installed voices, always available offline.
 */
export class WebSpeechVoiceCatalogAdapter implements VoiceCatalogPort {
  getVoices(): Promise<Voice[]> {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return Promise.resolve([]);
    }

    return new Promise((resolve) => {
      const synth = window.speechSynthesis;

      const map = (raw: SpeechSynthesisVoice[]): Voice[] =>
        raw.map((v) => ({
          id:           v.voiceURI,
          name:         v.name,
          language:     v.lang,
          languageCode: v.lang,
          // Web Speech API doesn't expose gender — default to neutral
          gender:   'neutral' as const,
          provider: 'web-speech' as const,
          isLocal:  v.localService,
        }));

      const voices = synth.getVoices();
      if (voices.length > 0) {
        resolve(map(voices));
        return;
      }

      // Chrome fires 'voiceschanged' asynchronously on first load
      const onVoicesChanged = () => {
        resolve(map(synth.getVoices()));
        synth.removeEventListener('voiceschanged', onVoicesChanged);
      };
      synth.addEventListener('voiceschanged', onVoicesChanged);

      // Safety timeout: resolve with whatever is available after 3 s
      setTimeout(() => {
        synth.removeEventListener('voiceschanged', onVoicesChanged);
        resolve(map(synth.getVoices()));
      }, 3000);
    });
  }
}

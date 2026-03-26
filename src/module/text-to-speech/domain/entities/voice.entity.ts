export type VoiceProvider = 'web-speech' | 'stream-elements';
export type VoiceGender = 'male' | 'female' | 'neutral';

export interface Voice {
  id: string;
  name: string;
  language: string;
  languageCode: string;
  gender: VoiceGender;
  provider: VoiceProvider;
  /** true = runs locally in browser, false = requires network */
  isLocal: boolean;
}

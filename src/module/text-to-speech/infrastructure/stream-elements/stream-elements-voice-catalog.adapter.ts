import type { Voice } from '../../domain/entities/voice.entity';
import type { VoiceCatalogPort } from '../../domain/ports/voice-catalog.port';

/**
 * Hardcoded catalog of StreamElements TTS voices (AWS Polly neural voices).
 * These are available via the /api/tts/synthesize proxy when the user is online.
 */
export const STREAM_ELEMENTS_VOICES: Voice[] = [
  // English – United Kingdom
  { id: 'Brian', name: 'Brian', language: 'English (UK)', languageCode: 'en-GB', gender: 'male',   provider: 'stream-elements', isLocal: false },
  { id: 'Amy',   name: 'Amy',   language: 'English (UK)', languageCode: 'en-GB', gender: 'female', provider: 'stream-elements', isLocal: false },
  { id: 'Emma',  name: 'Emma',  language: 'English (UK)', languageCode: 'en-GB', gender: 'female', provider: 'stream-elements', isLocal: false },
  // English – United States
  { id: 'Matthew', name: 'Matthew', language: 'English (US)', languageCode: 'en-US', gender: 'male',   provider: 'stream-elements', isLocal: false },
  { id: 'Joanna',  name: 'Joanna',  language: 'English (US)', languageCode: 'en-US', gender: 'female', provider: 'stream-elements', isLocal: false },
  { id: 'Salli',   name: 'Salli',   language: 'English (US)', languageCode: 'en-US', gender: 'female', provider: 'stream-elements', isLocal: false },
  { id: 'Kendra',  name: 'Kendra',  language: 'English (US)', languageCode: 'en-US', gender: 'female', provider: 'stream-elements', isLocal: false },
  { id: 'Kimberly',name: 'Kimberly',language: 'English (US)', languageCode: 'en-US', gender: 'female', provider: 'stream-elements', isLocal: false },
  { id: 'Joey',    name: 'Joey',    language: 'English (US)', languageCode: 'en-US', gender: 'male',   provider: 'stream-elements', isLocal: false },
  { id: 'Justin',  name: 'Justin',  language: 'English (US)', languageCode: 'en-US', gender: 'male',   provider: 'stream-elements', isLocal: false },
  { id: 'Ivy',     name: 'Ivy',     language: 'English (US)', languageCode: 'en-US', gender: 'female', provider: 'stream-elements', isLocal: false },
  // English – Australia
  { id: 'Russell', name: 'Russell', language: 'English (AU)', languageCode: 'en-AU', gender: 'male',   provider: 'stream-elements', isLocal: false },
  { id: 'Nicole',  name: 'Nicole',  language: 'English (AU)', languageCode: 'en-AU', gender: 'female', provider: 'stream-elements', isLocal: false },
  // English – India
  { id: 'Aditi',   name: 'Aditi',   language: 'English (IN)', languageCode: 'en-IN', gender: 'female', provider: 'stream-elements', isLocal: false },
  { id: 'Raveena', name: 'Raveena', language: 'English (IN)', languageCode: 'en-IN', gender: 'female', provider: 'stream-elements', isLocal: false },
  // Welsh English
  { id: 'Geraint', name: 'Geraint', language: 'English (Wales)', languageCode: 'en-GB-WLS', gender: 'male', provider: 'stream-elements', isLocal: false },
  // French
  { id: 'Celine',  name: 'Céline',  language: 'French (FR)', languageCode: 'fr-FR', gender: 'female', provider: 'stream-elements', isLocal: false },
  { id: 'Mathieu', name: 'Mathieu', language: 'French (FR)', languageCode: 'fr-FR', gender: 'male',   provider: 'stream-elements', isLocal: false },
  { id: 'Chantal', name: 'Chantal', language: 'French (CA)', languageCode: 'fr-CA', gender: 'female', provider: 'stream-elements', isLocal: false },
  // German
  { id: 'Marlene', name: 'Marlene', language: 'German', languageCode: 'de-DE', gender: 'female', provider: 'stream-elements', isLocal: false },
  { id: 'Hans',    name: 'Hans',    language: 'German', languageCode: 'de-DE', gender: 'male',   provider: 'stream-elements', isLocal: false },
  { id: 'Vicki',   name: 'Vicki',   language: 'German', languageCode: 'de-DE', gender: 'female', provider: 'stream-elements', isLocal: false },
  // Spanish
  { id: 'Conchita', name: 'Conchita', language: 'Spanish (ES)', languageCode: 'es-ES', gender: 'female', provider: 'stream-elements', isLocal: false },
  { id: 'Enrique',  name: 'Enrique',  language: 'Spanish (ES)', languageCode: 'es-ES', gender: 'male',   provider: 'stream-elements', isLocal: false },
  { id: 'Penelope', name: 'Penélope', language: 'Spanish (US)', languageCode: 'es-US', gender: 'female', provider: 'stream-elements', isLocal: false },
  { id: 'Miguel',   name: 'Miguel',   language: 'Spanish (US)', languageCode: 'es-US', gender: 'male',   provider: 'stream-elements', isLocal: false },
  { id: 'Mia',      name: 'Mia',      language: 'Spanish (MX)', languageCode: 'es-MX', gender: 'female', provider: 'stream-elements', isLocal: false },
  // Italian
  { id: 'Carla',   name: 'Carla',   language: 'Italian', languageCode: 'it-IT', gender: 'female', provider: 'stream-elements', isLocal: false },
  { id: 'Giorgio', name: 'Giorgio', language: 'Italian', languageCode: 'it-IT', gender: 'male',   provider: 'stream-elements', isLocal: false },
  { id: 'Bianca',  name: 'Bianca',  language: 'Italian', languageCode: 'it-IT', gender: 'female', provider: 'stream-elements', isLocal: false },
  // Portuguese
  { id: 'Ines',     name: 'Inês',    language: 'Portuguese (PT)', languageCode: 'pt-PT', gender: 'female', provider: 'stream-elements', isLocal: false },
  { id: 'Vitoria',  name: 'Vitória', language: 'Portuguese (BR)', languageCode: 'pt-BR', gender: 'female', provider: 'stream-elements', isLocal: false },
  { id: 'Ricardo',  name: 'Ricardo', language: 'Portuguese (BR)', languageCode: 'pt-BR', gender: 'male',   provider: 'stream-elements', isLocal: false },
  // Dutch
  { id: 'Lotte', name: 'Lotte', language: 'Dutch', languageCode: 'nl-NL', gender: 'female', provider: 'stream-elements', isLocal: false },
  { id: 'Ruben', name: 'Ruben', language: 'Dutch', languageCode: 'nl-NL', gender: 'male',   provider: 'stream-elements', isLocal: false },
  // Japanese
  { id: 'Mizuki', name: 'Mizuki', language: 'Japanese', languageCode: 'ja-JP', gender: 'female', provider: 'stream-elements', isLocal: false },
  // Korean
  { id: 'Seoyeon', name: 'Seoyeon', language: 'Korean', languageCode: 'ko-KR', gender: 'female', provider: 'stream-elements', isLocal: false },
  // Polish
  { id: 'Ewa',   name: 'Ewa',   language: 'Polish', languageCode: 'pl-PL', gender: 'female', provider: 'stream-elements', isLocal: false },
  { id: 'Jacek', name: 'Jacek', language: 'Polish', languageCode: 'pl-PL', gender: 'male',   provider: 'stream-elements', isLocal: false },
  { id: 'Maja',  name: 'Maja',  language: 'Polish', languageCode: 'pl-PL', gender: 'female', provider: 'stream-elements', isLocal: false },
  { id: 'Jan',   name: 'Jan',   language: 'Polish', languageCode: 'pl-PL', gender: 'male',   provider: 'stream-elements', isLocal: false },
  // Norwegian
  { id: 'Liv', name: 'Liv', language: 'Norwegian', languageCode: 'nb-NO', gender: 'female', provider: 'stream-elements', isLocal: false },
  // Swedish
  { id: 'Astrid', name: 'Astrid', language: 'Swedish', languageCode: 'sv-SE', gender: 'female', provider: 'stream-elements', isLocal: false },
  // Danish
  { id: 'Naja', name: 'Naja', language: 'Danish', languageCode: 'da-DK', gender: 'female', provider: 'stream-elements', isLocal: false },
  { id: 'Mads', name: 'Mads', language: 'Danish', languageCode: 'da-DK', gender: 'male',   provider: 'stream-elements', isLocal: false },
  // Russian
  { id: 'Tatyana', name: 'Tatyana', language: 'Russian', languageCode: 'ru-RU', gender: 'female', provider: 'stream-elements', isLocal: false },
  { id: 'Maxim',   name: 'Maxim',   language: 'Russian', languageCode: 'ru-RU', gender: 'male',   provider: 'stream-elements', isLocal: false },
  // Turkish
  { id: 'Filiz', name: 'Filiz', language: 'Turkish', languageCode: 'tr-TR', gender: 'female', provider: 'stream-elements', isLocal: false },
  // Romanian
  { id: 'Carmen', name: 'Carmen', language: 'Romanian', languageCode: 'ro-RO', gender: 'female', provider: 'stream-elements', isLocal: false },
];

export class StreamElementsVoiceCatalogAdapter implements VoiceCatalogPort {
  getVoices(): Promise<Voice[]> {
    return Promise.resolve(STREAM_ELEMENTS_VOICES);
  }
}

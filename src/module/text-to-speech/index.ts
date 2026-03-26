// Public surface of the text-to-speech module
export { TextToSpeechReader } from './presentation/components/TextToSpeechReader';
export { useTTS } from './presentation/hooks/use-tts';
export type { UseTTSReturn, WordRange } from './presentation/hooks/use-tts';

// Domain types (for consumers that need to work with voices)
export type { Voice, VoiceProvider, VoiceGender } from './domain/entities/voice.entity';
export type { SpeechRequest } from './domain/entities/speech-request.entity';
export type { SpeechState, SpeechStatus } from './domain/entities/speech-state.entity';

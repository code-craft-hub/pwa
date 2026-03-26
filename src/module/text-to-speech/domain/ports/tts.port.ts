import type { SpeechRequest } from '../entities/speech-request.entity';
import type { SpeechState } from '../entities/speech-state.entity';

export interface TTSPort {
  speak(
    request: SpeechRequest,
    onStateChange: (state: SpeechState) => void,
    onWordBoundary?: (charIndex: number, charLength: number) => void
  ): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
}

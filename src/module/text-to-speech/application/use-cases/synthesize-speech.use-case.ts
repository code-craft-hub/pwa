import type { SpeechRequest } from '../../domain/entities/speech-request.entity';
import type { SpeechState } from '../../domain/entities/speech-state.entity';
import type { TTSPort } from '../../domain/ports/tts.port';

export class SynthesizeSpeechUseCase {
  constructor(private readonly tts: TTSPort) {}

  execute(
    request: SpeechRequest,
    onStateChange: (state: SpeechState) => void,
    onWordBoundary?: (charIndex: number, charLength: number) => void
  ): Promise<void> {
    if (!request.text.trim()) {
      onStateChange({ status: 'idle' });
      return Promise.resolve();
    }
    return this.tts.speak(request, onStateChange, onWordBoundary);
  }
}

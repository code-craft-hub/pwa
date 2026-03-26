import type { SpeechRequest } from '../../domain/entities/speech-request.entity';
import type { SpeechState } from '../../domain/entities/speech-state.entity';
import type { TTSPort } from '../../domain/ports/tts.port';

/**
 * Splits text into sentence-aware chunks of at most maxLength characters.
 * Falls back to word-boundary splits if a single sentence is too long.
 */
function splitIntoChunks(text: string, maxLength = 200): string[] {
  const raw = text.trim().replace(/\s+/g, ' ');
  // Split on sentence boundaries: .  !  ?  followed by space or end
  const sentences = raw.match(/[^.!?]+[.!?]+[\s]*/g) ?? [raw];

  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (current.length + sentence.length <= maxLength) {
      current += sentence;
    } else {
      if (current.trim()) chunks.push(current.trim());
      // If the sentence itself exceeds maxLength, split further on words
      if (sentence.length > maxLength) {
        const words = sentence.split(' ');
        current = '';
        for (const word of words) {
          if (current.length + word.length + 1 <= maxLength) {
            current += (current ? ' ' : '') + word;
          } else {
            if (current.trim()) chunks.push(current.trim());
            current = word;
          }
        }
      } else {
        current = sentence;
      }
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

/**
 * Online TTS adapter.
 * Fetches MP3 audio from the /api/tts/synthesize proxy (StreamElements / AWS Polly)
 * and plays it via HTMLAudioElement, chunk by chunk.
 */
export class StreamElementsTTSAdapter implements TTSPort {
  private audio: HTMLAudioElement | null = null;
  private stopped = false;
  private paused = false;
  private resolveStop: (() => void) | null = null;

  async speak(
    request: SpeechRequest,
    onStateChange: (state: SpeechState) => void
  ): Promise<void> {
    this.stop();
    this.stopped = false;
    this.paused = false;

    const chunks = splitIntoChunks(request.text);
    const total = chunks.length;

    for (let i = 0; i < chunks.length; i++) {
      if (this.stopped) break;

      const chunk = chunks[i];
      onStateChange({ status: 'loading', currentChunk: i + 1, totalChunks: total, currentText: chunk });

      const url = `/api/tts/synthesize?voice=${encodeURIComponent(request.voice.id)}&text=${encodeURIComponent(chunk)}`;

      try {
        await this.playAudio(url, request.volume, request.rate, onStateChange, i + 1, total, chunk);
      } catch {
        // If the proxy fails, emit error and stop — caller falls back to Web Speech
        onStateChange({ status: 'error', error: 'Online TTS unavailable. Falling back to browser voice.' });
        return;
      }
    }

    if (!this.stopped) {
      onStateChange({ status: 'idle' });
    }
  }

  private playAudio(
    url: string,
    volume: number,
    rate: number,
    onStateChange: (state: SpeechState) => void,
    currentChunk: number,
    totalChunks: number,
    currentText: string
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const audio = new Audio(url);
      audio.volume = Math.max(0, Math.min(1, volume));
      // HTMLAudioElement.playbackRate: 0.1 – 16 (we clamp to 0.5 – 2)
      audio.playbackRate = Math.max(0.5, Math.min(2, rate));
      this.audio = audio;

      audio.oncanplaythrough = () => {
        if (this.stopped) { resolve(); return; }
        onStateChange({ status: 'playing', currentChunk, totalChunks, currentText });
        audio.play().catch(reject);
      };

      audio.onended = () => resolve();

      audio.onerror = () => reject(new Error('Audio fetch failed'));

      // Support pause/resume via a polling mechanism
      const checkPause = setInterval(() => {
        if (this.stopped) {
          clearInterval(checkPause);
          audio.pause();
          resolve();
        } else if (this.paused && !audio.paused) {
          audio.pause();
        } else if (!this.paused && audio.paused && !audio.ended) {
          audio.play().catch(() => {});
        }
      }, 100);

      audio.onended = () => {
        clearInterval(checkPause);
        resolve();
      };
    });
  }

  pause(): void {
    this.paused = true;
    this.audio?.pause();
  }

  resume(): void {
    this.paused = false;
    this.audio?.play().catch(() => {});
  }

  stop(): void {
    this.stopped = true;
    this.paused = false;
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    this.resolveStop?.();
    this.resolveStop = null;
  }
}

import type { Voice } from './voice.entity';

export interface SpeechRequest {
  text: string;
  voice: Voice;
  /** Playback rate: 0.5 – 2.0 */
  rate: number;
  /** Volume: 0 – 1 */
  volume: number;
}

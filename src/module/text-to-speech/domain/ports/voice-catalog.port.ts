import type { Voice } from '../entities/voice.entity';

export interface VoiceCatalogPort {
  getVoices(): Promise<Voice[]>;
}

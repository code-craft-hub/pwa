import type { Voice } from '../../domain/entities/voice.entity';
import type { VoiceCatalogPort } from '../../domain/ports/voice-catalog.port';

export class GetVoicesUseCase {
  constructor(
    private readonly onlineCatalog: VoiceCatalogPort,
    private readonly offlineCatalog: VoiceCatalogPort
  ) {}

  async execute(isOnline: boolean): Promise<Voice[]> {
    if (isOnline) {
      try {
        return await this.onlineCatalog.getVoices();
      } catch {
        // Network failed — degrade gracefully to offline voices
        return this.offlineCatalog.getVoices();
      }
    }
    return this.offlineCatalog.getVoices();
  }
}

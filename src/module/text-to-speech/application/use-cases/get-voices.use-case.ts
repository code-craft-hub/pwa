import type { Voice } from '../../domain/entities/voice.entity';
import type { VoiceCatalogPort } from '../../domain/ports/voice-catalog.port';

export class GetVoicesUseCase {
  constructor(private readonly catalog: VoiceCatalogPort) {}

  async execute(isOnline: boolean): Promise<Voice[]> {
    const all = await this.catalog.getVoices();

    if (isOnline) {
      // Prefer cloud voices (localService = false) — Chrome/Edge load Google/Microsoft
      // neural voices from their servers when online; these are genuinely high quality.
      const cloud = all.filter((v) => !v.isLocal);
      const local = all.filter((v) => v.isLocal);
      // Return cloud voices first, then local as fallback options
      return [...cloud, ...local];
    }

    // Offline: only voices that work without network
    return all.filter((v) => v.isLocal);
  }
}

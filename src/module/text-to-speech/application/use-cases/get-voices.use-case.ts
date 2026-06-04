import type { Voice } from '../../domain/entities/voice.entity';
import type { VoiceCatalogPort } from '../../domain/ports/voice-catalog.port';

function isEnglishUsOrGb(lang: string): boolean {
  const n = lang.replace('_', '-');
  return n.startsWith('en-US') || n.startsWith('en-GB');
}

export class GetVoicesUseCase {
  constructor(private readonly catalog: VoiceCatalogPort) {}

  async execute(isOnline: boolean): Promise<Voice[]> {
    const all      = await this.catalog.getVoices();
    const filtered = all.filter((v) => isEnglishUsOrGb(v.language));

    if (isOnline) {
      const cloud = filtered.filter((v) => !v.isLocal);
      const local = filtered.filter((v) => v.isLocal);
      return [...cloud, ...local];
    }

    // Offline: only local voices work
    const localFiltered = filtered.filter((v) => v.isLocal);
    if (localFiltered.length > 0) return localFiltered;

    // No en-US/en-GB local voice found — fall back to any local voice so the
    // user can still hear something offline
    return all.filter((v) => v.isLocal);
  }
}

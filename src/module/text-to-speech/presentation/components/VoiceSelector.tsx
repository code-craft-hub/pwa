'use client';

import { useState, useMemo } from 'react';
import type { Voice } from '../../domain/entities/voice.entity';

interface Props {
  voices: Voice[];
  selected: Voice | null;
  onChange: (voice: Voice) => void;
  isOnline: boolean;
  hasCloudVoices: boolean;
}

export function VoiceSelector({ voices, selected, onChange, isOnline, hasCloudVoices }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return voices.filter(
      (v) => v.name.toLowerCase().includes(q) || v.language.toLowerCase().includes(q)
    );
  }, [voices, search]);

  // Group by language for nicer optgroup display
  const grouped = useMemo(() => {
    const map = new Map<string, Voice[]>();
    for (const v of filtered) {
      const list = map.get(v.language) ?? [];
      list.push(v);
      map.set(v.language, list);
    }
    return map;
  }, [filtered]);

  if (voices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-1">
        {isOnline ? 'Loading voices…' : 'No local voices found on this device.'}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or language…"
        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {/* Select */}
      <div className="relative">
        <select
          value={selected?.id ?? ''}
          onChange={(e) => {
            const voice = voices.find((v) => v.id === e.target.value);
            if (voice) onChange(voice);
          }}
          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
          style={{ colorScheme: 'light dark' }}
        >
          {Array.from(grouped.entries()).map(([lang, langVoices]) => (
            <optgroup key={lang} label={lang}>
              {langVoices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}{!v.isLocal ? ' ✨' : ''}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">▼</span>
      </div>

      {/* Selected voice badges */}
      {selected && (
        <div className="flex flex-wrap gap-1.5 text-xs">
          <span className="bg-secondary text-secondary-foreground border border-border rounded-full px-2.5 py-1">
            {selected.language}
          </span>
          <span className={`rounded-full px-2.5 py-1 border font-medium ${
            selected.isLocal
              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
          }`}>
            {selected.isLocal ? 'Browser voice' : '✨ Cloud voice'}
          </span>
        </div>
      )}

      {/* Cloud voices note */}
      {isOnline && hasCloudVoices && (
        <p className="text-xs text-muted-foreground">
          ✨ = Google / Microsoft neural voices loaded by your browser.
        </p>
      )}
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import type { Voice } from '../../domain/entities/voice.entity';

interface Props {
  voices: Voice[];
  selected: Voice | null;
  onChange: (voice: Voice) => void;
  isOnline: boolean;
}

export function VoiceSelector({ voices, selected, onChange, isOnline }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return voices.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.language.toLowerCase().includes(q)
    );
  }, [voices, search]);

  // Group by language for nicer display
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
      <div className="text-white/60 text-sm py-2">
        {isOnline ? 'Loading voices…' : 'No local voices found on this device.'}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search voices or languages…"
        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/40"
      />

      {/* Dropdown */}
      <div className="relative">
        <select
          value={selected?.id ?? ''}
          onChange={(e) => {
            const voice = voices.find((v) => v.id === e.target.value);
            if (voice) onChange(voice);
          }}
          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/40 appearance-none cursor-pointer"
          style={{ colorScheme: 'dark' }}
        >
          {Array.from(grouped.entries()).map(([lang, langVoices]) => (
            <optgroup key={lang} label={lang} style={{ background: '#1e1b4b', color: 'white' }}>
              {langVoices.map((v) => (
                <option key={v.id} value={v.id} style={{ background: '#1e1b4b', color: 'white' }}>
                  {v.name} {v.gender !== 'neutral' ? `(${v.gender})` : ''}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {/* Custom chevron */}
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/60 text-xs">
          ▼
        </span>
      </div>

      {/* Selected voice badge */}
      {selected && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1 text-white/80">
            {selected.language}
          </span>
          <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1 text-white/80 capitalize">
            {selected.gender}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              selected.isLocal
                ? 'bg-yellow-500/20 text-yellow-200 border border-yellow-400/30'
                : 'bg-green-500/20 text-green-200 border border-green-400/30'
            }`}
          >
            {selected.isLocal ? '📶 Browser voice' : '✨ Cloud voice'}
          </span>
        </div>
      )}
    </div>
  );
}

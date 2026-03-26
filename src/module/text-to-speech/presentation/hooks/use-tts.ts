'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Voice } from '../../domain/entities/voice.entity';
import type { SpeechStatus } from '../../domain/entities/speech-state.entity';
import { GetVoicesUseCase } from '../../application/use-cases/get-voices.use-case';
import { SynthesizeSpeechUseCase } from '../../application/use-cases/synthesize-speech.use-case';
import { WebSpeechVoiceCatalogAdapter } from '../../infrastructure/web-speech/web-speech-voice-catalog.adapter';
import { WebSpeechTTSAdapter } from '../../infrastructure/web-speech/web-speech-tts.adapter';

export interface WordRange {
  charIndex: number;
  charLength: number;
}

export interface UseTTSReturn {
  isOnline: boolean;
  /** true when the browser has cloud voices available (Chrome / Edge) */
  hasCloudVoices: boolean;
  voices: Voice[];
  selectedVoice: Voice | null;
  setSelectedVoice: (voice: Voice) => void;
  status: SpeechStatus;
  /** Current word position in the source text — null when idle */
  wordRange: WordRange | null;
  error: string | null;
  rate: number;
  setRate: (rate: number) => void;
  volume: number;
  setVolume: (volume: number) => void;
  speak: (text: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

export function useTTS(): UseTTSReturn {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [voices, setVoices]               = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [status, setStatus]               = useState<SpeechStatus>('idle');
  const [wordRange, setWordRange]         = useState<WordRange | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const [rate, setRate]                   = useState(1.0);
  const [volume, setVolume]               = useState(1.0);

  const ttsAdapter = useRef(new WebSpeechTTSAdapter());

  // ── Online / offline ──────────────────────────────────────────────────
  useEffect(() => {
    const up   = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online',  up);
      window.removeEventListener('offline', down);
    };
  }, []);

  // ── Voice loading ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const useCase = new GetVoicesUseCase(new WebSpeechVoiceCatalogAdapter());
      const loaded  = await useCase.execute(isOnline);
      if (cancelled) return;

      setVoices(loaded);
      setSelectedVoice((prev) => {
        if (prev && loaded.find((v) => v.id === prev.id)) return prev;
        // Pick first cloud voice (Google / Microsoft) if available, else first local
        return loaded[0] ?? null;
      });
    };

    load();
    return () => { cancelled = true; };
  }, [isOnline]);

  // Stop and clear word highlight when going offline mid-read
  useEffect(() => {
    if (!isOnline && (status === 'playing' || status === 'loading')) {
      ttsAdapter.current.stop();
      setStatus('idle');
      setWordRange(null);
    }
  }, [isOnline, status]);

  const hasCloudVoices = voices.some((v) => !v.isLocal);

  // ── Speak ─────────────────────────────────────────────────────────────
  const speak = useCallback(async (text: string) => {
    if (!selectedVoice) return;

    ttsAdapter.current.stop();
    setError(null);
    setWordRange(null);

    const useCase = new SynthesizeSpeechUseCase(ttsAdapter.current);

    await useCase.execute(
      { text, voice: selectedVoice, rate, volume },
      (state) => {
        setStatus(state.status);
        if (state.status === 'idle' || state.status === 'error') setWordRange(null);
        if (state.error) setError(state.error);
      },
      (charIndex, charLength) => {
        setWordRange({ charIndex, charLength });
      }
    );
  }, [selectedVoice, rate, volume]);

  const pause = useCallback(() => {
    ttsAdapter.current.pause();
    setStatus('paused');
  }, []);

  const resume = useCallback(() => {
    ttsAdapter.current.resume();
    setStatus('playing');
  }, []);

  const stop = useCallback(() => {
    ttsAdapter.current.stop();
    setStatus('idle');
    setWordRange(null);
    setError(null);
  }, []);

  return {
    isOnline,
    hasCloudVoices,
    voices,
    selectedVoice,
    setSelectedVoice,
    status,
    wordRange,
    error,
    rate,
    setRate,
    volume,
    setVolume,
    speak,
    pause,
    resume,
    stop,
  };
}

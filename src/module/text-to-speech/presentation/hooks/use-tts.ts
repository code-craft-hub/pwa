'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Voice } from '../../domain/entities/voice.entity';
import type { SpeechStatus } from '../../domain/entities/speech-state.entity';
import { GetVoicesUseCase } from '../../application/use-cases/get-voices.use-case';
import { SynthesizeSpeechUseCase } from '../../application/use-cases/synthesize-speech.use-case';
import { StreamElementsVoiceCatalogAdapter } from '../../infrastructure/stream-elements/stream-elements-voice-catalog.adapter';
import { StreamElementsTTSAdapter } from '../../infrastructure/stream-elements/stream-elements-tts.adapter';
import { WebSpeechVoiceCatalogAdapter } from '../../infrastructure/web-speech/web-speech-voice-catalog.adapter';
import { WebSpeechTTSAdapter } from '../../infrastructure/web-speech/web-speech-tts.adapter';

export interface TTSProgress {
  current: number;
  total: number;
  currentText: string;
}

export interface UseTTSReturn {
  isOnline: boolean;
  voices: Voice[];
  selectedVoice: Voice | null;
  setSelectedVoice: (voice: Voice) => void;
  status: SpeechStatus;
  progress: TTSProgress | null;
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
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [progress, setProgress] = useState<TTSProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rate, setRate] = useState(1.0);
  const [volume, setVolume] = useState(1.0);

  // Keep stable adapter instances across renders
  const onlineTTS  = useRef(new StreamElementsTTSAdapter());
  const offlineTTS = useRef(new WebSpeechTTSAdapter());

  // ── Online / offline detection ───────────────────────────────────────────
  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Voice loading ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const loadVoices = async () => {
      const useCase = new GetVoicesUseCase(
        new StreamElementsVoiceCatalogAdapter(),
        new WebSpeechVoiceCatalogAdapter()
      );
      const loaded = await useCase.execute(isOnline);
      if (cancelled) return;
      setVoices(loaded);
      // Auto-select Brian (online) or first available voice
      if (!selectedVoice || selectedVoice.provider !== (isOnline ? 'stream-elements' : 'web-speech')) {
        const preferred = loaded.find((v) => v.id === 'Brian') ?? loaded[0] ?? null;
        setSelectedVoice(preferred);
      }
    };

    loadVoices();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // ── Stop ongoing speech when going offline ───────────────────────────────
  useEffect(() => {
    if (!isOnline && (status === 'playing' || status === 'loading')) {
      onlineTTS.current.stop();
      setStatus('idle');
      setProgress(null);
    }
  }, [isOnline, status]);

  // ── Speak ────────────────────────────────────────────────────────────────
  const speak = useCallback(async (text: string) => {
    if (!selectedVoice) return;

    // Stop any current playback first
    onlineTTS.current.stop();
    offlineTTS.current.stop();
    setError(null);
    setProgress(null);

    const useOnline = isOnline && selectedVoice.provider === 'stream-elements';
    const adapter   = useOnline ? onlineTTS.current : offlineTTS.current;
    const useCase   = new SynthesizeSpeechUseCase(adapter);

    await useCase.execute({ text, voice: selectedVoice, rate, volume }, (state) => {
      setStatus(state.status);
      if (state.currentChunk !== undefined && state.totalChunks !== undefined) {
        setProgress({
          current: state.currentChunk,
          total:   state.totalChunks,
          currentText: state.currentText ?? '',
        });
      }
      if (state.status === 'idle' || state.status === 'error') {
        setProgress(null);
      }
      if (state.error) {
        setError(state.error);
        // Online TTS failed — retry with offline fallback
        if (useOnline) {
          const fallbackUseCase = new SynthesizeSpeechUseCase(offlineTTS.current);
          fallbackUseCase.execute({ text, voice: selectedVoice, rate, volume }, (s) => {
            setStatus(s.status);
            if (s.error) setError(s.error);
            if (s.status === 'idle') setProgress(null);
          });
        }
      }
    });
  }, [selectedVoice, isOnline, rate, volume]);

  const pause = useCallback(() => {
    onlineTTS.current.pause();
    offlineTTS.current.pause();
    setStatus('paused');
  }, []);

  const resume = useCallback(() => {
    onlineTTS.current.resume();
    offlineTTS.current.resume();
    setStatus('playing');
  }, []);

  const stop = useCallback(() => {
    onlineTTS.current.stop();
    offlineTTS.current.stop();
    setStatus('idle');
    setProgress(null);
    setError(null);
  }, []);

  return {
    isOnline,
    voices,
    selectedVoice,
    setSelectedVoice,
    status,
    progress,
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

'use client';

import type { SpeechStatus } from '../../domain/entities/speech-state.entity';
import type { TTSProgress } from '../hooks/use-tts';

interface Props {
  status: SpeechStatus;
  progress: TTSProgress | null;
  rate: number;
  setRate: (v: number) => void;
  volume: number;
  setVolume: (v: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  disabled: boolean;
}

export function SpeechControls({
  status,
  progress,
  rate,
  setRate,
  volume,
  setVolume,
  onPlay,
  onPause,
  onResume,
  onStop,
  disabled,
}: Props) {
  const isIdle    = status === 'idle';
  const isLoading = status === 'loading';
  const isPlaying = status === 'playing';
  const isPaused  = status === 'paused';
  const isError   = status === 'error';
  const isActive  = isPlaying || isLoading || isPaused;

  return (
    <div className="flex flex-col gap-4">
      {/* Playback buttons */}
      <div className="flex gap-3">
        {/* Play / Pause / Resume */}
        {isIdle || isError ? (
          <button
            onClick={onPlay}
            disabled={disabled}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all hover:scale-105 active:scale-95"
          >
            <span className="text-lg">▶</span> Play
          </button>
        ) : isPlaying ? (
          <button
            onClick={onPause}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white font-semibold py-3 px-6 rounded-xl transition-all hover:scale-105 active:scale-95"
          >
            <span className="text-lg">⏸</span> Pause
          </button>
        ) : isLoading ? (
          <button
            disabled
            className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-white/60 font-semibold py-3 px-6 rounded-xl cursor-not-allowed"
          >
            <span className="animate-spin inline-block">⟳</span> Loading…
          </button>
        ) : isPaused ? (
          <button
            onClick={onResume}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-400 to-indigo-500 hover:from-blue-500 hover:to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl transition-all hover:scale-105 active:scale-95"
          >
            <span className="text-lg">▶</span> Resume
          </button>
        ) : null}

        {/* Stop */}
        {isActive && (
          <button
            onClick={onStop}
            className="flex items-center justify-center gap-2 bg-white/10 hover:bg-red-500/30 border border-white/20 text-white font-semibold py-3 px-5 rounded-xl transition-all hover:scale-105 active:scale-95"
          >
            <span className="text-lg">⏹</span>
          </button>
        )}
      </div>

      {/* Progress bar */}
      {progress && progress.total > 1 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-white/60">
            <span>Chunk {progress.current} / {progress.total}</span>
            <span>{Math.round((progress.current / progress.total) * 100)}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Currently reading */}
      {progress?.currentText && (isPlaying || isPaused) && (
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white/70 italic line-clamp-2">
          &ldquo;{progress.currentText}&rdquo;
        </div>
      )}

      {/* Rate & Volume */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-white/60 flex justify-between">
            <span>Speed</span>
            <span>{rate.toFixed(1)}×</span>
          </label>
          <input
            type="range"
            min={0.5}
            max={2.0}
            step={0.1}
            value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value))}
            className="w-full accent-green-400"
          />
          <div className="flex justify-between text-xs text-white/30">
            <span>0.5×</span><span>2×</span>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-white/60 flex justify-between">
            <span>Volume</span>
            <span>{Math.round(volume * 100)}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full accent-green-400"
          />
          <div className="flex justify-between text-xs text-white/30">
            <span>0%</span><span>100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

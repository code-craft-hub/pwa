'use client';

import type { SpeechStatus } from '../../domain/entities/speech-state.entity';

interface Props {
  status: SpeechStatus;
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
  status, rate, setRate, volume, setVolume,
  onPlay, onPause, onResume, onStop, disabled,
}: Props) {
  const isIdle    = status === 'idle'    || status === 'error';
  const isLoading = status === 'loading';
  const isPlaying = status === 'playing';
  const isPaused  = status === 'paused';
  const isActive  = isPlaying || isLoading || isPaused;

  return (
    <div className="flex flex-col gap-4">

      {/* Play / Pause / Resume / Stop row */}
      <div className="flex gap-2">
        {isIdle && (
          <button
            onClick={onPlay}
            disabled={disabled}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed font-medium py-2.5 px-4 rounded-lg text-sm transition-opacity"
          >
            <span>▶</span> Play
          </button>
        )}
        {isLoading && (
          <button disabled className="flex-1 flex items-center justify-center gap-2 bg-secondary text-muted-foreground font-medium py-2.5 px-4 rounded-lg text-sm cursor-not-allowed">
            <span className="animate-spin inline-block">⟳</span> Loading…
          </button>
        )}
        {isPlaying && (
          <button
            onClick={onPause}
            className="flex-1 flex items-center justify-center gap-2 bg-secondary hover:bg-accent text-foreground border border-border font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
          >
            <span>⏸</span> Pause
          </button>
        )}
        {isPaused && (
          <button
            onClick={onResume}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:opacity-90 font-medium py-2.5 px-4 rounded-lg text-sm transition-opacity"
          >
            <span>▶</span> Resume
          </button>
        )}

        {isActive && (
          <button
            onClick={onStop}
            className="flex items-center justify-center bg-secondary hover:bg-red-50 dark:hover:bg-red-950 border border-border hover:border-red-200 dark:hover:border-red-900 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 py-2.5 px-4 rounded-lg text-sm transition-colors"
          >
            ⏹
          </button>
        )}
      </div>

      {/* Speed */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Speed</span>
          <span className="font-medium text-foreground">{rate.toFixed(1)}×</span>
        </div>
        <input
          type="range" min={0.5} max={2.0} step={0.1} value={rate}
          onChange={(e) => setRate(parseFloat(e.target.value))}
          className="w-full accent-foreground h-1.5 rounded-full cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0.5×</span><span>2×</span>
        </div>
      </div>

      {/* Volume */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Volume</span>
          <span className="font-medium text-foreground">{Math.round(volume * 100)}%</span>
        </div>
        <input
          type="range" min={0} max={1} step={0.05} value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-full accent-foreground h-1.5 rounded-full cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0%</span><span>100%</span>
        </div>
      </div>
    </div>
  );
}

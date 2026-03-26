'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTTS } from '../hooks/use-tts';
import { VoiceSelector } from './VoiceSelector';
import { SpeechControls } from './SpeechControls';

// ── Text tokeniser ────────────────────────────────────────────────────────────

interface Token {
  id: number;
  type: 'word' | 'space' | 'newline';
  text: string;
  /** Start position of this token in the original string */
  charIndex: number;
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0, id = 0;

  while (i < text.length) {
    if (text[i] === '\n') {
      tokens.push({ id: id++, type: 'newline', text: '\n', charIndex: i });
      i++;
    } else if (/[ \t\r]/.test(text[i])) {
      let j = i;
      while (j < text.length && /[ \t\r]/.test(text[j])) j++;
      tokens.push({ id: id++, type: 'space', text: text.slice(i, j), charIndex: i });
      i = j;
    } else {
      let j = i;
      while (j < text.length && !/\s/.test(text[j])) j++;
      tokens.push({ id: id++, type: 'word', text: text.slice(i, j), charIndex: i });
      i = j;
    }
  }

  return tokens;
}

// ── Sample texts ─────────────────────────────────────────────────────────────

const SAMPLES = [
  `The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump!`,
  `To be, or not to be — that is the question: whether 'tis nobler in the mind to suffer the slings and arrows of outrageous fortune, or to take arms against a sea of troubles, and by opposing end them.`,
  `In the beginning God created the heavens and the earth. Now the earth was formless and empty, darkness was over the surface of the deep, and the Spirit of God was hovering over the waters.`,
];

// ── Component ─────────────────────────────────────────────────────────────────

export function TextToSpeechReader() {
  const [text, setText]           = useState('');
  const [mode, setMode]           = useState<'edit' | 'read'>('edit');
  const [sampleIdx, setSampleIdx] = useState(0);

  const {
    isOnline, hasCloudVoices,
    voices, selectedVoice, setSelectedVoice,
    status, wordRange, error,
    rate, setRate, volume, setVolume,
    speak, pause, resume, stop,
  } = useTTS();

  const tokens = useMemo(() => tokenize(text), [text]);

  const wordCount = useMemo(
    () => tokens.filter((t) => t.type === 'word').length,
    [tokens]
  );

  const isHighlighted = useCallback(
    (token: Token): boolean => {
      if (!wordRange || token.type !== 'word') return false;
      const { charIndex: ci } = wordRange;
      return token.charIndex <= ci && ci < token.charIndex + token.text.length;
    },
    [wordRange]
  );

  const handlePlay = () => {
    if (!text.trim()) return;
    setMode('read');
    speak(text);
  };

  const handleEdit = () => {
    stop();
    setMode('edit');
  };

  const loadSample = () => {
    setText(SAMPLES[sampleIdx % SAMPLES.length]);
    setSampleIdx((i) => i + 1);
    setMode('edit');
    stop();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="border-b border-border px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔊</span>
          <div>
            <h1 className="font-semibold text-base leading-none">Text to Speech</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Free offline / online reader</p>
          </div>
        </div>

        {/* Online/offline badge */}
        <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${
          isOnline && hasCloudVoices
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300'
            : isOnline
            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300'
            : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            isOnline && hasCloudVoices ? 'bg-emerald-500' : isOnline ? 'bg-blue-500' : 'bg-amber-500'
          }`} />
          {isOnline && hasCloudVoices
            ? `✨ ${voices.filter(v => !v.isLocal).length} cloud voices`
            : isOnline
            ? 'Online — loading voices…'
            : `Offline — ${voices.length} local voice${voices.length !== 1 ? 's' : ''}`}
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* Left: text panel */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 gap-3 min-h-0">

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{wordCount} word{wordCount !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span>{text.length} chars</span>
            </div>
            <div className="flex items-center gap-2">
              {mode === 'read' && (
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-accent text-foreground transition-colors"
                >
                  ✏ Edit text
                </button>
              )}
              <button
                onClick={loadSample}
                className="text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                Load sample
              </button>
              {text && (
                <button
                  onClick={() => { setText(''); handleEdit(); }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-red-50 dark:hover:bg-red-950 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Text area (edit) or reading view */}
          <div className="flex-1 rounded-xl border border-border overflow-hidden relative min-h-75 lg:min-h-0">

            {/* Edit mode */}
            {mode === 'edit' && (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste or type your text here, then press Play to start reading…"
                className="w-full h-full min-h-75 lg:min-h-full bg-background text-foreground placeholder-muted-foreground px-5 py-4 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring"
              />
            )}

            {/* Read mode — formatted text with word highlighting */}
            {mode === 'read' && (
              <div className="w-full h-full overflow-y-auto px-5 py-4 text-sm sm:text-base leading-8 text-foreground select-text">
                {tokens.length === 0 ? (
                  <span className="text-muted-foreground italic">No text to display.</span>
                ) : (
                  tokens.map((token) => {
                    if (token.type === 'newline') return <br key={token.id} />;
                    if (token.type === 'space')   return <span key={token.id}>{token.text}</span>;

                    const lit = isHighlighted(token);
                    return (
                      <span
                        key={token.id}
                        className={
                          lit
                            ? 'bg-yellow-400 text-black rounded px-0.5 -mx-0.5 transition-colors duration-75'
                            : 'transition-colors duration-75'
                        }
                      >
                        {token.text}
                      </span>
                    );
                  })
                )}
              </div>
            )}

            {/* Loading progress bar */}
            {status === 'loading' && (
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-border overflow-hidden">
                <div className="h-full bg-primary" style={{ width: '40%', animation: 'shimmer 1.2s infinite' }} />
              </div>
            )}
          </div>
        </div>

        {/* Right: controls panel */}
        <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border p-4 sm:p-6 flex flex-col gap-5">

          {/* Voice selector */}
          <section>
            <h2 className="text-sm font-semibold mb-2 text-foreground">Voice</h2>
            <VoiceSelector
              voices={voices}
              selected={selectedVoice}
              onChange={setSelectedVoice}
              isOnline={isOnline}
              hasCloudVoices={hasCloudVoices}
            />
          </section>

          <div className="border-t border-border" />

          {/* Playback controls */}
          <section>
            <h2 className="text-sm font-semibold mb-3 text-foreground">Playback</h2>
            <SpeechControls
              status={status}
              rate={rate} setRate={setRate}
              volume={volume} setVolume={setVolume}
              onPlay={handlePlay}
              onPause={pause}
              onResume={resume}
              onStop={stop}
              disabled={!text.trim() || !selectedVoice}
            />
          </section>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-3 py-2.5 text-sm text-red-700 dark:text-red-300">
              <span className="shrink-0 mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Browser hint shown when online but no cloud voices available */}
          {isOnline && !hasCloudVoices && voices.length > 0 && (
            <div className="rounded-lg border border-border bg-muted px-3 py-2.5 text-xs text-muted-foreground">
              <strong className="text-foreground">Tip:</strong> Use Chrome or Microsoft Edge for premium Google / Microsoft neural voices — available automatically when online, no setup needed.
            </div>
          )}
        </aside>
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useTTS } from '../hooks/use-tts';
import { VoiceSelector } from './VoiceSelector';
import { SpeechControls } from './SpeechControls';

const SAMPLE_TEXTS = [
  'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.',
  'To be or not to be, that is the question. Whether tis nobler in the mind to suffer the slings and arrows of outrageous fortune.',
  'In the beginning was the Word, and the Word was with God, and the Word was God.',
];

export function TextToSpeechReader() {
  const [text, setText] = useState('');
  const [sampleIndex, setSampleIndex] = useState(0);

  const {
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
  } = useTTS();

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  const handlePlay = () => {
    if (text.trim()) speak(text);
  };

  const loadSample = () => {
    setText(SAMPLE_TEXTS[sampleIndex % SAMPLE_TEXTS.length]);
    setSampleIndex((i) => i + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-start justify-center p-4 pt-8 pb-16">
      <div className="w-full max-w-2xl space-y-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-5xl">🔊</div>
          <h1 className="text-3xl font-bold text-white">Text to Speech Reader</h1>
          <p className="text-indigo-200 text-sm">
            Paste or type any text below and listen to it read aloud
          </p>
        </div>

        {/* Online / Offline status banner */}
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium ${
            isOnline
              ? 'bg-green-500/15 border-green-400/30 text-green-200'
              : 'bg-yellow-500/15 border-yellow-400/30 text-yellow-200'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-yellow-400'}`} />
          {isOnline
            ? '✨ Online — high-quality cloud voices available'
            : '📶 Offline — using your browser\'s built-in voices'}
          <span className="ml-auto text-xs opacity-60">
            {voices.length} voice{voices.length !== 1 ? 's' : ''} loaded
          </span>
        </div>

        {/* Main card */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-white/20 shadow-2xl space-y-5">

          {/* Text input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-white font-semibold text-sm">Text to read</label>
              <div className="flex items-center gap-3 text-xs text-white/50">
                <span>{wordCount} word{wordCount !== 1 ? 's' : ''}</span>
                <span>{charCount} chars</span>
                <button
                  onClick={loadSample}
                  className="text-indigo-200 hover:text-white underline underline-offset-2 transition-colors"
                >
                  Load sample
                </button>
                {text && (
                  <button
                    onClick={() => { setText(''); stop(); }}
                    className="text-red-300 hover:text-red-200 underline underline-offset-2 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste or type your text here…"
              rows={8}
              className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-white/30 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-white/30 leading-relaxed"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* Voice selector */}
          <div className="space-y-2">
            <h2 className="text-white font-semibold text-sm">
              {isOnline ? '✨ Cloud Voices' : '🖥️ Browser Voices'}
            </h2>
            <VoiceSelector
              voices={voices}
              selected={selectedVoice}
              onChange={setSelectedVoice}
              isOnline={isOnline}
            />
          </div>

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* Controls */}
          <SpeechControls
            status={status}
            progress={progress}
            rate={rate}
            setRate={setRate}
            volume={volume}
            setVolume={setVolume}
            onPlay={handlePlay}
            onPause={pause}
            onResume={resume}
            onStop={stop}
            disabled={!text.trim() || !selectedVoice}
          />

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 bg-red-500/15 border border-red-400/30 rounded-xl px-4 py-3 text-red-200 text-sm">
              <span className="shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Help text */}
        <div className="text-center text-indigo-200/60 text-xs space-y-1 px-4">
          <p>
            When <strong className="text-indigo-200">online</strong>, premium AWS Polly voices are streamed via a proxy endpoint.
            When <strong className="text-indigo-200">offline</strong>, your browser&apos;s local voices are used automatically.
          </p>
          <p>Chrome &amp; Edge users get Google / Microsoft cloud voices when connected — no setup required.</p>
        </div>
      </div>
    </div>
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { STREAM_ELEMENTS_VOICES } from '@/module/text-to-speech/infrastructure/stream-elements/stream-elements-voice-catalog.adapter';

const ALLOWED_VOICE_IDS = new Set(STREAM_ELEMENTS_VOICES.map((v) => v.id));
const MAX_TEXT_LENGTH   = 300; // characters per chunk

/**
 * GET /api/tts/synthesize?voice=Brian&text=Hello+World
 *
 * Server-side proxy to the StreamElements TTS service (AWS Polly voices).
 * Proxying server-side avoids CORS issues and allows caching.
 *
 * The client is responsible for splitting long text into chunks of ≤ MAX_TEXT_LENGTH
 * before calling this endpoint.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const voice = searchParams.get('voice');
  const text  = searchParams.get('text');

  // ── Validation ─────────────────────────────────────────────────────────
  if (!voice || !text) {
    return NextResponse.json({ error: 'Missing voice or text query params.' }, { status: 400 });
  }

  if (!ALLOWED_VOICE_IDS.has(voice)) {
    return NextResponse.json({ error: 'Unknown voice ID.' }, { status: 400 });
  }

  const trimmedText = text.trim();
  if (!trimmedText) {
    return NextResponse.json({ error: 'Text must not be empty.' }, { status: 400 });
  }

  if (trimmedText.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters.` },
      { status: 400 }
    );
  }

  // ── Proxy to StreamElements ─────────────────────────────────────────────
  const upstreamUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(trimmedText)}`;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      headers: {
        // Some edge cases require a UA to avoid 403s
        'User-Agent': 'Mozilla/5.0 (compatible; TTS-Proxy/1.0)',
      },
      // Hard timeout: 10 seconds
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error('[TTS Proxy] Upstream fetch failed:', err);
    return NextResponse.json({ error: 'TTS service unreachable.' }, { status: 502 });
  }

  if (!upstream.ok) {
    console.error('[TTS Proxy] Upstream error:', upstream.status, upstream.statusText);
    return NextResponse.json(
      { error: `Upstream TTS error: ${upstream.status}` },
      { status: 502 }
    );
  }

  const audioBuffer = await upstream.arrayBuffer();

  return new Response(audioBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      // Cache audio for 24 hours — same voice+text always produces identical output
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  });
}

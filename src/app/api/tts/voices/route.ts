import { NextResponse } from 'next/server';
import { STREAM_ELEMENTS_VOICES } from '@/module/text-to-speech/infrastructure/stream-elements/stream-elements-voice-catalog.adapter';

/**
 * GET /api/tts/voices
 * Returns the catalog of available online (StreamElements / AWS Polly) voices.
 */
export async function GET() {
  return NextResponse.json(
    { voices: STREAM_ELEMENTS_VOICES },
    {
      headers: {
        // Cache for 1 hour — voice list rarely changes
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    }
  );
}

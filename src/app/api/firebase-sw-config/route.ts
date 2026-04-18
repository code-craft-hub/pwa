import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Serves the Firebase config as a JS snippet that the service worker imports.
 * The SW does: importScripts('/api/firebase-sw-config')
 * which sets self.FIREBASE_CONFIG = { ... }
 *
 * All values here are NEXT_PUBLIC_* — they are already exposed to browsers.
 */
export async function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? null,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? null,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? null,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? null,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? null,
  };

  const js = `self.FIREBASE_CONFIG = ${JSON.stringify(config)};`;

  return new NextResponse(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
      "Service-Worker-Allowed": "/",
    },
  });
}

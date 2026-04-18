"use client";

import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { Messaging, getMessaging, isSupported } from "firebase/messaging";
import { firebaseConfig, isFirebaseConfigured } from "./config";

let _app: FirebaseApp | null = null;
let _messaging: Messaging | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return _app;
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (_messaging) return _messaging;

  if (!isFirebaseConfigured()) {
    console.warn("[FCM] Firebase not configured — set NEXT_PUBLIC_FIREBASE_* env vars");
    return null;
  }

  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("[FCM] Firebase Messaging not supported in this browser");
      return null;
    }
    _messaging = getMessaging(getFirebaseApp());
    return _messaging;
  } catch (err) {
    console.error("[FCM] Failed to initialize messaging:", err);
    return null;
  }
}

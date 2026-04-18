import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { Messaging, getMessaging } from "firebase-admin/messaging";

let _adminApp: App | null = null;

export function getAdminApp(): App {
  if (_adminApp) return _adminApp;

  const existing = getApps();
  if (existing.length > 0) {
    _adminApp = existing[0];
    return _adminApp;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY not set. Download from Firebase Console → Project settings → Service accounts."
    );
  }

  const serviceAccount = JSON.parse(raw);
  _adminApp = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });

  return _adminApp;
}

export function getAdminMessaging(): Messaging {
  return getMessaging(getAdminApp());
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
}

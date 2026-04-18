"use client";

/**
 * useNotifications — public interface consumed by <NotificationBell>.
 *
 * Internally delegates to useFCM (Firebase Cloud Messaging) with an automatic
 * fallback to the legacy VAPID / client-polling path when Firebase is not
 * configured (NEXT_PUBLIC_FIREBASE_API_KEY not set).
 */

export { useFCM as useNotifications } from "./useFCM";
export type { UseFCMReturn as UseNotificationsReturn, FCMPermissionState as NotificationState } from "./useFCM";

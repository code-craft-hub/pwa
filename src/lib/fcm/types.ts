// ─── Client-facing message shape ─────────────────────────────────────────────

export interface FcmNotification {
  title: string;
  body: string;
  imageUrl?: string;
  icon?: string;
  badge?: string;
}

/** Full message sent from server → device. All platform configs are optional. */
export interface FcmMessage {
  notification?: FcmNotification;
  /** String-only key/value pairs (FCM data messages requirement). */
  data?: Record<string, string>;
  /** Web-specific overrides for notification appearance and behavior. */
  webpush?: {
    notification?: {
      requireInteraction?: boolean;
      silent?: boolean;
      vibrate?: number[];
      actions?: Array<{ action: string; title: string; icon?: string }>;
      tag?: string;
      renotify?: boolean;
      icon?: string;
      badge?: string;
    };
    fcmOptions?: { link?: string; analyticsLabel?: string };
    headers?: Record<string, string>;
  };
  android?: {
    priority?: "normal" | "high";
    collapseKey?: string;
    ttl?: number; // seconds, e.g. 86400
    notification?: {
      icon?: string;
      color?: string;
      sound?: string;
      tag?: string;
      clickAction?: string;
      channelId?: string;
    };
  };
  apns?: {
    headers?: Record<string, string>;
    payload?: {
      aps?: {
        alert?: { title?: string; body?: string; subtitle?: string };
        badge?: number;
        sound?: string;
        contentAvailable?: boolean;
        mutableContent?: boolean;
        category?: string;
      };
    };
    fcmOptions?: { analyticsLabel?: string; imageUrl?: string };
  };
}

// ─── DB record shapes ─────────────────────────────────────────────────────────

export interface FcmTokenRecord {
  token: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
  topics: string[];
  isActive: boolean;
  metadata: Record<string, unknown>;
}

export type DeliveryStatus = "sent" | "failed" | "invalid_token" | "quota_exceeded";

export interface FcmDeliveryRecord {
  id: number;
  messageId?: string;
  token?: string;
  topic?: string;
  condition?: string;
  status: DeliveryStatus;
  errorCode?: string;
  errorMessage?: string;
  payload?: Record<string, unknown>;
  sentAt: Date;
}

// ─── Send result ─────────────────────────────────────────────────────────────

export interface SendResult {
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
  messageIds: string[];
  errors: Array<{ token: string; error: string }>;
}

export interface BatchSendResult {
  successCount: number;
  failureCount: number;
  responses: Array<{ success: boolean; messageId?: string; error?: string }>;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface DeliveryAnalytics {
  total: number;
  sent: number;
  failed: number;
  invalidTokens: number;
  successRate: number;
  activeDevices: number;
  periodDays: number;
}

"use client";

import { useState } from "react";
import { useFCM } from "@/hooks/useFCM";

const CATEGORY_COLORS: Record<string, string> = {
  motivation: "bg-orange-100 text-orange-700",
  wisdom: "bg-purple-100 text-purple-700",
  success: "bg-green-100 text-green-700",
  mindset: "bg-blue-100 text-blue-700",
  learning: "bg-yellow-100 text-yellow-700",
};

const AVAILABLE_TOPICS = [
  { id: "quotes", label: "Daily Quotes" },
  { id: "weather", label: "Weather Alerts" },
  { id: "updates", label: "App Updates" },
];

export function NotificationBell() {
  const {
    state,
    fcmToken,
    isRegistering,
    lastQuote,
    lastMessage,
    subscribedTopics,
    requestPermission,
    unsubscribe,
    subscribeToTopic,
    unsubscribeFromTopic,
    sendTestNotification,
    refreshToken,
  } = useFCM();

  const [showPanel, setShowPanel] = useState(false);
  const [topicLoading, setTopicLoading] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [tokenCopied, setTokenCopied] = useState(false);

  if (state === "unsupported") return null;

  // ─── Handlers ────────────────────────────────────────────────────────────

  async function handleTopicToggle(topicId: string) {
    setTopicLoading(topicId);
    try {
      if (subscribedTopics.includes(topicId)) {
        await unsubscribeFromTopic(topicId);
      } else {
        await subscribeToTopic(topicId);
      }
    } catch (err) {
      console.error("[NotificationBell] topic toggle failed:", err);
    } finally {
      setTopicLoading(null);
    }
  }

  async function handleTest() {
    setTestStatus("sending");
    try {
      await sendTestNotification();
      setTestStatus("sent");
      setTimeout(() => setTestStatus("idle"), 3000);
    } catch {
      setTestStatus("error");
      setTimeout(() => setTestStatus("idle"), 3000);
    }
  }

  async function handleCopyToken() {
    if (!fcmToken) return;
    await navigator.clipboard.writeText(fcmToken);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  }

  // ─── Bell button ─────────────────────────────────────────────────────────

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {/* Last quote card */}
      {lastQuote && state === "granted" && (
        <div className="max-w-xs rounded-2xl bg-white/95 p-4 shadow-xl ring-1 ring-black/5 backdrop-blur-sm animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Quote of the Day
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                CATEGORY_COLORS[lastQuote.category] ?? "bg-gray-100 text-gray-600"
              }`}
            >
              {lastQuote.category}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-800 leading-snug">
            &ldquo;{lastQuote.text}&rdquo;
          </p>
          <p className="mt-1.5 text-xs text-gray-500">— {lastQuote.author}</p>
        </div>
      )}

      {/* Last foreground FCM message */}
      {lastMessage && !lastQuote && state === "granted" && (
        <div className="max-w-xs rounded-2xl bg-white/95 p-4 shadow-xl ring-1 ring-black/5 backdrop-blur-sm animate-in slide-in-from-bottom-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            {lastMessage.title ?? "New Message"}
          </p>
          <p className="text-sm text-gray-700">{lastMessage.body}</p>
        </div>
      )}

      {/* FCM panel */}
      {showPanel && state === "granted" && (
        <div className="w-72 rounded-2xl bg-white/95 p-4 shadow-xl ring-1 ring-black/5 backdrop-blur-sm animate-in slide-in-from-bottom-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Notification Settings
          </h3>

          {/* Topics */}
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
              Topics
            </p>
            <div className="space-y-2">
              {AVAILABLE_TOPICS.map(({ id, label }) => {
                const isSubscribed = subscribedTopics.includes(id);
                const isLoading = topicLoading === id;
                return (
                  <label
                    key={id}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <span className="text-sm text-gray-700">{label}</span>
                    <button
                      onClick={() => handleTopicToggle(id)}
                      disabled={isLoading}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                        isSubscribed ? "bg-green-500" : "bg-gray-200"
                      } ${isLoading ? "opacity-50" : ""}`}
                    >
                      <span
                        className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${
                          isSubscribed ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Test + refresh */}
          <div className="flex gap-2">
            <button
              onClick={handleTest}
              disabled={testStatus === "sending"}
              className="flex-1 rounded-lg bg-blue-50 px-2 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              {testStatus === "sending"
                ? "Sending…"
                : testStatus === "sent"
                ? "Sent ✓"
                : testStatus === "error"
                ? "Error ✗"
                : "Send test"}
            </button>
            <button
              onClick={refreshToken}
              className="flex-1 rounded-lg bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Refresh token
            </button>
          </div>

          {/* Token copy */}
          {fcmToken && (
            <button
              onClick={handleCopyToken}
              className="mt-2 w-full truncate rounded-lg bg-gray-50 px-2 py-1.5 text-[10px] text-gray-400 hover:bg-gray-100 transition-colors text-left"
              title="Click to copy FCM token"
            >
              {tokenCopied ? "Copied ✓" : fcmToken.slice(0, 48) + "…"}
            </button>
          )}

          {/* Unsubscribe */}
          <button
            onClick={unsubscribe}
            className="mt-3 w-full text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            Disable all notifications
          </button>
        </div>
      )}

      {/* Bell button row */}
      <div className="flex items-center gap-2">
        {state === "granted" && (
          <button
            onClick={() => setShowPanel((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            title="Notification settings"
          >
            Settings
          </button>
        )}

        <button
          onClick={state === "granted" ? () => setShowPanel((v) => !v) : requestPermission}
          disabled={isRegistering || state === "denied"}
          title={
            state === "denied"
              ? "Notifications blocked — allow in browser settings"
              : state === "granted"
              ? "Notification settings"
              : "Enable push notifications via FCM"
          }
          className={`
            relative flex h-12 w-12 items-center justify-center rounded-full shadow-lg
            transition-all duration-200 focus:outline-none focus-visible:ring-2
            focus-visible:ring-offset-2 focus-visible:ring-blue-500
            ${
              state === "denied"
                ? "bg-gray-200 cursor-not-allowed"
                : state === "granted"
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-white hover:bg-gray-50 text-gray-700"
            }
          `}
        >
          {state === "granted" && (
            <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30" />
          )}

          {isRegistering ? (
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
          ) : state === "denied" ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 9.172a4 4 0 015.656 0M3 3l18 18M10.5 21h3M5.586 5.586A7.003 7.003 0 005 9v3l-2 2v1h13.414" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          )}
        </button>
      </div>

      {state === "denied" && (
        <p className="max-w-[180px] text-center text-xs text-gray-400">
          Allow notifications in browser settings to use FCM.
        </p>
      )}
    </div>
  );
}

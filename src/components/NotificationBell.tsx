"use client";

import { useNotifications } from "@/hooks/useNotifications";

const CATEGORY_COLORS: Record<string, string> = {
  motivation: "bg-orange-100 text-orange-700",
  wisdom: "bg-purple-100 text-purple-700",
  success: "bg-green-100 text-green-700",
  mindset: "bg-blue-100 text-blue-700",
  learning: "bg-yellow-100 text-yellow-700",
};

export function NotificationBell() {
  const { state, isSubscribing, lastQuote, requestPermission, unsubscribe } =
    useNotifications();

  if (state === "unsupported") return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {/* Last quote preview card */}
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

      {/* Bell button */}
      <div className="flex items-center gap-2">
        {state === "granted" && (
          <button
            onClick={unsubscribe}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            title="Disable notifications"
          >
            Mute
          </button>
        )}

        <button
          onClick={state === "granted" ? unsubscribe : requestPermission}
          disabled={isSubscribing || state === "denied"}
          title={
            state === "denied"
              ? "Notifications blocked — allow them in browser settings"
              : state === "granted"
              ? "Notifications enabled (click to disable)"
              : "Enable quote notifications"
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
          {/* Active pulse ring */}
          {state === "granted" && (
            <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30" />
          )}

          {isSubscribing ? (
            <svg
              className="h-5 w-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
              />
            </svg>
          ) : state === "denied" ? (
            // Muted bell
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 9.172a4 4 0 015.656 0M3 3l18 18M10.5 21h3M5.586 5.586A7.003 7.003 0 005 9v3l-2 2v1h13.414" />
            </svg>
          ) : state === "granted" ? (
            // Active bell
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          ) : (
            // Default bell
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          )}
        </button>
      </div>

      {/* Denied hint */}
      {state === "denied" && (
        <p className="max-w-[180px] text-center text-xs text-gray-400">
          Allow notifications in your browser settings to receive quotes.
        </p>
      )}
    </div>
  );
}

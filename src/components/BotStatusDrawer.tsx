"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

type BotStatus = "initializing" | "running" | "awaiting_human" | "resuming" | "completed" | "failed" | "not_found"
type ViewMode = "drawer" | "fullscreen" | "collapsed"

interface BotState {
  status: BotStatus
  stuckReason: string | null
  bbLiveUrl: string | null
  checkpoint: { url: string; step: string } | null
}

interface Props {
  applicationId: string
  jobTitle: string
  onClose: () => void
}

export function BotStatusDrawer({ applicationId, jobTitle, onClose }: Props) {
  const [state, setState] = useState<BotState>({ status: "initializing", stuckReason: null, bbLiveUrl: null, checkpoint: null })
  const [resuming, setResuming] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("drawer")
  const esRef = useRef<EventSource | null>(null)
  const router = useRouter()

  useEffect(() => {
    const es = new EventSource(`/api/apply/${applicationId}`)
    esRef.current = es
    es.onmessage = (e) => {
      const data = JSON.parse(e.data) as BotState
      setState(data)
      if (data.status === "completed" || data.status === "failed") es.close()
    }
    es.onerror = () => es.close()
    return () => es.close()
  }, [applicationId])

  const handleResume = async () => {
    setResuming(true)
    await fetch(`/api/apply/${applicationId}/resume`, { method: "POST" })
    setResuming(false)
  }

  const STATUS_LABEL: Record<BotStatus, string> = {
    initializing: "Starting browser…",
    running: "Filling your application…",
    awaiting_human: "Needs your help",
    resuming: "Handing back to bot…",
    completed: "Application submitted!",
    failed: "Something went wrong",
    not_found: "Session not found",
  }

  const isStuck = state.status === "awaiting_human"
  const isDone = state.status === "completed" || state.status === "failed"

  const statusColor =
    isStuck ? "text-amber-600" :
    state.status === "completed" ? "text-green-600" :
    state.status === "failed" ? "text-red-500" :
    "text-indigo-600"

  // ── Collapsed pill ──────────────────────────────────────────────────────
  if (viewMode === "collapsed") {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={() => setViewMode("drawer")}
          className="flex items-center gap-3 bg-gray-900 text-white rounded-full px-5 py-3 shadow-xl text-sm font-medium active:scale-95 transition-transform"
        >
          {!isDone && (
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />
          )}
          <span className="max-w-[180px] truncate">{jobTitle}</span>
          <span className={`shrink-0 text-xs font-semibold ${statusColor}`}>
            {STATUS_LABEL[state.status]}
          </span>
          <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>
    )
  }

  // ── Full-screen ─────────────────────────────────────────────────────────
  if (viewMode === "fullscreen") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 shrink-0">
          <button
            onClick={() => setViewMode("drawer")}
            className="p-2 rounded-xl text-gray-300 hover:text-white active:bg-gray-700"
            title="Exit full screen"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0h5m-5 0v5M15 9l5-5m0 0h-5m5 0v5M9 15l-5 5m0 0h5m-5 0v-5M15 15l5 5m0 0h-5m5 0v-5" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{jobTitle}</p>
            <p className={`text-xs font-medium ${statusColor}`}>{STATUS_LABEL[state.status]}</p>
          </div>
          <button
            onClick={() => setViewMode("collapsed")}
            className="p-2 rounded-xl text-gray-300 hover:text-white active:bg-gray-700"
            title="Minimise"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-white active:bg-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Browser iframe */}
        {state.bbLiveUrl && !isDone ? (
          <iframe
            src={state.bbLiveUrl}
            className="flex-1 w-full border-0"
            allow="clipboard-read; clipboard-write"
            title="Live browser session"
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            {!isDone && <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />}
            {isDone && (
              <p className={`text-lg font-semibold ${statusColor}`}>{STATUS_LABEL[state.status]}</p>
            )}
          </div>
        )}

        {/* Bottom actions in fullscreen */}
        {(isStuck || isDone) && (
          <div className="px-4 pb-6 pt-3 bg-gray-900 flex flex-col gap-2 shrink-0">
            {isStuck && (
              <>
                <p className="text-xs text-amber-400 font-medium">{state.stuckReason} — complete the step above, then tap below.</p>
                <button
                  onClick={handleResume}
                  disabled={resuming}
                  className="w-full py-3 rounded-2xl text-sm font-semibold bg-indigo-600 text-white active:bg-indigo-700 disabled:opacity-60"
                >
                  {resuming ? "Resuming bot…" : "I'm done — let the bot continue"}
                </button>
              </>
            )}
            {isDone && (
              <button
                onClick={() => { onClose(); router.push("/jobs") }}
                className="w-full py-3 rounded-2xl text-sm font-semibold bg-white text-gray-900"
              >
                Back to jobs
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Drawer (default) ────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-h-[92dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-3 flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-2">
            <h2 className="font-semibold text-gray-900 text-base capitalize truncate">{jobTitle}</h2>
            <p className={`text-sm mt-0.5 font-medium ${statusColor}`}>{STATUS_LABEL[state.status]}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Collapse */}
            <button
              onClick={() => setViewMode("collapsed")}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 active:bg-gray-100"
              title="Minimise"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {/* Full screen */}
            <button
              onClick={() => setViewMode("fullscreen")}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 active:bg-gray-100"
              title="Full screen"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5" />
              </svg>
            </button>
            {/* Close */}
            <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 active:bg-gray-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Live browser iframe */}
        {state.bbLiveUrl && !isDone && (
          <div className="mx-4 rounded-2xl overflow-hidden border border-gray-200 bg-gray-900 flex-1 min-h-0">
            <iframe
              src={state.bbLiveUrl}
              className="w-full h-full"
              style={{ minHeight: "50dvh" }}
              allow="clipboard-read; clipboard-write"
              title="Live browser session"
            />
          </div>
        )}

        {/* Stuck banner */}
        {isStuck && (
          <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-amber-800 mb-1">Action needed</p>
            <p className="text-sm text-amber-700">{state.stuckReason}</p>
            <p className="text-xs text-amber-600 mt-2">Complete the step above, then tap &quot;I&apos;m done&quot;.</p>
          </div>
        )}

        {/* Completed */}
        {state.status === "completed" && (
          <div className="mx-4 mt-3 bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <div className="text-3xl mb-1">🎉</div>
            <p className="font-semibold text-green-800">Application submitted!</p>
          </div>
        )}

        {/* Failed */}
        {state.status === "failed" && (
          <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="font-semibold text-red-800 text-sm">Failed</p>
            <p className="text-red-600 text-xs mt-1">{state.stuckReason}</p>
          </div>
        )}

        {/* Spinner */}
        {(state.status === "running" || state.status === "initializing" || state.status === "resuming") && !state.bbLiveUrl && (
          <div className="flex justify-center items-center py-8 gap-3">
            <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
            <span className="text-gray-500 text-sm">{STATUS_LABEL[state.status]}</span>
          </div>
        )}

        {/* Actions */}
        <div className="px-4 pt-3 pb-6 flex flex-col gap-2">
          {isStuck && (
            <button
              onClick={handleResume}
              disabled={resuming}
              className="w-full py-3 rounded-2xl text-sm font-semibold bg-indigo-600 text-white active:bg-indigo-700 disabled:opacity-60"
            >
              {resuming ? "Resuming bot…" : "I'm done — let the bot continue"}
            </button>
          )}
          {isDone && (
            <button
              onClick={() => { onClose(); router.push("/jobs") }}
              className="w-full py-3 rounded-2xl text-sm font-semibold bg-gray-900 text-white"
            >
              Back to jobs
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

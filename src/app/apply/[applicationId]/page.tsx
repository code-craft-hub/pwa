"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

type BotStatus = "initializing" | "running" | "awaiting_human" | "resuming" | "completed" | "failed" | "not_found"

interface BotState {
  status: BotStatus
  stuckReason: string | null
  bbLiveUrl: string | null
  checkpoint: { url: string; step: string } | null
}

export default function ApplyPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [state, setState] = useState<BotState>({ status: "initializing", stuckReason: null, bbLiveUrl: null, checkpoint: null })
  const [resuming, setResuming] = useState(false)
  const esRef = useRef<EventSource | null>(null)
  const router = useRouter()

  useEffect(() => {
    params.then(({ applicationId: id }) => setApplicationId(id))
  }, [params])

  useEffect(() => {
    if (!applicationId) return
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
    if (!applicationId) return
    setResuming(true)
    await fetch(`/api/apply/${applicationId}/resume`, { method: "POST" })
    setResuming(false)
  }

  const isStuck = state.status === "awaiting_human"
  const isDone = state.status === "completed" || state.status === "failed"
  const isActive = !isDone

  const statusColor = isStuck
    ? "text-amber-600 bg-amber-50 border-amber-200"
    : isDone && state.status === "completed"
    ? "text-green-700 bg-green-50 border-green-200"
    : isDone
    ? "text-red-600 bg-red-50 border-red-200"
    : "text-indigo-600 bg-indigo-50 border-indigo-200"

  const statusLabel: Record<BotStatus, string> = {
    initializing: "Starting browser…",
    running: "Bot is filling your application…",
    awaiting_human: "Your help is needed",
    resuming: "Resuming bot…",
    completed: "Application submitted!",
    failed: "Application failed",
    not_found: "Session not found",
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 text-xl">←</button>
        <h1 className="font-semibold text-gray-900 text-base">Auto Apply</h1>
        {isActive && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse inline-block" />
            Live
          </span>
        )}
      </div>

      {/* Status pill */}
      <div className={`mx-4 mt-4 px-4 py-3 rounded-2xl border flex items-center gap-3 ${statusColor}`}>
        {isActive && state.status !== "initializing" && (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
        )}
        <span className="font-medium text-sm">{statusLabel[state.status]}</span>
      </div>

      {/* Live browser iframe — full height on mobile */}
      {state.bbLiveUrl && isActive && (
        <div className="mx-4 mt-4 rounded-2xl overflow-hidden border border-gray-200 bg-gray-900 flex-1" style={{ minHeight: "55dvh" }}>
          <div className="bg-gray-800 px-3 py-2 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="ml-2 text-gray-400 text-xs truncate flex-1">{state.checkpoint?.url ?? "Loading…"}</span>
            <button
              onClick={() => window.open(state.bbLiveUrl!, "_blank", "noopener")}
              className="text-gray-400 text-xs shrink-0 ml-2"
            >
              ↗ Full
            </button>
          </div>
          <iframe
            src={state.bbLiveUrl}
            className="w-full"
            style={{ height: "calc(55dvh - 36px)" }}
            allow="clipboard-read; clipboard-write"
            title="Live browser session"
          />
        </div>
      )}

      {/* Initializing spinner */}
      {state.status === "initializing" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Spinning up your browser…</p>
        </div>
      )}

      {/* Stuck explanation */}
      {isStuck && state.stuckReason && (
        <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-amber-800">What happened</p>
          <p className="text-sm text-amber-700 mt-1">{state.stuckReason}</p>
          <p className="text-xs text-amber-600 mt-2 leading-relaxed">
            The bot paused and is waiting for you. Complete the step above in the live browser, then tap the button below.
          </p>
        </div>
      )}

      {/* Done states */}
      {state.status === "completed" && (
        <div className="mx-4 mt-4 bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <p className="font-bold text-green-800">Application submitted!</p>
          <p className="text-green-600 text-sm mt-1">The bot completed your application.</p>
        </div>
      )}

      {state.status === "failed" && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="font-semibold text-red-800 text-sm">What went wrong</p>
          <p className="text-red-600 text-sm mt-1">{state.stuckReason ?? "Unknown error"}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="px-4 pt-4 pb-8 flex flex-col gap-2 mt-auto">
        {isStuck && (
          <>
            <button
              onClick={() => window.open(state.bbLiveUrl!, "_blank", "noopener")}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold border-2 border-indigo-200 text-indigo-700 bg-white active:bg-indigo-50"
            >
              Open browser in full screen
            </button>
            <button
              onClick={handleResume}
              disabled={resuming}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold bg-indigo-600 text-white active:bg-indigo-700 disabled:opacity-60"
            >
              {resuming ? "Resuming…" : "I'm done — hand back to bot"}
            </button>
          </>
        )}

        {isDone && (
          <button
            onClick={() => router.push("/jobs")}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold bg-gray-900 text-white"
          >
            Back to jobs
          </button>
        )}
      </div>
    </main>
  )
}

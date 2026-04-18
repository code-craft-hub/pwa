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

interface Props {
  applicationId: string
  jobTitle: string
  onClose: () => void
}

export function BotStatusDrawer({ applicationId, jobTitle, onClose }: Props) {
  const [state, setState] = useState<BotState>({ status: "initializing", stuckReason: null, bbLiveUrl: null, checkpoint: null })
  const [resuming, setResuming] = useState(false)
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

  const openFullView = () => {
    if (state.bbLiveUrl) window.open(state.bbLiveUrl, "_blank", "noopener")
  }

  const STATUS_LABEL: Record<BotStatus, string> = {
    initializing: "Starting browser…",
    running: "Bot is filling your application…",
    awaiting_human: "Bot got stuck — your help needed",
    resuming: "Handing back to bot…",
    completed: "Application submitted!",
    failed: "Something went wrong",
    not_found: "Session not found",
  }

  const isStuck = state.status === "awaiting_human"
  const isDone = state.status === "completed" || state.status === "failed"

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      {/* Drawer panel */}
      <div
        className="bg-white rounded-t-3xl w-full max-h-[92dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pt-2 pb-4 flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 text-base">{jobTitle}</h2>
            <p className={`text-sm mt-0.5 font-medium ${isStuck ? "text-amber-600" : isDone && state.status === "completed" ? "text-green-600" : isDone ? "text-red-500" : "text-indigo-600"}`}>
              {STATUS_LABEL[state.status]}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none p-1">✕</button>
        </div>

        {/* Live browser iframe — always visible when URL is available */}
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
            <p className="text-xs text-amber-600 mt-2">
              Complete the step above in the browser, then tap &quot;I&apos;m done&quot; below.
            </p>
          </div>
        )}

        {/* Completed state */}
        {state.status === "completed" && (
          <div className="mx-4 mt-3 bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <div className="text-3xl mb-1">🎉</div>
            <p className="font-semibold text-green-800">Application submitted!</p>
          </div>
        )}

        {state.status === "failed" && (
          <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="font-semibold text-red-800 text-sm">Failed</p>
            <p className="text-red-600 text-xs mt-1">{state.stuckReason}</p>
          </div>
        )}

        {/* Spinner for running states */}
        {(state.status === "running" || state.status === "initializing" || state.status === "resuming") && !state.bbLiveUrl && (
          <div className="flex justify-center items-center py-8 gap-3">
            <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
            <span className="text-gray-500 text-sm">{STATUS_LABEL[state.status]}</span>
          </div>
        )}

        {/* Actions */}
        <div className="px-4 pt-3 pb-6 flex flex-col gap-2">
          {isStuck && (
            <>
              <button
                onClick={openFullView}
                className="w-full py-3 rounded-2xl text-sm font-semibold border-2 border-indigo-200 text-indigo-700 bg-indigo-50 active:bg-indigo-100"
              >
                Open in full screen
              </button>
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

"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { JobCard } from "@/components/JobCard"
import { QADrawer } from "@/components/BotStatusDrawer"

interface Job {
  id: string
  title: string | null
  companyName: string | null
  companyLogo: string | null
  location: string | null
  employmentType: string | null
  postedAt: string | null
  classification: string | null
  applyUrl: string | null
  link: string | null
  emailApply: string | null
}

interface JobsPage {
  items: Job[]
  hasMore: boolean
  nextCursor: string | null
}

export interface QAItem { question: string; answer: string }

export interface BotSession {
  applicationId: string
  liveUrl: string
  status: "starting" | "running" | "awaiting_human" | "completed" | "failed"
  stuckReason?: string
  lastStepSummary?: string
  applicationQA?: QAItem[]
}

const DEMO_USER_ID = "c04e1660-d2d2-42ac-9770-b501e5673e89"

async function fetchJobsPage({ pageParam, search, excludeEmail }: {
  pageParam: string | null; search: string; excludeEmail: boolean
}): Promise<JobsPage> {
  const params = new URLSearchParams({ limit: "20" })
  if (search) params.set("search", search)
  if (excludeEmail) params.set("excludeEmail", "1")
  if (pageParam) params.set("cursor", pageParam)
  const res = await fetch(`/api/jobs?${params}`)
  if (!res.ok) throw new Error("Failed to load jobs")
  return res.json()
}

function mapApiStatus(s: string): BotSession["status"] {
  if (s === "awaiting_human") return "awaiting_human"
  if (s === "completed") return "completed"
  if (s === "failed" || s === "not_found") return "failed"
  return "running"
}

/** Invisible component — subscribes to SSE for one bot session and reports updates upward. */
function BotPoller({ applicationId, jobId, onUpdate }: {
  applicationId: string
  jobId: string
  onUpdate: (jobId: string, patch: Partial<BotSession>) => void
}) {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    const es = new EventSource(`/api/apply/${applicationId}`)
    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      const status = mapApiStatus(data.status)
      onUpdateRef.current(jobId, {
        status,
        liveUrl: data.bbLiveUrl || undefined,
        stuckReason: data.stuckReason || undefined,
        lastStepSummary: data.lastStepSummary || undefined,
        applicationQA: data.applicationQA || undefined,
      })
      if (status === "completed" || status === "failed") es.close()
    }
    es.onerror = () => es.close()
    return () => es.close()
  }, [applicationId, jobId])

  return null
}

export default function JobsPage() {
  const [search, setSearch] = useState("")
  const [excludeEmail, setExcludeEmail] = useState(false)
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [botSessions, setBotSessions] = useState<Record<string, BotSession>>({})
  const [qaJobId, setQaJobId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const handleSearch = (value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 400)
  }

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } = useInfiniteQuery({
    queryKey: ["jobs", debouncedSearch, excludeEmail],
    queryFn: ({ pageParam }) =>
      fetchJobsPage({ pageParam: pageParam as string | null, search: debouncedSearch, excludeEmail }),
    initialPageParam: null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })

  const jobs = data?.pages.flatMap((p) => p.items) ?? []

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage() },
      { rootMargin: "200px" },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const patchSession = useCallback((jobId: string, patch: Partial<BotSession>) => {
    setBotSessions((prev) => prev[jobId] ? { ...prev, [jobId]: { ...prev[jobId], ...patch } } : prev)
  }, [])

  const handleApply = useCallback(async (job: Job) => {
    setBotSessions((prev) => ({
      ...prev,
      [job.id]: { applicationId: "", liveUrl: "", status: "starting" },
    }))
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, userId: DEMO_USER_ID }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? "Failed to start bot")
      setBotSessions((prev) => ({
        ...prev,
        [job.id]: { applicationId: result.applicationId, liveUrl: result.liveUrl, status: "running" },
      }))
    } catch (err) {
      setBotSessions((prev) => { const n = { ...prev }; delete n[job.id]; return n })
      alert(err instanceof Error ? err.message : "Failed to start auto-apply")
    }
  }, [])

  const handleResume = useCallback(async (applicationId: string) => {
    await fetch(`/api/apply/${applicationId}/resume`, { method: "POST" })
  }, [])

  const activePollers = Object.entries(botSessions).filter(
    ([, s]) => s.applicationId && s.status !== "completed" && s.status !== "failed" && s.status !== "starting"
  )

  const qaSession = qaJobId ? botSessions[qaJobId] : null
  const qaJob = qaJobId ? jobs.find((j) => j.id === qaJobId) : null

  return (
    <main className="min-h-screen bg-gray-50">
      {/* SSE pollers — one per active session */}
      {activePollers.map(([jobId, s]) => (
        <BotPoller key={jobId} applicationId={s.applicationId} jobId={jobId} onUpdate={patchSession} />
      ))}

      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-3.5 pb-3 flex flex-col gap-2.5">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Jobs</h1>
            <p className="text-xs text-gray-500">Tap Auto Apply — bot handles the rest</p>
          </div>
          <button onClick={() => refetch()} className="text-indigo-600 text-sm font-medium shrink-0">Refresh</button>
        </div>

        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Search job titles…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        <button
          onClick={() => setExcludeEmail((v) => !v)}
          className={`flex items-center gap-2 self-start text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
            excludeEmail ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          Hide email-apply jobs
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20 gap-3">
          <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Loading jobs…</span>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">No jobs found</div>
      ) : (
        <div className="px-4 py-4 grid gap-3 max-w-xl mx-auto">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onApply={handleApply}
              onResume={handleResume}
              onViewQA={() => setQaJobId(job.id)}
              botSession={botSessions[job.id]}
            />
          ))}
          <div ref={sentinelRef} className="h-4" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-4 gap-2">
              <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
              <span className="text-gray-400 text-sm">Loading more…</span>
            </div>
          )}
          {!hasNextPage && jobs.length > 0 && (
            <p className="text-center text-xs text-gray-400 py-4">You&apos;ve seen all jobs</p>
          )}
        </div>
      )}

      {qaSession?.applicationQA && qaJob && (
        <QADrawer
          jobTitle={qaJob.title ?? "Job"}
          qa={qaSession.applicationQA}
          onClose={() => setQaJobId(null)}
        />
      )}
    </main>
  )
}

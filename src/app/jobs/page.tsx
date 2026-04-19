"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { JobCard } from "@/components/JobCard"
import { BotStatusDrawer } from "@/components/BotStatusDrawer"

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

// TODO: replace with real auth session userId
const DEMO_USER_ID = "c04e1660-d2d2-42ac-9770-b501e5673e89"

async function fetchJobsPage({
  pageParam,
  search,
  excludeEmail,
}: {
  pageParam: string | null
  search: string
  excludeEmail: boolean
}): Promise<JobsPage> {
  const params = new URLSearchParams({ limit: "20" })
  if (search) params.set("search", search)
  if (excludeEmail) params.set("excludeEmail", "1")
  if (pageParam) params.set("cursor", pageParam)
  const res = await fetch(`/api/jobs?${params}`)
  if (!res.ok) throw new Error("Failed to load jobs")
  return res.json()
}

export default function JobsPage() {
  const [search, setSearch] = useState("")
  const [excludeEmail, setExcludeEmail] = useState(false)
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<{ applicationId: string; jobTitle: string } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Debounce search input
  const handleSearch = (value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 400)
  }

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["jobs", debouncedSearch, excludeEmail],
    queryFn: ({ pageParam }) =>
      fetchJobsPage({ pageParam: pageParam as string | null, search: debouncedSearch, excludeEmail }),
    initialPageParam: null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })

  const jobs = data?.pages.flatMap((p) => p.items) ?? []

  // IntersectionObserver — load next page when sentinel enters viewport
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

  const handleApply = useCallback(async (job: Job) => {
    setApplyingJobId(job.id)
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, userId: DEMO_USER_ID }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? "Failed to start bot")
      setActiveSession({ applicationId: result.applicationId, jobTitle: job.title ?? "Job" })
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start auto-apply")
    } finally {
      setApplyingJobId(null)
    }
  }, [])

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-3.5 pb-3 flex flex-col gap-2.5">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Jobs</h1>
            <p className="text-xs text-gray-500">Tap Auto Apply — bot handles the rest</p>
          </div>
          <button
            onClick={() => refetch()}
            className="text-indigo-600 text-sm font-medium shrink-0"
          >
            Refresh
          </button>
        </div>

        {/* Search box */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Search job titles…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
          />
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setExcludeEmail((v) => !v)}
          className={`flex items-center gap-2 self-start text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
            excludeEmail
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-gray-600 border-gray-200"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          Hide email-apply jobs
        </button>
      </div>

      {/* Job list */}
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
              applying={applyingJobId === job.id}
            />
          ))}

          {/* Infinite scroll sentinel */}
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

      {activeSession && (
        <BotStatusDrawer
          applicationId={activeSession.applicationId}
          jobTitle={activeSession.jobTitle}
          onClose={() => setActiveSession(null)}
        />
      )}
    </main>
  )
}

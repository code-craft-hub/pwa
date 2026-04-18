"use client"

import { useEffect, useState, useCallback } from "react"
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
}

// Hard-coded demo profile — replace with real user profile from your auth/profile system
const DEMO_PROFILE = {
  firstName: "Alex",
  lastName: "Johnson",
  email: "alex@example.com",
  phone: "+1 555 000 0000",
  linkedinUrl: "https://linkedin.com/in/alexjohnson",
}

// Hard-coded userId — replace with real auth session
const DEMO_USER_ID = "c04e1660-d2d2-42ac-9770-b501e5673e89"

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<{ applicationId: string; jobTitle: string } | null>(null)

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/jobs")
      const data = await res.json()
      setJobs(data.items ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const handleApply = async (job: Job) => {
    setApplyingJobId(job.id)
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, userId: DEMO_USER_ID, userProfile: DEMO_PROFILE }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to start bot")
      setActiveSession({ applicationId: data.applicationId, jobTitle: job.title ?? "Job" })
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start auto-apply")
    } finally {
      setApplyingJobId(null)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3.5 flex items-center gap-3">
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">Jobs</h1>
          <p className="text-xs text-gray-500">Tap Auto Apply — bot handles the rest</p>
        </div>
        <button onClick={fetchJobs} className="text-indigo-600 text-sm font-medium">Refresh</button>
      </div>

      {loading ? (
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
        </div>
      )}

      {/* Bot status drawer */}
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

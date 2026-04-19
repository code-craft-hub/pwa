import { db } from "./db";
import { autoApplySessions } from "@/schema/auto-apply";
import { jobApplications } from "@/schema/schema";
import { eq, inArray } from "drizzle-orm";

const BU_API = "https://api.browser-use.com/api/v3";
const BU_KEY = () => process.env.BROWSER_USE_API_KEY!;
const BU_MODEL = process.env.BROWSER_USE_MODEL ?? "gemini-3-flash";

// ---------- Browser-Use REST helpers ----------

interface BuSession {
  id: string;
  status: "created" | "running" | "idle" | "stopped" | "error" | "timed_out";
  output: string | null;
  liveUrl: string | null;
}

async function buPost(path: string, body: object): Promise<Response> {
  return fetch(`${BU_API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Browser-Use-API-Key": BU_KEY(),
    },
    body: JSON.stringify(body),
  });
}

async function buGet(path: string): Promise<Response> {
  return fetch(`${BU_API}${path}`, {
    headers: { "X-Browser-Use-API-Key": BU_KEY() },
  });
}

async function startBuTask(task: string, existingSessionId?: string): Promise<BuSession> {
  const res = await buPost("/sessions", {
    task,
    model: BU_MODEL,
    keep_alive: true,
    ...(existingSessionId ? { session_id: existingSessionId } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => String(res.status));
    throw new Error(`Browser-Use API error (${res.status}): ${text}`);
  }
  return res.json() as Promise<BuSession>;
}

async function fetchBuSession(sessionId: string): Promise<BuSession> {
  const res = await buGet(`/sessions/${sessionId}`);
  return res.json() as Promise<BuSession>;
}

async function stopBuSession(sessionId: string, strategy: "task" | "session" = "session") {
  await buPost(`/sessions/${sessionId}/stop`, { strategy }).catch(() => {});
}

/** Poll until the session leaves running/created state (max 10 min). */
async function pollUntilDone(sessionId: string, timeoutMs = 600_000): Promise<BuSession> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const data = await fetchBuSession(sessionId);
    if (data.status !== "running" && data.status !== "created") return data;
  }
  return { id: sessionId, status: "timed_out", output: null, liveUrl: null };
}

function toInteractiveLiveUrl(liveUrl: string): string {
  const sep = liveUrl.includes("?") ? "&" : "?";
  return `${liveUrl}${sep}ui=true`;
}

/** Poll until live_url is available (max 60 s), then update the DB row. */
async function hydrateLiveUrl(sessionId: string, applicationId: string): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const data = await fetchBuSession(sessionId);
    if (data.liveUrl) {
      await db
        .update(autoApplySessions)
        .set({ bbLiveUrl: toInteractiveLiveUrl(data.liveUrl), updatedAt: new Date() })
        .where(eq(autoApplySessions.applicationId, applicationId))
        .catch(() => {});
      return;
    }
    if (data.status === "error" || data.status === "stopped") return;
    await new Promise((r) => setTimeout(r, 2000));
  }
}

// ---------- Stale-session cleanup ----------

export async function releaseStaleSessionsForUser(_userId: string) {
  const stale = await db.query.autoApplySessions
    .findMany({
      where: inArray(autoApplySessions.status, [
        "initializing",
        "running",
        "awaiting_human",
        "resuming",
      ]),
    })
    .catch(() => []);

  if (stale.length > 0) {
    await Promise.all(
      stale.map(async (s) => {
        await stopBuSession(s.bbSessionId, "session");
        await db
          .update(autoApplySessions)
          .set({ status: "failed", stuckReason: "Superseded by new session", updatedAt: new Date() })
          .where(eq(autoApplySessions.id, s.id))
          .catch(() => {});
      }),
    );
  }
}

// ---------- DB helpers ----------

async function updateSession(
  applicationId: string,
  patch: Partial<typeof autoApplySessions.$inferInsert>,
) {
  await db
    .update(autoApplySessions)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(autoApplySessions.applicationId, applicationId));
}

async function getSession(applicationId: string) {
  return db.query.autoApplySessions.findFirst({
    where: eq(autoApplySessions.applicationId, applicationId),
  });
}

// ---------- Wait for human resume ----------

async function waitForResume(applicationId: string): Promise<"resumed" | "abandoned"> {
  for (;;) {
    await new Promise((r) => setTimeout(r, 3000));
    const s = await getSession(applicationId);
    if (!s) return "abandoned";
    if (s.status === "resuming") return "resumed";
    if (s.status === "abandoned" || s.status === "failed") return "abandoned";
  }
}

// ---------- FCM push ----------

async function notifyStuck(
  userId: string,
  applicationId: string,
  reason: string,
  jobTitle: string,
) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/fcm/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        title: "Bot needs your help",
        body: `${jobTitle}: ${reason}`,
        data: { applicationId, type: "auto_apply_stuck" },
        url: `/apply/${applicationId}`,
      }),
    });
  } catch {
    // Non-fatal
  }
}

// ---------- Exported types ----------

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;         // "City, Country"
  currentCompany?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  websiteUrl?: string;
  resumeUrl?: string;        // publicly accessible download URL
  resumeText?: string;       // plain-text resume content (fallback for text fields)
  coverLetterText?: string;  // plain-text cover letter content
  summary?: string;          // bio / professional summary
  workAuthorized?: boolean;
  willingToRelocate?: boolean;
  salary?: string;
  availability?: string;     // e.g. "immediately", "2 weeks"
  yearsOfExperience?: string;
}

// ---------- Task prompts ----------

function buildApplyTask(applyUrl: string, profile: UserProfile): string {
  const lines: string[] = [
    `Go to ${applyUrl} and complete the job application form on behalf of the user.`,
    ``,
    `=== CANDIDATE PROFILE ===`,
    `Full name: ${profile.firstName} ${profile.lastName}`,
    `Email: ${profile.email}`,
  ];

  if (profile.phone)           lines.push(`Phone: ${profile.phone}`);
  if (profile.location)        lines.push(`Location: ${profile.location}`);
  if (profile.currentCompany)  lines.push(`Current company: ${profile.currentCompany}`);
  if (profile.linkedinUrl)     lines.push(`LinkedIn: ${profile.linkedinUrl}`);
  if (profile.githubUrl)       lines.push(`GitHub: ${profile.githubUrl}`);
  if (profile.twitterUrl)      lines.push(`Twitter: ${profile.twitterUrl}`);
  if (profile.portfolioUrl)    lines.push(`Portfolio: ${profile.portfolioUrl}`);
  if (profile.websiteUrl)      lines.push(`Website: ${profile.websiteUrl}`);
  if (profile.resumeUrl)       lines.push(`Resume file URL (upload this file where a resume upload is required): ${profile.resumeUrl}`);
  if (profile.salary)          lines.push(`Salary expectation: ${profile.salary}`);
  if (profile.availability)    lines.push(`Availability to start: ${profile.availability}`);
  if (profile.yearsOfExperience) lines.push(`Years of experience: ${profile.yearsOfExperience}`);

  lines.push(`Work authorized in this country: ${profile.workAuthorized !== false ? "Yes" : "No"}`);
  lines.push(`Willing to relocate: ${profile.willingToRelocate !== false ? "Yes" : "No"}`);

  if (profile.summary) {
    lines.push(``, `=== PROFESSIONAL SUMMARY ===`, profile.summary);
  }

  if (profile.coverLetterText) {
    lines.push(``, `=== COVER LETTER ===`, profile.coverLetterText);
    lines.push(`(Use this exact text when a cover letter or motivation letter field is present)`);
  }

  if (profile.resumeText) {
    lines.push(``, `=== RESUME CONTENT (use to answer experience/skills questions) ===`, profile.resumeText.slice(0, 3000));
  }

  lines.push(``, `=== INSTRUCTIONS ===`);
  lines.push(`1. Fill in EVERY field using the profile data above. Use best judgment for fields not explicitly listed.`);
  lines.push(`2. For "How did you hear about us?" or similar: answer "Company website" or "Online search".`);
  lines.push(`3. For open-ended essay questions: write a thoughtful answer using information from the resume and summary.`);
  lines.push(`4. Upload the resume file when a file upload field is present.`);
  lines.push(`5. Submit the application when all required fields are filled.`);
  lines.push(`6. If a CAPTCHA, SMS/phone verification, email confirmation, or two-factor authentication blocks you, stop and output:`);
  lines.push(`   BLOCKED: <one-line description>`);
  lines.push(`   Do NOT attempt to solve it yourself.`);
  lines.push(`7. After submitting (or being blocked), output a structured Q&A log of every question you encountered and the answer you provided, in this exact format:`);
  lines.push(`   APPLICATION_QA_START`);
  lines.push(`   [{"question": "...", "answer": "..."}, ...]`);
  lines.push(`   APPLICATION_QA_END`);

  return lines.join("\n").trim();
}

function buildResumeTask(): string {
  return "The user has completed the manual verification step. Please continue filling in and submitting the job application from where you stopped.";
}

// ---------- Output parsing ----------

function detectStuckFromOutput(output: string | null): string | null {
  if (!output) return null;
  const match = output.match(/BLOCKED:\s*(.+)/i);
  if (match) return match[1].trim();
  const lower = output.toLowerCase();
  const keywords = ["captcha", "phone verification", "sms code", "two-factor", "2fa", "email confirmation", "manual verification"];
  for (const kw of keywords) {
    if (lower.includes(kw)) return output.trim();
  }
  return null;
}

import type { ApplicationQA } from "@/schema/auto-apply";

function extractQAFromOutput(output: string | null): ApplicationQA[] | null {
  if (!output) return null;
  const match = output.match(/APPLICATION_QA_START\s*([\s\S]*?)\s*APPLICATION_QA_END/i);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1].trim());
    if (Array.isArray(parsed)) return parsed as ApplicationQA[];
  } catch {
    // ignore parse errors
  }
  return null;
}

// ---------- Main entry points ----------

/**
 * Starts a Browser-Use cloud task, stores the session, and returns the live URL immediately.
 * The caller should fire-and-forget runBotSession() after this.
 */
export async function createAutoApplySession(
  applicationId: string,
  applyUrl: string,
  profile: UserProfile,
): Promise<{ buSessionId: string; liveUrl: string }> {
  const task = buildApplyTask(applyUrl, profile);
  const session = await startBuTask(task);

  const initialLiveUrl = session.liveUrl ? toInteractiveLiveUrl(session.liveUrl) : "";

  await db
    .insert(autoApplySessions)
    .values({
      applicationId,
      bbSessionId: session.id,
      bbLiveUrl: initialLiveUrl,
      status: "running",
    })
    .onConflictDoUpdate({
      target: autoApplySessions.applicationId,
      set: {
        bbSessionId: session.id,
        bbLiveUrl: initialLiveUrl,
        status: "running",
        updatedAt: new Date(),
      },
    });

  return { buSessionId: session.id, liveUrl: initialLiveUrl };
}

/**
 * Polls the Browser-Use session until done, handles stuck detection and human-in-the-loop.
 * Fire-and-forget — call without await from the API route.
 */
export async function runBotSession(
  applicationId: string,
  userId: string,
  jobTitle: string,
  buSessionId: string,
) {
  try {
    hydrateLiveUrl(buSessionId, applicationId).catch(() => {});

    const result = await pollUntilDone(buSessionId);

    if (result.status === "error" || result.status === "timed_out") {
      await updateSession(applicationId, {
        status: "failed",
        stuckReason: result.output ?? result.status,
      });
      await stopBuSession(buSessionId, "session");
      return;
    }

    // Check DB — user may have triggered a manual takeover while the task was still running
    const dbAfterPoll = await getSession(applicationId);
    const userTookOver = dbAfterPoll?.status === "resuming";

    const stuckReason = userTookOver ? "User requested manual intervention" : detectStuckFromOutput(result.output);

    if (stuckReason) {
      if (!userTookOver) {
        // Bot detected the block itself — notify and wait
        const dbSession = await getSession(applicationId);
        await updateSession(applicationId, {
          status: "awaiting_human",
          stuckReason,
          checkpoint: { url: dbSession?.checkpoint?.url ?? "", step: "stuck" },
        });
        await notifyStuck(userId, applicationId, stuckReason, jobTitle);

        const outcome = await waitForResume(applicationId);
        if (outcome === "abandoned") {
          await updateSession(applicationId, { status: "failed", stuckReason: "User abandoned" });
          await stopBuSession(buSessionId, "session");
          return;
        }
      }
      // DB is already "resuming" at this point (either from bot flow or user takeover)

      // Send follow-up task to the SAME browser session
      await updateSession(applicationId, { status: "running" });
      const resumed = await startBuTask(buildResumeTask(), buSessionId);
      const resumeResult = await pollUntilDone(resumed.id);

      if (resumeResult.status !== "idle") {
        await updateSession(applicationId, {
          status: "failed",
          stuckReason: resumeResult.output ?? resumeResult.status,
        });
        await stopBuSession(buSessionId, "session");
        return;
      }

      // Use resume output as the final output for Q&A extraction
      await stopBuSession(buSessionId, "session");
      const resumeQa = extractQAFromOutput(resumeResult.output);
      await updateSession(applicationId, {
        status: "completed",
        ...(resumeQa ? { applicationQA: resumeQa } : {}),
      });
      await db
        .update(jobApplications)
        .set({ status: "submitted", autoApplied: true })
        .where(eq(jobApplications.id, applicationId));
      return;
    }

    await stopBuSession(buSessionId, "session");
    const finalOutput = result.status === "idle" ? result.output : null;
    const qa = extractQAFromOutput(finalOutput);
    await updateSession(applicationId, {
      status: "completed",
      ...(qa ? { applicationQA: qa } : {}),
    });
    await db
      .update(jobApplications)
      .set({ status: "submitted", autoApplied: true })
      .where(eq(jobApplications.id, applicationId));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await updateSession(applicationId, { status: "failed", stuckReason: msg }).catch(() => {});
    await stopBuSession(buSessionId, "session").catch(() => {});
  }
}

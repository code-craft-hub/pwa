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
  linkedinUrl?: string;
  resumeUrl?: string;
}

// ---------- Task prompts ----------

function buildApplyTask(applyUrl: string, profile: UserProfile): string {
  return `
Go to ${applyUrl} and complete the job application using this profile:
- Name: ${profile.firstName} ${profile.lastName}
- Email: ${profile.email}
${profile.phone ? `- Phone: ${profile.phone}` : ""}
${profile.linkedinUrl ? `- LinkedIn: ${profile.linkedinUrl}` : ""}
${profile.resumeUrl ? `- Resume: ${profile.resumeUrl}` : ""}
- Work authorized: Yes

Fill in every required field. Submit the application.
If you cannot proceed because a CAPTCHA, phone/SMS verification, email confirmation, or
two-factor authentication is required, stop immediately and output exactly:
BLOCKED: <one-line description of what is blocking you>
Do NOT attempt to solve it yourself.
`.trim();
}

function buildResumeTask(): string {
  return "The user has completed the manual verification step. Please continue filling in and submitting the job application from where you stopped.";
}

// ---------- Stuck detection ----------

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
    }

    await stopBuSession(buSessionId, "session");
    await updateSession(applicationId, { status: "completed" });
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

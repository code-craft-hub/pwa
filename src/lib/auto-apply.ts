import { Stagehand } from "@browserbasehq/stagehand";
import { db } from "./db";
import { autoApplySessions } from "@/schema/auto-apply";
import { jobApplications } from "@/schema/schema";
import { eq, inArray } from "drizzle-orm";

const BB_API = "https://api.browserbase.com/v1";
const BB_KEY = () => process.env.BROWSERBASE_API_KEY!;

// ---------- Browserbase session cleanup ----------

/** Release a single Browserbase session via REST (fire-and-forget safe). */
async function releaseBBSession(bbSessionId: string) {
  await fetch(`${BB_API}/sessions/${bbSessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-bb-api-key": BB_KEY() },
    body: JSON.stringify({ status: "REQUEST_RELEASE" }),
  }).catch(() => {});
}

/**
 * Release ALL running Browserbase sessions for this project via the REST API,
 * then mark any matching DB rows as failed.
 * Prevents 429 concurrent-session errors on free-tier accounts.
 */
async function listRunningSessions(): Promise<{ id: string }[]> {
  const res = await fetch(
    `${BB_API}/sessions?status=RUNNING&projectId=${process.env.BROWSERBASE_PROJECT_ID}`,
    { headers: { "x-bb-api-key": BB_KEY() } },
  ).catch(() => null);
  if (!res?.ok) return [];
  const { sessions } = (await res.json()) as { sessions: { id: string }[] };
  return sessions ?? [];
}

export async function releaseStaleSessionsForUser(_userId: string) {
  // 1. Ask Browserbase for every RUNNING session and release them
  const running = await listRunningSessions();
  if (running.length > 0) {
    await Promise.all(running.map((s) => releaseBBSession(s.id)));

    // Poll until Browserbase confirms all sessions are gone (max 30s)
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000));
      const still = await listRunningSessions();
      if (still.length === 0) break;
    }
  }

  // 2. Also mark any stale DB rows as failed
  const stale = await db.query.autoApplySessions
    .findMany({
      where: inArray(autoApplySessions.status, [
        "initializing",
        "running",
        "awaiting_human",
        "resuming",
      ]),
    })
    .catch(() => [])

  if (stale.length > 0) {
    await Promise.all(
      stale.map((s) =>
        db
          .update(autoApplySessions)
          .set({ status: "failed", stuckReason: "Superseded by new session", updatedAt: new Date() })
          .where(eq(autoApplySessions.id, s.id))
          .catch(() => {}),
      ),
    )
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

async function waitForResume(
  applicationId: string,
): Promise<"resumed" | "abandoned"> {
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

Fill in every required field. Submit the application. If you cannot proceed because a CAPTCHA,
phone/SMS verification, email confirmation, or two-factor authentication is blocking progress,
stop and do NOT attempt to solve it — the user will handle it manually.
`.trim();
}

function buildResumeTask(): string {
  return "The user has completed the manual verification step. Please continue filling in and submitting the job application from where you stopped.";
}

// ---------- Stagehand factory ----------

// google/gemini-3-flash-preview is the latest fast Gemini model in Stagehand
const GEMINI_MODEL = "google/gemini-3-flash-preview"
const geminiModel = () => ({
  modelName: GEMINI_MODEL,
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
})

function makeStagehand(existingSessionId?: string) {
  return new Stagehand({
    env: "BROWSERBASE",
    apiKey: process.env.BROWSERBASE_API_KEY!,
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    ...(existingSessionId ? { browserbaseSessionID: existingSessionId } : {}),
    keepAlive: true,
    waitForCaptchaSolves: true,
    model: geminiModel(),
    verbose: 0,
    disablePino: true,
  });
}

// ---------- Stuck detection ----------

async function detectStuck(
  stagehand: InstanceType<typeof Stagehand>,
): Promise<string | null> {
  try {
    const { extraction } = await stagehand.extract(
      "Is this page blocked by a CAPTCHA, phone verification, SMS code, email confirmation, or two-factor authentication that requires human action? Reply with exactly 'BLOCKED: <reason>' if yes, or 'CLEAR' if no.",
    );
    if (extraction.startsWith("BLOCKED:")) {
      return extraction.replace("BLOCKED:", "").trim();
    }
    return null;
  } catch {
    return null;
  }
}

// ---------- Main entry points ----------

/**
 * Creates a Browserbase session via Stagehand, stores it, and returns the live URL immediately.
 * The caller should fire-and-forget runBotSession() after this.
 */
export async function createAutoApplySession(
  applicationId: string,
  applyUrl: string,
  profile: UserProfile,
): Promise<{
  bbSessionId: string;
  liveUrl: string;
  stagehand: InstanceType<typeof Stagehand>;
}> {
  const stagehand = makeStagehand();
  await stagehand.init();

  const bbSessionId = stagehand.browserbaseSessionID!;
  const liveUrl =
    stagehand.browserbaseDebugURL ??
    `https://www.browserbase.com/sessions/${bbSessionId}`;

  await db
    .insert(autoApplySessions)
    .values({
      applicationId,
      bbSessionId,
      bbLiveUrl: liveUrl,
      status: "running",
    })
    .onConflictDoUpdate({
      target: autoApplySessions.applicationId,
      set: {
        bbSessionId,
        bbLiveUrl: liveUrl,
        status: "running",
        updatedAt: new Date(),
      },
    });

  return { bbSessionId, liveUrl, stagehand };
}

/**
 * Runs the bot automation. Fire-and-forget — call without await from the API route.
 * The `stagehand` instance is the one returned by createAutoApplySession (already init'd).
 */
export async function runBotSession(
  applicationId: string,
  applyUrl: string,
  profile: UserProfile,
  userId: string,
  jobTitle: string,
  stagehand: InstanceType<typeof Stagehand>,
) {
  try {
    const agent = stagehand.agent({ model: geminiModel() });
    await agent.execute({
      instruction: buildApplyTask(applyUrl, profile),
      maxSteps: 40,
    });

    // Check if we got stuck (e.g. phone verify that CAPTCHA solver couldn't handle)
    const stuckReason = await detectStuck(stagehand);

    if (stuckReason) {
      const session = await getSession(applicationId);
      await updateSession(applicationId, {
        status: "awaiting_human",
        stuckReason,
        checkpoint: { url: session?.checkpoint?.url ?? "", step: "stuck" },
      });
      await notifyStuck(userId, applicationId, stuckReason, jobTitle);

      // Keep the Browserbase session alive — user sees it via browserbaseDebugURL
      const outcome = await waitForResume(applicationId);
      if (outcome === "abandoned") {
        await updateSession(applicationId, {
          status: "failed",
          stuckReason: "User abandoned",
        });
        await stagehand.close();
        return;
      }

      // Reconnect to the SAME Browserbase session and continue
      await stagehand.close();
      const resumed = makeStagehand(
        await getSession(applicationId).then((s) => s?.bbSessionId),
      );
      await resumed.init();
      await updateSession(applicationId, { status: "running" });

      const resumeAgent = resumed.agent({ model: geminiModel() });
      await resumeAgent.execute({
        instruction: buildResumeTask(),
        maxSteps: 30,
      });
      await resumed.close();
    } else {
      await stagehand.close();
    }

    await updateSession(applicationId, { status: "completed" });
    await db
      .update(jobApplications)
      .set({ status: "submitted", autoApplied: true })
      .where(eq(jobApplications.id, applicationId));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await updateSession(applicationId, {
      status: "failed",
      stuckReason: msg,
    }).catch(() => {});
    await stagehand.close().catch(() => {});
  }
}

"use server";

import {
  composeFeedbackIssue,
  feedbackInputSchema,
  getEnv,
  type FeedbackContext,
  type FeedbackInput,
} from "@95forward/shared";
import { getCurrentUser } from "@/lib/auth";
import { isTestSeamEnabled } from "@/lib/test-seam";
import { createGithubIssue } from "@/server/feedback/github";
import type { FeedbackState } from "./feedback-state";

function parseInput(formData: FormData): FeedbackInput | null {
  const kind = formData.get("kind");
  if (kind === "bug") {
    const parsed = feedbackInputSchema.safeParse({
      kind: "bug",
      summary: formData.get("summary"),
      whatHappened: formData.get("whatHappened"),
      steps: optional(formData.get("steps")),
      area: formData.get("area"),
      environment: formData.get("environment"),
      severity: formData.get("severity"),
      screenshots: optional(formData.get("screenshots")),
    });
    return parsed.success ? parsed.data : null;
  }
  if (kind === "feature") {
    const parsed = feedbackInputSchema.safeParse({
      kind: "feature",
      summary: formData.get("summary"),
      detail: formData.get("detail"),
    });
    return parsed.success ? parsed.data : null;
  }
  return null;
}

function optional(value: FormDataEntryValue | null): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  return text === "" ? undefined : text;
}

function safeRoute(value: FormDataEntryValue | null): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw.startsWith("/")) return "/";
  return raw.slice(0, 256);
}

function prospectIdFromRoute(route: string): string | undefined {
  const match = /\/95-forward\/prospects\/([0-9a-f-]{36})/.exec(route);
  return match?.[1];
}

export async function submitFeedbackAction(
  _prev: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired — please sign in again." };

  const input = parseInput(formData);
  if (!input) return { ok: false, error: "Please fill in the required fields and try again." };

  const env = getEnv();
  const route = safeRoute(formData.get("route"));

  const context: FeedbackContext = {
    reporterName: user.name,
    reporterEmail: user.email,
    route,
    prospectId: prospectIdFromRoute(route),
    buildSha: process.env.NEXT_PUBLIC_BUILD_SHA ?? "unknown",
    timestamp: new Date().toISOString(),
  };

  const issue = composeFeedbackIssue(input, context);

  try {
    const created = await createGithubIssue(issue, {
      mode: env.FEEDBACK_MODE,
      token: env.FEEDBACK_GITHUB_TOKEN,
      repo: env.FEEDBACK_REPO,
    });
    return {
      ok: true,
      reference: created.reference,
      ...(isTestSeamEnabled() ? { debugPayload: issue } : {}),
    };
  } catch (error) {
    console.error("[feedback] submission failed", error);
    return { ok: false, error: "We couldn't send that just now — please try again in a moment." };
  }
}

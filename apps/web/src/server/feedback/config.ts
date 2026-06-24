import "server-only";
import { getEnv } from "@95forward/shared";

export function isFeedbackEnabled(): boolean {
  const env = getEnv();
  if (env.FEEDBACK_ENABLED === "false") return false;
  if (env.FEEDBACK_ENABLED === "true") return true;
  if (env.FEEDBACK_MODE === "live") {
    return Boolean(env.FEEDBACK_GITHUB_TOKEN && env.FEEDBACK_REPO);
  }
  return true;
}

import type { ComposedIssue } from "@95forward/shared";

export interface CreatedIssue {
  reference: string;
  issueNumber: number | null;
  url: string | null;
}

function syntheticReference(): string {
  return `MOCK-${Date.now().toString(36).toUpperCase()}`;
}

export async function createGithubIssue(
  issue: ComposedIssue,
  config: { mode: "mock" | "live"; token?: string; repo?: string },
): Promise<CreatedIssue> {
  if (config.mode !== "live") {
    return { reference: syntheticReference(), issueNumber: null, url: null };
  }
  if (!config.token || !config.repo) {
    throw new Error("Feedback live mode requires FEEDBACK_GITHUB_TOKEN and FEEDBACK_REPO");
  }

  const response = await fetch(`https://api.github.com/repos/${config.repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: issue.title, body: issue.body, labels: issue.labels }),
  });

  if (!response.ok) {
    throw new Error(`GitHub issue creation failed (${String(response.status)})`);
  }

  const data = (await response.json()) as { number?: number; html_url?: string };
  const issueNumber = typeof data.number === "number" ? data.number : null;
  return {
    reference: issueNumber !== null ? `#${String(issueNumber)}` : syntheticReference(),
    issueNumber,
    url: data.html_url ?? null,
  };
}

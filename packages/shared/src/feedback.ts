import type { FeedbackInput } from "./forms";

export const FEEDBACK_SOURCE_LABEL = "source:in-app";

export interface FeedbackContext {
  reporterName: string;
  reporterEmail: string;
  route: string;
  prospectId?: string;
  buildSha: string;
  timestamp: string;
  userAgent?: string;
  viewport?: string;
}

export interface ComposedIssue {
  title: string;
  body: string;
  labels: string[];
}

function section(heading: string, value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `## ${heading}\n\n${trimmed}`;
}

function contextBlock(input: FeedbackInput, ctx: FeedbackContext): string {
  const lines = [
    `- Type: ${input.kind === "bug" ? "Bug report" : "Feature request"}`,
    `- Reported by: ${ctx.reporterName} (${ctx.reporterEmail})`,
    `- Route: \`${ctx.route}\``,
  ];
  if (ctx.prospectId) lines.push(`- Prospect: \`${ctx.prospectId}\``);
  lines.push(`- Build: \`${ctx.buildSha}\``);
  lines.push(`- Reported at: ${ctx.timestamp}`);
  if (ctx.userAgent) lines.push(`- User agent: ${ctx.userAgent}`);
  if (ctx.viewport) lines.push(`- Viewport: ${ctx.viewport}`);
  return `## Context (auto-captured)\n\n${lines.join("\n")}`;
}

export function composeFeedbackIssue(input: FeedbackInput, ctx: FeedbackContext): ComposedIssue {
  const title =
    input.kind === "bug" ? `[Bug]: ${input.summary}` : `[Idea]: ${input.summary}`;

  const sections: (string | null)[] =
    input.kind === "bug"
      ? [
          section("One-line summary", input.summary),
          section("What happened?", input.whatHappened),
          section("Steps to reproduce", input.steps),
          section("Where in the app?", input.area),
          section("Where were you testing?", input.environment),
          section("How bad is it?", input.severity),
          section("Screenshots or recording", input.screenshots),
        ]
      : [
          section("One-line summary", input.summary),
          section("What would you like, and why?", input.detail),
        ];

  sections.push(contextBlock(input, ctx));

  return {
    title,
    body: sections.filter((s): s is string => s !== null).join("\n\n"),
    labels: [FEEDBACK_SOURCE_LABEL],
  };
}

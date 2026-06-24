import { describe, expect, it } from "vitest";
import { composeFeedbackIssue, FEEDBACK_SOURCE_LABEL, type FeedbackContext } from "./feedback";
import { feedbackInputSchema } from "./forms";

const ctx: FeedbackContext = {
  reporterName: "Dana Reese",
  reporterEmail: "dana.reese@waterforpeople.org",
  route: "/95-forward/prospects/4d5139c5-467f-52a6-91c7-494e51d79f43",
  prospectId: "4d5139c5-467f-52a6-91c7-494e51d79f43",
  buildSha: "a1b2c3d",
  timestamp: "2026-06-24T10:00:00.000Z",
};

describe("composeFeedbackIssue", () => {
  it("composes a bug issue with the template-mirrored sections and context block", () => {
    const input = feedbackInputSchema.parse({
      kind: "bug",
      summary: "QPI gap renders off the card edge",
      whatHappened: "The note overflows.",
      steps: "1. Open Hallworth\n2. Look at the copilot card",
      area: "Prospect record (QPI / Knowledge Base / Strategy / Visits)",
      environment: "Deployed app (ondigitalocean.app)",
      severity: "Low — cosmetic / minor",
    });

    const issue = composeFeedbackIssue(input, ctx);

    expect(issue.title).toBe("[Bug]: QPI gap renders off the card edge");
    expect(issue.body).toContain("## One-line summary");
    expect(issue.body).toContain("## What happened?");
    expect(issue.body).toContain("## Steps to reproduce");
    expect(issue.body).toContain("## Where in the app?");
    expect(issue.body).toContain("## How bad is it?");
    expect(issue.body).toContain("## Context (auto-captured)");
    expect(issue.body).toContain("- Route: `/95-forward/prospects/");
    expect(issue.body).toContain("- Build: `a1b2c3d`");
    expect(issue.body).toContain("- Reported by: Dana Reese (dana.reese@waterforpeople.org)");
    expect(issue.body).toContain("- Prospect: `4d5139c5-467f-52a6-91c7-494e51d79f43`");
    expect(issue.body).toContain("- Type: Bug report");
  });

  it("omits optional sections that are absent", () => {
    const input = feedbackInputSchema.parse({
      kind: "bug",
      summary: "x",
      whatHappened: "y",
      area: "Not sure",
      environment: "Local dev",
      severity: "Medium — annoying but usable",
    });
    const issue = composeFeedbackIssue(input, ctx);
    expect(issue.body).not.toContain("## Steps to reproduce");
    expect(issue.body).not.toContain("## Screenshots or recording");
  });

  it("composes a feature issue with the [Idea] title and its two sections", () => {
    const input = feedbackInputSchema.parse({
      kind: "feature",
      summary: "Filter by last gift amount",
      detail: "I'd like to filter so that I can prioritise.",
    });
    const issue = composeFeedbackIssue(input, ctx);
    expect(issue.title).toBe("[Idea]: Filter by last gift amount");
    expect(issue.body).toContain("## What would you like, and why?");
    expect(issue.body).toContain("- Type: Feature request");
  });

  it("applies ONLY the server-controlled source:in-app label", () => {
    const input = feedbackInputSchema.parse({
      kind: "feature",
      summary: "s",
      detail: "d",
    });
    const issue = composeFeedbackIssue(input, ctx);
    expect(issue.labels).toEqual([FEEDBACK_SOURCE_LABEL]);
    expect(issue.labels).toHaveLength(1);
  });
});

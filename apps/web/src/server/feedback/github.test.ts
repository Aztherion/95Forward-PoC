import { afterEach, describe, expect, it, vi } from "vitest";
import type { ComposedIssue } from "@95forward/shared";
import { createGithubIssue } from "./github";

const issue: ComposedIssue = {
  title: "[Bug]: x",
  body: "body",
  labels: ["source:in-app"],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createGithubIssue", () => {
  it("mock mode returns a synthetic reference and makes NO network call", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await createGithubIssue(issue, { mode: "mock" });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.issueNumber).toBeNull();
    expect(result.url).toBeNull();
    expect(result.reference).toMatch(/^MOCK-/);
  });

  it("live mode POSTs the locked payload with the token and returns the issue number", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ number: 42, html_url: "https://github.com/o/r/issues/42" }), {
        status: 201,
      }),
    );
    const result = await createGithubIssue(issue, {
      mode: "live",
      token: "secret-token",
      repo: "Aztherion/95Forward-PoC",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://api.github.com/repos/Aztherion/95Forward-PoC/issues");
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer secret-token");
    expect(JSON.parse(init?.body as string)).toEqual({
      title: "[Bug]: x",
      body: "body",
      labels: ["source:in-app"],
    });
    expect(result.reference).toBe("#42");
    expect(result.issueNumber).toBe(42);
  });

  it("live mode without token/repo throws (never silently no-ops)", async () => {
    await expect(createGithubIssue(issue, { mode: "live" })).rejects.toThrow();
  });
});

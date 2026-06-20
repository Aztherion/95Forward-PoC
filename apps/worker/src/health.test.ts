import { describe, expect, it } from "vitest";
import { buildHealthStatus } from "./health";

describe("buildHealthStatus", () => {
  it("reports the worker as ok", () => {
    const result = buildHealthStatus(new Date("2026-01-01T00:00:00.000Z"));
    expect(result).toEqual({
      status: "ok",
      service: "worker",
      timestamp: "2026-01-01T00:00:00.000Z",
    });
  });
});

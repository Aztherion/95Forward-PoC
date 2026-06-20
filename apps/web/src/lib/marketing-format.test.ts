import { describe, expect, it } from "vitest";
import {
  isMarketingChannel,
  isMarketingStatus,
  normalizeStatus,
  scheduledDateToTimestamp,
  timestampToScheduledDate,
} from "./marketing-format";

describe("isMarketingChannel", () => {
  it("accepts known channels", () => {
    expect(isMarketingChannel("email")).toBe(true);
    expect(isMarketingChannel("appeal")).toBe(true);
  });

  it("rejects unknown values and nullish input", () => {
    expect(isMarketingChannel("sms")).toBe(false);
    expect(isMarketingChannel(null)).toBe(false);
    expect(isMarketingChannel(undefined)).toBe(false);
  });
});

describe("isMarketingStatus", () => {
  it("accepts known statuses", () => {
    expect(isMarketingStatus("draft")).toBe(true);
    expect(isMarketingStatus("scheduled")).toBe(true);
    expect(isMarketingStatus("sent")).toBe(true);
  });

  it("rejects unknown values", () => {
    expect(isMarketingStatus("queued")).toBe(false);
    expect(isMarketingStatus(null)).toBe(false);
  });
});

describe("normalizeStatus", () => {
  it("returns the value when valid", () => {
    expect(normalizeStatus("sent")).toBe("sent");
  });

  it("falls back to draft for unknown or missing input", () => {
    expect(normalizeStatus("queued")).toBe("draft");
    expect(normalizeStatus(null)).toBe("draft");
    expect(normalizeStatus(undefined)).toBe("draft");
  });
});

describe("scheduledDateToTimestamp", () => {
  it("anchors a calendar day to midday UTC", () => {
    const result = scheduledDateToTimestamp("2026-03-14");
    expect(result?.toISOString()).toBe("2026-03-14T12:00:00.000Z");
  });

  it("returns null for empty, malformed, or invalid dates", () => {
    expect(scheduledDateToTimestamp(undefined)).toBeNull();
    expect(scheduledDateToTimestamp("")).toBeNull();
    expect(scheduledDateToTimestamp("03/14/2026")).toBeNull();
    expect(scheduledDateToTimestamp("2026-13-40")).toBeNull();
  });
});

describe("timestampToScheduledDate", () => {
  it("formats a date to YYYY-MM-DD in UTC", () => {
    expect(timestampToScheduledDate(new Date("2026-03-14T00:00:00.000Z"))).toBe("2026-03-14");
  });

  it("round-trips with scheduledDateToTimestamp", () => {
    const ts = scheduledDateToTimestamp("2026-07-01");
    expect(timestampToScheduledDate(ts)).toBe("2026-07-01");
  });

  it("returns an empty string for nullish input", () => {
    expect(timestampToScheduledDate(null)).toBe("");
    expect(timestampToScheduledDate(undefined)).toBe("");
  });
});

import { describe, expect, it } from "vitest";
import { followUpDueAt, heartbeatStatus, followUpLabel } from "./follow-up";

const NOW = new Date("2026-06-22T12:00:00Z");

describe("followUpDueAt", () => {
  it("is exactly 24 hours after the trigger", () => {
    const due = followUpDueAt(NOW);
    expect(due.toISOString()).toBe("2026-06-23T12:00:00.000Z");
  });
});

describe("heartbeatStatus", () => {
  it("is overdue once the due time has passed", () => {
    const due = new Date("2026-06-22T11:00:00Z");
    expect(heartbeatStatus(due, NOW)).toBe("overdue");
  });

  it("is due-soon inside the final 6 hours", () => {
    const due = new Date("2026-06-22T16:00:00Z");
    expect(heartbeatStatus(due, NOW)).toBe("due-soon");
  });

  it("is on-track when more than 6 hours remain", () => {
    const due = new Date("2026-06-23T11:00:00Z");
    expect(heartbeatStatus(due, NOW)).toBe("on-track");
  });

  it("treats the exact due moment as overdue", () => {
    expect(heartbeatStatus(NOW, NOW)).toBe("overdue");
  });
});

describe("followUpLabel", () => {
  it("counts down hours when due within a day", () => {
    expect(followUpLabel(new Date("2026-06-22T20:00:00Z"), NOW)).toBe("Due in 8h");
  });

  it("counts up overdue hours", () => {
    expect(followUpLabel(new Date("2026-06-22T09:00:00Z"), NOW)).toBe("Overdue by 3h");
  });
});

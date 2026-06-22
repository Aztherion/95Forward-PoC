import { describe, expect, it } from "vitest";
import { isTestSeamEnabled } from "./test-seam";

describe("isTestSeamEnabled (the e2e test-seam gate)", () => {
  it("is false in production regardless of E2E_TEST_MODE (the hard-wall)", () => {
    expect(isTestSeamEnabled({ NODE_ENV: "production", E2E_TEST_MODE: "true" })).toBe(false);
    expect(isTestSeamEnabled({ NODE_ENV: "production" })).toBe(false);
  });

  it("is false when E2E_TEST_MODE is unset or not 'true', even outside production", () => {
    expect(isTestSeamEnabled({ NODE_ENV: "development" })).toBe(false);
    expect(isTestSeamEnabled({ NODE_ENV: "development", E2E_TEST_MODE: "false" })).toBe(false);
    expect(isTestSeamEnabled({ NODE_ENV: "test", E2E_TEST_MODE: "1" })).toBe(false);
  });

  it("is true only when NODE_ENV!=='production' AND E2E_TEST_MODE==='true'", () => {
    expect(isTestSeamEnabled({ NODE_ENV: "development", E2E_TEST_MODE: "true" })).toBe(true);
    expect(isTestSeamEnabled({ NODE_ENV: "test", E2E_TEST_MODE: "true" })).toBe(true);
  });
});

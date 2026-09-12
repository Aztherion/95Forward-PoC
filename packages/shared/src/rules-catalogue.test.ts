// The pure half of the Rules of Robb layer (Initiative 22). The database half — persistence,
// versioning, audit, RLS — is asserted in packages/db/src/rules.test.ts against a real Postgres.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CHECK_DEFINITIONS } from "./forward-checks";
import { DEFAULT_FORWARD_SETTINGS } from "./forward-settings";
import {
  catalogue,
  catalogueEntry,
  defaultValuesFor,
  registerCatalogueEntries,
  resetCatalogue,
  resolveCatalogue,
  resolveEntry,
  validateOverrideValues,
  validateParameterValue,
  type CatalogueEntry,
} from "./rules-catalogue";
import { resetFiringSources } from "./rules-firing";
import {
  enabledCheckDefinitions,
  registerBuiltInRules,
  settingsFromCatalogue,
} from "./rules-registrations";

const SAMPLE: CatalogueEntry = {
  id: "sample-rule",
  kind: "rule",
  category: "relationship-cadence",
  label: "Sample",
  statement: "Following up is very time sensitive.",
  source: "test",
  defaultEnabled: true,
  parameters: [
    { key: "days", label: "Silent for", unit: "days", type: "number", defaultValue: 30, min: 1, max: 365 },
    {
      key: "band",
      label: "Band",
      unit: "band",
      type: "enum",
      options: ["low", "high"],
      defaultValue: "high",
    },
    {
      key: "stages",
      label: "Stages",
      unit: "stages",
      type: "enum-list",
      options: ["a", "b", "c"],
      defaultValue: ["a"],
    },
  ],
};

beforeEach(() => {
  resetCatalogue();
  resetFiringSources();
});

afterEach(() => {
  resetCatalogue();
  resetFiringSources();
});

describe("the registry", () => {
  it("is populated by registration, not by a hardcoded list", () => {
    expect(catalogue()).toHaveLength(0);
    registerCatalogueEntries([SAMPLE]);
    expect(catalogue().map((e) => e.id)).toEqual(["sample-rule"]);
  });

  it("lets an initiative re-register its own entries without complaint", () => {
    registerCatalogueEntries([SAMPLE]);
    registerCatalogueEntries([{ ...SAMPLE, label: "Sample v2" }]);
    expect(catalogue()).toHaveLength(1);
    expect(catalogueEntry("sample-rule")?.label).toBe("Sample v2");
  });

  it("refuses a duplicate id from a different initiative", () => {
    registerCatalogueEntries([SAMPLE]);
    // Rule ids are what appear on a RULE chip and what overrides reference. Two initiatives
    // claiming the same one would silently point an org's edits at the wrong predicate.
    expect(() => registerCatalogueEntries([{ ...SAMPLE, source: "I23" }])).toThrow(/duplicate/);
  });
});

describe("validation", () => {
  const spec = SAMPLE.parameters[0]!;

  it("rejects out of bounds rather than clamping", () => {
    expect(validateParameterValue(spec, 0)?.message).toContain("at least 1");
    expect(validateParameterValue(spec, 400)?.message).toContain("at most 365");
    expect(validateParameterValue(spec, 30)).toBeNull();
  });

  it("rejects a non-number, including the ones that look numeric", () => {
    expect(validateParameterValue(spec, "30")).not.toBeNull();
    expect(validateParameterValue(spec, Number.NaN)).not.toBeNull();
    expect(validateParameterValue(spec, Number.POSITIVE_INFINITY)).not.toBeNull();
  });

  it("rejects an enum value outside the options and a list containing one", () => {
    expect(validateParameterValue(SAMPLE.parameters[1]!, "medium")).not.toBeNull();
    expect(validateParameterValue(SAMPLE.parameters[2]!, ["a", "z"])?.message).toContain("z");
    expect(validateParameterValue(SAMPLE.parameters[2]!, [])).toBeNull();
  });

  it("rejects a key that is not a parameter of the entry", () => {
    const errors = validateOverrideValues(SAMPLE, { nonsense: 1 });
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain("not a parameter");
  });
});

describe("resolution", () => {
  it("returns the shipped defaults when there is no override", () => {
    const resolved = resolveEntry(SAMPLE);
    expect(resolved.values).toEqual(defaultValuesFor(SAMPLE));
    expect(resolved.enabled).toBe(true);
    expect(resolved.statementOverridden).toBe(false);
    expect(resolved.changedParameterKeys).toEqual([]);
  });

  it("layers an override on top and says exactly what changed", () => {
    const resolved = resolveEntry(SAMPLE, {
      ruleId: SAMPLE.id,
      parameterValues: { days: 14 },
      statement: "Ours.",
      enabled: false,
    });
    expect(resolved.values["days"]).toBe(14);
    expect(resolved.values["band"]).toBe("high");
    expect(resolved.changedParameterKeys).toEqual(["days"]);
    expect(resolved.statement).toBe("Ours.");
    expect(resolved.statementOverridden).toBe(true);
    expect(resolved.enabled).toBe(false);
    expect(resolved.enabledOverridden).toBe(true);
  });

  it("falls back to the default when a stored value no longer validates", () => {
    // The realistic case: a release tightens a bound, or drops an enum option. The org's old value
    // is no longer something the code can honour, and propagating it would break the screens.
    const resolved = resolveEntry(SAMPLE, {
      ruleId: SAMPLE.id,
      parameterValues: { days: 9_999, band: "gone" },
    });
    expect(resolved.values["days"]).toBe(30);
    expect(resolved.values["band"]).toBe("high");
    expect(resolved.changedParameterKeys).toEqual([]);
  });

  it("ignores an override for a rule that is not registered", () => {
    registerCatalogueEntries([SAMPLE]);
    const resolved = resolveCatalogue([
      { ruleId: "sample-rule", parameterValues: { days: 7 } },
      { ruleId: "a-rule-from-the-future", parameterValues: { whatever: 1 } },
    ]);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.values["days"]).toBe(7);
  });
});

describe("the built-in registrations", () => {
  beforeEach(() => registerBuiltInRules());

  it("reproduces the shipped settings exactly when nothing is overridden", () => {
    const settings = settingsFromCatalogue(resolveCatalogue([]));
    expect(settings.coverageMultiple).toBe(DEFAULT_FORWARD_SETTINGS.coverageMultiple);
    expect(settings.sellingDaysPerWeek).toBe(DEFAULT_FORWARD_SETTINGS.sellingDaysPerWeek);
    expect(settings.sellingHoursPerDay).toBe(DEFAULT_FORWARD_SETTINGS.sellingHoursPerDay);
    expect(settings.simulation).toEqual(DEFAULT_FORWARD_SETTINGS.simulation);
    expect(settings.checks).toEqual(DEFAULT_FORWARD_SETTINGS.checks);
  });

  it("gives every I20 check an entry, and every entry a home in a category", () => {
    const ruleIds = catalogue()
      .filter((e) => e.kind === "rule")
      .map((e) => e.id);
    for (const check of CHECK_DEFINITIONS) {
      expect(ruleIds, check.id).toContain(check.id);
    }
    expect(catalogue().every((e) => e.category.length > 0)).toBe(true);
  });

  it("gives every rule an effort estimate, because the three-minute promise sums them", () => {
    for (const entry of catalogue().filter((e) => e.kind === "rule")) {
      expect(entry.parameters.map((p) => p.key), entry.id).toContain("effortSeconds");
    }
  });

  it("routes an edited effort estimate back into the settings the engine reads", () => {
    const settings = settingsFromCatalogue(
      resolveCatalogue([
        { ruleId: "close-date-past-stage-open", parameterValues: { effortSeconds: 300 } },
      ]),
    );
    expect(settings.checks.effortSeconds["close-date-past-stage-open"]).toBe(300);
    // Untouched checks keep theirs.
    expect(settings.checks.effortSeconds["missing-forecast-inputs"]).toBe(
      DEFAULT_FORWARD_SETTINGS.checks.effortSeconds["missing-forecast-inputs"],
    );
  });

  it("drops a disabled rule from the set the check engine runs", () => {
    const all = enabledCheckDefinitions(resolveCatalogue([]));
    expect(all).toHaveLength(CHECK_DEFINITIONS.length);

    const fewer = enabledCheckDefinitions(
      resolveCatalogue([{ ruleId: "status-stage-disagreement", enabled: false }]),
    );
    expect(fewer).toHaveLength(CHECK_DEFINITIONS.length - 1);
    expect(fewer.some((c) => c.id === "status-stage-disagreement")).toBe(false);
  });

  it("keeps ask-maturation-weeks visible but off, since nothing implements it yet", () => {
    const entry = catalogueEntry("ask-maturation-weeks");
    expect(entry?.defaultEnabled).toBe(false);
    expect(entry?.readBy?.join(" ")).toMatch(/nothing yet/);
  });
});

// 95 Forward — the Rules of Robb catalogue (Initiative 22).
//
// THE CENTRAL CONSTRAINT: CATALOGUE IS CODE, DOCTRINE IS DATA.
//
// An org can change whether a rule is active, what its parameters are set to, the plain-language
// sentence users read, and the priority order of its goals. An org CANNOT author new predicate
// logic — there is no DSL, no visual builder, no free text compiled into behaviour.
//
// That is a deliberate limit, not a missing feature. "Write English and the AI works out what you
// meant" is a black box with extra steps: non-deterministic, unexplainable, and unable to answer
// "show me everything this rule is firing on" with any confidence. The entire value of the RULE
// chip is that it leads somewhere a human can read, verify and predict. A free-text rule engine
// would destroy exactly the property the chip promises.
//
// The escape hatch is `proposed_rules`: doctrine we have not implemented gets captured verbatim,
// listed for review, and marked inactive until a human implements it as a built-in.

// -------------------------------------------------------------------------------------------
// Shapes
// -------------------------------------------------------------------------------------------

export type CatalogueEntryKind =
  /** A tunable constant with no predicate — absorbed from the I19/I20/I21 settings module. */
  | "parameter"
  /** A predicate that fires on opportunities. Its id is what appears on a RULE chip. */
  | "rule";

export type CatalogueCategory =
  | "forecast-hygiene"
  | "relationship-cadence"
  | "forecasting-parameters"
  | "coverage-parameters";

export type ParameterType = "number" | "enum" | "enum-list";

export interface ParameterSpec {
  /** Unique within its entry. */
  readonly key: string;
  readonly label: string;
  readonly unit: string;
  readonly type: ParameterType;
  readonly defaultValue: number | string | readonly string[];
  /** Inclusive bounds for `number`. Violations are REJECTED, never clamped. */
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  /** Allowed values for `enum` / `enum-list`. */
  readonly options?: readonly string[];
  readonly description?: string;
}

export interface CatalogueEntry {
  /** Stable. Appears on RULE chips and is referenced by overrides — changing one is breaking. */
  readonly id: string;
  readonly kind: CatalogueEntryKind;
  readonly category: CatalogueCategory;
  readonly label: string;
  /** The plain-language sentence the org reads and may rewrite. THIS is the doctrine. */
  readonly statement: string;
  readonly parameters: readonly ParameterSpec[];
  readonly defaultEnabled: boolean;
  /** Which initiative implements it, so a reader knows where the behaviour lives. */
  readonly source: string;
  /** For `parameter` entries there is nothing to fire — this says what consumes the value. */
  readonly readBy?: readonly string[];
}

// -------------------------------------------------------------------------------------------
// Registry
// -------------------------------------------------------------------------------------------
//
// Registration, not a hardcoded list — the same pattern I20 used for consequence evaluators, which
// worked. It means this module does not need to know about rules that do not exist yet: I23 calls
// `registerCatalogueEntries` with its ranking rules and they appear in the editor, in `firingFor`
// and in the override machinery with no change here.

const registry = new Map<string, CatalogueEntry>();

export function registerCatalogueEntries(entries: readonly CatalogueEntry[]): void {
  for (const entry of entries) {
    const existing = registry.get(entry.id);
    if (existing && existing.source !== entry.source) {
      throw new Error(
        `registerCatalogueEntries: duplicate rule id "${entry.id}" from ${entry.source} — ` +
          `already registered by ${existing.source}. Rule ids are stable identifiers; pick another.`,
      );
    }
    registry.set(entry.id, entry);
  }
}

export function catalogue(): readonly CatalogueEntry[] {
  return [...registry.values()].sort(
    (a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id),
  );
}

export function catalogueEntry(id: string): CatalogueEntry | undefined {
  return registry.get(id);
}

/** Test-support only: the registry is module-global, so suites need to reset it. */
export function resetCatalogue(): void {
  registry.clear();
}

// -------------------------------------------------------------------------------------------
// Validation — reject, never clamp
// -------------------------------------------------------------------------------------------

export interface ValidationError {
  readonly parameterKey: string;
  readonly message: string;
}

/**
 * A coverage multiple of 0 or -3 breaks every metric downstream, and silently: the ratio becomes
 * infinite or negative and the screens render nonsense rather than an error. Clamping would hide
 * that the org asked for something impossible, so out-of-bounds values are refused.
 */
export function validateParameterValue(
  spec: ParameterSpec,
  value: unknown,
): ValidationError | null {
  const fail = (message: string): ValidationError => ({ parameterKey: spec.key, message });

  if (spec.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return fail(`${spec.label} must be a number.`);
    }
    if (spec.min !== undefined && value < spec.min) {
      return fail(`${spec.label} must be at least ${spec.min} ${spec.unit}.`);
    }
    if (spec.max !== undefined && value > spec.max) {
      return fail(`${spec.label} must be at most ${spec.max} ${spec.unit}.`);
    }
    return null;
  }

  if (spec.type === "enum") {
    if (typeof value !== "string" || !(spec.options ?? []).includes(value)) {
      return fail(`${spec.label} must be one of: ${(spec.options ?? []).join(", ")}.`);
    }
    return null;
  }

  // enum-list
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
    return fail(`${spec.label} must be a list of values.`);
  }
  const unknown = value.filter((v) => !(spec.options ?? []).includes(v as string));
  if (unknown.length > 0) {
    return fail(`${spec.label} contains unknown values: ${unknown.join(", ")}.`);
  }
  return null;
}

export function validateOverrideValues(
  entry: CatalogueEntry,
  values: Readonly<Record<string, unknown>>,
): readonly ValidationError[] {
  const errors: ValidationError[] = [];
  for (const [key, value] of Object.entries(values)) {
    const spec = entry.parameters.find((p) => p.key === key);
    if (!spec) {
      errors.push({ parameterKey: key, message: `"${key}" is not a parameter of ${entry.id}.` });
      continue;
    }
    const error = validateParameterValue(spec, value);
    if (error) errors.push(error);
  }
  return errors;
}

// -------------------------------------------------------------------------------------------
// Overrides
// -------------------------------------------------------------------------------------------

/**
 * Code provides defaults; the database stores only overrides.
 *
 * An org that has changed nothing has no rows at all, which means raising a default in a later
 * release actually reaches them rather than being shadowed by a copy of the old value.
 */
export interface RuleOverride {
  readonly ruleId: string;
  readonly enabled?: boolean | null;
  readonly parameterValues?: Readonly<Record<string, unknown>> | null;
  readonly statement?: string | null;
}

export interface ResolvedEntry extends CatalogueEntry {
  readonly enabled: boolean;
  /** Effective values, defaults merged with overrides. */
  readonly values: Readonly<Record<string, number | string | readonly string[]>>;
  readonly statementOverridden: boolean;
  readonly changedParameterKeys: readonly string[];
  readonly enabledOverridden: boolean;
}

export function defaultValuesFor(entry: CatalogueEntry): Record<string, ParameterSpec["defaultValue"]> {
  const values: Record<string, ParameterSpec["defaultValue"]> = {};
  for (const spec of entry.parameters) values[spec.key] = spec.defaultValue;
  return values;
}

export function resolveEntry(entry: CatalogueEntry, override?: RuleOverride): ResolvedEntry {
  const defaults = defaultValuesFor(entry);
  const overridden = override?.parameterValues ?? {};
  const values: Record<string, ParameterSpec["defaultValue"]> = { ...defaults };
  const changed: string[] = [];

  for (const spec of entry.parameters) {
    if (!(spec.key in overridden)) continue;
    const candidate = overridden[spec.key];
    // A stored value that no longer validates (bounds tightened in a release, an option removed)
    // falls back to the default rather than propagating a value the code cannot honour.
    if (validateParameterValue(spec, candidate)) continue;
    values[spec.key] = candidate as ParameterSpec["defaultValue"];
    changed.push(spec.key);
  }

  return {
    ...entry,
    statement: override?.statement ?? entry.statement,
    statementOverridden: typeof override?.statement === "string",
    enabled: override?.enabled ?? entry.defaultEnabled,
    enabledOverridden: typeof override?.enabled === "boolean",
    values,
    changedParameterKeys: changed,
  };
}

export function resolveCatalogue(
  overrides: readonly RuleOverride[],
): readonly ResolvedEntry[] {
  const byId = new Map(overrides.map((o) => [o.ruleId, o]));
  return catalogue().map((entry) => resolveEntry(entry, byId.get(entry.id)));
}

export const CATEGORY_LABELS: Record<CatalogueCategory, string> = {
  "forecast-hygiene": "Forecast hygiene",
  "relationship-cadence": "Relationship cadence",
  "forecasting-parameters": "Forecasting parameters",
  "coverage-parameters": "Coverage and capacity",
};

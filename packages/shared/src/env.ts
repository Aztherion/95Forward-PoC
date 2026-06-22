import { z } from "zod";

// Shared by both runtimes (web + worker): connection, logging, and the Initiative 6 AI provider
// selection. Auth0 lives only in the web schema; the worker has no user-facing auth surface.
const baseEnvShape = {
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(["local", "ci", "staging", "production"]).default("local"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .url("DATABASE_URL must be a valid connection URL"),

  // Initiative 6 (AI Foundation). Keys are optional in mock mode (CI/local without keys) and
  // required in live mode — the shared refinement below enforces that.
  AI_MODE: z.enum(["mock", "live"]).default("mock"),
  EMBEDDING_MODE: z.enum(["mock", "live"]).optional(),
  RESEARCH_MODE: z.enum(["demo", "live"]).default("demo"),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  EMBEDDINGS_MODEL: z.string().min(1).default("text-embedding-3-small"),
};

function applyAiKeyRefinement(
  env: {
    AI_MODE: "mock" | "live";
    EMBEDDING_MODE?: "mock" | "live";
    RESEARCH_MODE: "demo" | "live";
    ANTHROPIC_API_KEY?: string;
    OPENAI_API_KEY?: string;
  },
  ctx: z.RefinementCtx,
): void {
  // The chat model and the live web-search research provider both use the Anthropic key, so either
  // one running live requires it.
  if ((env.AI_MODE === "live" || env.RESEARCH_MODE === "live") && !env.ANTHROPIC_API_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ANTHROPIC_API_KEY"],
      message: "ANTHROPIC_API_KEY is required when AI_MODE=live or RESEARCH_MODE=live",
    });
  }
  const embeddingMode = env.EMBEDDING_MODE ?? env.AI_MODE;
  if (embeddingMode === "live" && !env.OPENAI_API_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["OPENAI_API_KEY"],
      message: "OPENAI_API_KEY is required when embeddings run in live mode",
    });
  }
}

// Web runtime: the base + Auth0 (Initiative 1) + the dev-login security gate. Names match what
// @auth0/nextjs-auth0 v4 reads. This is the canonical app Env consumed across apps/web.
export const webEnvSchema = z
  .object({
    ...baseEnvShape,
    WORKER_PORT: z.coerce.number().int().positive().max(65535).default(3001),
    AUTH0_DOMAIN: z.string().min(1, "AUTH0_DOMAIN is required"),
    AUTH0_CLIENT_ID: z.string().min(1, "AUTH0_CLIENT_ID is required"),
    AUTH0_CLIENT_SECRET: z.string().min(1, "AUTH0_CLIENT_SECRET is required"),
    AUTH0_SECRET: z.string().min(1, "AUTH0_SECRET is required"),
    APP_BASE_URL: z.string().url("APP_BASE_URL must be a valid URL"),
    // Security gate: enables a deterministic dev/test login route (Playwright/CI) that mints a
    // session cookie without a live Auth0 tenant. Never honored when NODE_ENV=production.
    AUTH_DEV_LOGIN: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
  })
  .superRefine(applyAiKeyRefinement);

// Worker runtime (Initiative 11): the base + the Graphile Worker / queue config + the RLS app
// pool URL. No Auth0 vars — the worker carries no user-facing auth surface.
export const workerEnvSchema = z
  .object({
    ...baseEnvShape,
    WORKER_PORT: z.coerce.number().int().positive().max(65535).default(3001),
    APP_DATABASE_URL: z
      .string()
      .min(1, "APP_DATABASE_URL is required")
      .url("APP_DATABASE_URL must be a valid connection URL"),
    JOBS_CONCURRENCY: z.coerce.number().int().positive().max(100).default(3),
    JOBS_SCHEMA: z.string().min(1).default("graphile_worker"),
  })
  .superRefine(applyAiKeyRefinement);

// Backwards-compatible alias: the web schema is the canonical app env.
export const envSchema = webEnvSchema;

export type Env = z.infer<typeof webEnvSchema>;
export type WorkerEnv = z.infer<typeof workerEnvSchema>;

// EMBEDDING_MODE falls back to AI_MODE when unset, so live embeddings can be enabled independently.
export function resolveEmbeddingMode(
  env: Pick<Env, "AI_MODE" | "EMBEDDING_MODE">,
): "mock" | "live" {
  return env.EMBEDDING_MODE ?? env.AI_MODE;
}

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

export function parseEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = webEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${formatIssues(parsed.error)}`);
  }
  return parsed.data;
}

export function parseWorkerEnv(
  source: Record<string, string | undefined> = process.env,
): WorkerEnv {
  const parsed = workerEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid worker environment variables:\n${formatIssues(parsed.error)}`);
  }
  return parsed.data;
}

let cached: Env | undefined;
let cachedWorker: WorkerEnv | undefined;

export function getEnv(): Env {
  if (cached === undefined) cached = parseEnv();
  return cached;
}

export function getWorkerEnv(): WorkerEnv {
  if (cachedWorker === undefined) cachedWorker = parseWorkerEnv();
  return cachedWorker;
}

export function resetEnvCache(): void {
  cached = undefined;
  cachedWorker = undefined;
}

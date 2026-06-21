import { z } from "zod";

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_ENV: z.enum(["local", "ci", "staging", "production"]).default("local"),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL is required")
      .url("DATABASE_URL must be a valid connection URL"),

    WORKER_PORT: z.coerce.number().int().positive().max(65535).default(3001),

    // Auth0 (Initiative 1) — required. Names match what @auth0/nextjs-auth0 v4 reads.
    AUTH0_DOMAIN: z.string().min(1, "AUTH0_DOMAIN is required"),
    AUTH0_CLIENT_ID: z.string().min(1, "AUTH0_CLIENT_ID is required"),
    AUTH0_CLIENT_SECRET: z.string().min(1, "AUTH0_CLIENT_SECRET is required"),
    AUTH0_SECRET: z.string().min(1, "AUTH0_SECRET is required"),
    APP_BASE_URL: z.string().url("APP_BASE_URL must be a valid URL"),

    // Security gate: enables a deterministic dev/test login route (Playwright/CI)
    // that mints a session cookie without a live Auth0 tenant. Never honored when
    // NODE_ENV=production.
    AUTH_DEV_LOGIN: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),

    // Initiative 6 (AI Foundation). Keys are optional in mock mode (CI/local without keys) and
    // required in live mode — the superRefine below enforces that, mirroring AUTH_DEV_LOGIN gating.
    AI_MODE: z.enum(["mock", "live"]).default("mock"),
    EMBEDDING_MODE: z.enum(["mock", "live"]).optional(),
    RESEARCH_MODE: z.enum(["demo", "live"]).default("demo"),
    ANTHROPIC_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    EMBEDDINGS_MODEL: z.string().min(1).default("text-embedding-3-small"),

    // Placeholder for LATER initiative — intentionally optional now:
    //   Initiative 11 (jobs): JOBS_CONCURRENCY, JOBS_SCHEMA (Graphile Worker reuses DATABASE_URL)
  })
  .superRefine((env, ctx) => {
    if (env.AI_MODE === "live" && !env.ANTHROPIC_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ANTHROPIC_API_KEY"],
        message: "ANTHROPIC_API_KEY is required when AI_MODE=live",
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
  });

export type Env = z.infer<typeof envSchema>;

// EMBEDDING_MODE falls back to AI_MODE when unset, so live embeddings can be enabled independently.
export function resolveEmbeddingMode(
  env: Pick<Env, "AI_MODE" | "EMBEDDING_MODE">,
): "mock" | "live" {
  return env.EMBEDDING_MODE ?? env.AI_MODE;
}

export function parseEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached === undefined) cached = parseEnv();
  return cached;
}

export function resetEnvCache(): void {
  cached = undefined;
}

import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(["local", "ci", "staging", "production"]).default("local"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .url("DATABASE_URL must be a valid connection URL"),

  WORKER_PORT: z.coerce.number().int().positive().max(65535).default(3001),

  // Placeholders for LATER initiatives — intentionally optional now; promote to
  // required as each lands:
  //   Initiative 1 (Auth0): AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET, APP_BASE_URL
  //   Initiative 6 (AI):    ANTHROPIC_API_KEY, OPENAI_API_KEY, EMBEDDINGS_MODEL
  //   Initiative 11 (jobs): JOBS_CONCURRENCY, JOBS_SCHEMA (Graphile Worker reuses DATABASE_URL)
});

export type Env = z.infer<typeof envSchema>;

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

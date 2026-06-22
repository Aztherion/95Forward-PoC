import { execFileSync } from "node:child_process";

function globalSetup(): void {
  // Run the real guarded-reset entrypoint as a subprocess rather than importing @95forward/db into
  // the Playwright runner: the db source graph (drizzle/pg) does not load cleanly under Playwright's
  // module loader, and the subprocess reuses the exact truncate-and-reseed path the runbook documents.
  //
  // RESEARCH_MODE is defaulted to demo only when unset — an explicit RESEARCH_MODE=live is left
  // intact so the reset guard still refuses (a developer pointed at a live DB must opt in by setting
  // demo themselves). The Playwright webServer already runs the app with RESEARCH_MODE=demo.
  execFileSync("pnpm", ["--filter", "@95forward/db", "reset", "--confirm"], {
    stdio: "inherit",
    env: {
      ...process.env,
      ALLOW_DESTRUCTIVE_RESET: "true",
      RESEARCH_MODE: process.env.RESEARCH_MODE ?? "demo",
      DATABASE_URL: process.env.DATABASE_URL ?? "postgres://forward:forward@localhost:5432/forward",
    },
  });
}

export default globalSetup;

import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { getWorkerEnv } from "@95forward/shared";
import { AppModule } from "./app.module";
import { startWorker } from "./jobs";

async function bootstrap(): Promise<void> {
  const env = getWorkerEnv();
  const app = await NestFactory.create(AppModule);
  await app.listen(env.WORKER_PORT);
  console.log(`[worker] listening on :${env.WORKER_PORT} (${env.APP_ENV})`);

  const worker = await startWorker(env);
  console.log(`[worker] graphile-worker draining queue (schema=${env.JOBS_SCHEMA})`);

  const shutdown = (signal: string): void => {
    console.log(`[worker] ${signal} received — shutting down`);
    void worker
      .stop()
      .then(() => app.close())
      .then(() => process.exit(0))
      .catch((error: unknown) => {
        console.error("[worker] shutdown failed", error);
        process.exit(1);
      });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

void bootstrap();

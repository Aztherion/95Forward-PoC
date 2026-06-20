import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { getEnv } from "@95forward/shared";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const env = getEnv();
  const app = await NestFactory.create(AppModule);
  await app.listen(env.WORKER_PORT);
  console.log(`[worker] listening on :${env.WORKER_PORT} (${env.APP_ENV})`);
}

void bootstrap();

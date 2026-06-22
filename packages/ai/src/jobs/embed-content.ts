import type { Database } from "@95forward/db";
import { embedAndStore } from "../embeddings";
import type { Providers } from "../types";

export interface EmbedJobPayload {
  tenantId: string;
  force?: boolean;
}

export interface EmbedJobContext {
  db: Database;
  providers: Providers;
}

// Durable re-embed job (Initiative 11): moves the previously synchronous embedding work onto the
// queue. embedAndStore already scopes via withTenant and only re-embeds rows whose embedded_at is
// null (unless force), so a Graphile retry is naturally idempotent — re-running embeds nothing new.
export async function runEmbedContentJob(
  payload: EmbedJobPayload,
  ctx: EmbedJobContext,
): Promise<void> {
  await embedAndStore(ctx.db, ctx.providers.embedding, payload.tenantId, payload.force ?? false);
}

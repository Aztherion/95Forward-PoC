CREATE TABLE "copilot_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"proposal_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"payload" jsonb NOT NULL,
	"provenance" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" smallint,
	"task_type" text,
	"origin" text DEFAULT 'copilot' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"decided_by_user_id" uuid,
	"decided_at" timestamp with time zone,
	"applied" boolean DEFAULT false NOT NULL,
	"applied_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copilot_proposals_confidence_chk" CHECK ("copilot_proposals"."confidence" is null or ("copilot_proposals"."confidence" between 0 and 100))
);
--> statement-breakpoint
ALTER TABLE "constituents" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "constituents" ADD COLUMN "embedding_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "constituents" ADD COLUMN "embedded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "embedding_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "embedded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "embedding_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "embedded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "copilot_proposals" ADD CONSTRAINT "copilot_proposals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_proposals" ADD CONSTRAINT "copilot_proposals_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_proposals" ADD CONSTRAINT "copilot_proposals_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "copilot_proposals_tenant_id_idx" ON "copilot_proposals" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "copilot_proposals_subject_idx" ON "copilot_proposals" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "copilot_proposals_status_idx" ON "copilot_proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "copilot_proposals_created_by_idx" ON "copilot_proposals" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "constituents_embedding_hnsw_idx" ON "constituents" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "interactions_embedding_hnsw_idx" ON "interactions" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "knowledge_base_embedding_hnsw_idx" ON "knowledge_base" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "copilot_proposals" TO app_user;--> statement-breakpoint
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND a.attname = 'tenant_id'
      AND a.attnum > 0
      AND NOT a.attisdropped
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', r.tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I TO app_user '
      'USING (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) '
      'WITH CHECK (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
      r.tbl
    );
  END LOOP;
END $$;
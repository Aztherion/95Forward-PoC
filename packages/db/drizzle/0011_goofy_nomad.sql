CREATE TABLE "research_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prospect_id" uuid NOT NULL,
	"research_gap_id" uuid,
	"status" "discovery_status" DEFAULT 'queued' NOT NULL,
	"requested_by_user_id" uuid,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"checkpoint" jsonb,
	"error" text,
	"origin_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "copilot_proposals" ADD COLUMN "origin_key" text;--> statement-breakpoint
ALTER TABLE "research_jobs" ADD CONSTRAINT "research_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_jobs" ADD CONSTRAINT "research_jobs_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_jobs" ADD CONSTRAINT "research_jobs_research_gap_id_research_gaps_id_fk" FOREIGN KEY ("research_gap_id") REFERENCES "public"."research_gaps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_jobs" ADD CONSTRAINT "research_jobs_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "research_jobs_tenant_id_idx" ON "research_jobs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "research_jobs_prospect_id_idx" ON "research_jobs" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "research_jobs_research_gap_id_idx" ON "research_jobs" USING btree ("research_gap_id");--> statement-breakpoint
CREATE INDEX "research_jobs_status_idx" ON "research_jobs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "copilot_proposals_origin_key_unique" ON "copilot_proposals" USING btree ("origin_key") WHERE "copilot_proposals"."origin_key" IS NOT NULL;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "research_jobs" TO app_user;--> statement-breakpoint
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
CREATE TABLE "opportunity_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"audience" text NOT NULL,
	"subject" text,
	"generated_text" text NOT NULL,
	"final_text" text NOT NULL,
	"edited" boolean DEFAULT false NOT NULL,
	"edited_percent" integer DEFAULT 0 NOT NULL,
	"regenerated_count" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"actor_user_id" uuid,
	"actor_name" text,
	"provider" text DEFAULT 'mock' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_drafts_unique_kind" UNIQUE("tenant_id","opportunity_id","kind")
);
--> statement-breakpoint
ALTER TABLE "funding_initiatives" ADD COLUMN "short_name" text;--> statement-breakpoint
ALTER TABLE "opportunity_drafts" ADD CONSTRAINT "opportunity_drafts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_drafts" ADD CONSTRAINT "opportunity_drafts_opportunity_id_forward_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."forward_opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_drafts" ADD CONSTRAINT "opportunity_drafts_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "opportunity_drafts_tenant_id_idx" ON "opportunity_drafts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "opportunity_drafts_opportunity_id_idx" ON "opportunity_drafts" USING btree ("opportunity_id");
--> statement-breakpoint
-- ------------------------------------------------------------------------------------------------
-- RLS, by hand. drizzle-kit does not emit policies, so a new tenant-scoped table arrives readable
-- across tenants by `app_user` while every other table is not — the worst kind of gap, because
-- nothing fails and nothing looks wrong. This is the FOURTH migration where that has mattered.
--
-- `opportunity_drafts` holds donor correspondence, so a leak here is not a row count: it is one
-- organisation reading another's letters to its donors.
--
-- Idempotent and deliberately not narrowed to the new table, so anything missed earlier is picked
-- up here. Same block as 0012/0013/0014/0015.
-- ------------------------------------------------------------------------------------------------
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

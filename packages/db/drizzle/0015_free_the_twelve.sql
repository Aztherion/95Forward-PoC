CREATE TYPE "public"."queue_decision_kind" AS ENUM('pin', 'dismiss');--> statement-breakpoint
ALTER TYPE "public"."opportunity_event_type" ADD VALUE 'guidance_pinned';--> statement-breakpoint
ALTER TYPE "public"."opportunity_event_type" ADD VALUE 'guidance_dismissed';--> statement-breakpoint
CREATE TABLE "queue_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"rule_id" text,
	"kind" "queue_decision_kind" NOT NULL,
	"data_version" text NOT NULL,
	"decided_by_user_id" uuid,
	"decided_by_name" text,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "queue_decisions_unique" UNIQUE("tenant_id","opportunity_id","rule_id","kind")
);
--> statement-breakpoint
ALTER TABLE "natural_partners" ADD COLUMN "intro_offered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "natural_partners" ADD COLUMN "intro_used_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "natural_partners" ADD COLUMN "asked_to_open_door_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "queue_decisions" ADD CONSTRAINT "queue_decisions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_decisions" ADD CONSTRAINT "queue_decisions_opportunity_id_forward_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."forward_opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_decisions" ADD CONSTRAINT "queue_decisions_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "queue_decisions_tenant_id_idx" ON "queue_decisions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "queue_decisions_opportunity_id_idx" ON "queue_decisions" USING btree ("opportunity_id");--> statement-breakpoint
-- ------------------------------------------------------------------------------------------------
-- `rule_id` is nullable, and Postgres treats NULLs as DISTINCT in a unique constraint — so
-- `queue_decisions_unique` above does NOT stop a second "dismiss this whole queue item" row. One
-- partial index per kind closes that: with rule_id NULL the pair (opportunity, kind) is the key.
-- Without this, "is this pinned?" silently becomes a question about row counts.
-- ------------------------------------------------------------------------------------------------
CREATE UNIQUE INDEX "queue_decisions_item_unique"
  ON "queue_decisions" ("tenant_id", "opportunity_id", "kind")
  WHERE "rule_id" IS NULL;--> statement-breakpoint
-- ------------------------------------------------------------------------------------------------
-- Row-Level Security for `queue_decisions`.
--
-- drizzle-kit does NOT generate this. Every tenant-scoped table added by a migration must re-run the
-- loop, or the new table is readable across tenants by `app_user` while every existing table is not
-- — the worst kind of gap, because nothing fails and nothing looks wrong.
--
-- Idempotent and deliberately not narrowed to the new table, so anything missed by an earlier
-- migration is picked up here. Same block as 0012/0013/0014.
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

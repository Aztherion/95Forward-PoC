CREATE TABLE "proposed_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"statement" text NOT NULL,
	"note" text,
	"status" text DEFAULT 'captured' NOT NULL,
	"proposed_by_user_id" uuid,
	"proposed_by_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rule_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"rule_id" text NOT NULL,
	"field" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"actor_user_id" uuid,
	"actor_name" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rule_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"statement" text NOT NULL,
	"priority" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rule_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"rule_id" text NOT NULL,
	"enabled" boolean,
	"parameter_values" jsonb,
	"statement" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rule_overrides_tenant_rule_unique" UNIQUE("tenant_id","rule_id")
);
--> statement-breakpoint
CREATE TABLE "rule_versions" (
	"tenant_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rule_versions_tenant_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
ALTER TABLE "proposed_rules" ADD CONSTRAINT "proposed_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposed_rules" ADD CONSTRAINT "proposed_rules_proposed_by_user_id_users_id_fk" FOREIGN KEY ("proposed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_changes" ADD CONSTRAINT "rule_changes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_changes" ADD CONSTRAINT "rule_changes_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_goals" ADD CONSTRAINT "rule_goals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_overrides" ADD CONSTRAINT "rule_overrides_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_versions" ADD CONSTRAINT "rule_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "proposed_rules_tenant_id_idx" ON "proposed_rules" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "proposed_rules_status_idx" ON "proposed_rules" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rule_changes_tenant_id_idx" ON "rule_changes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "rule_changes_rule_id_idx" ON "rule_changes" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "rule_changes_changed_at_idx" ON "rule_changes" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "rule_goals_tenant_id_idx" ON "rule_goals" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "rule_goals_priority_idx" ON "rule_goals" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "rule_overrides_tenant_id_idx" ON "rule_overrides" USING btree ("tenant_id");--> statement-breakpoint
-- ------------------------------------------------------------------------------------------------
-- Row-Level Security for the five tables above.
--
-- drizzle-kit does NOT generate this. Every tenant-scoped table added by a migration must re-run the
-- loop, or the new tables are readable across tenants by `app_user` while every existing table is
-- not — the worst kind of gap, because nothing fails and nothing looks wrong.
--
-- The loop is idempotent: it re-enables RLS and recreates the `tenant_isolation` policy on every
-- table that has a `tenant_id` column, including the ones that already had it. Copied verbatim from
-- 0012/0013 rather than narrowed to the new tables, so a table missed in a future migration is
-- picked up by the next one.
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

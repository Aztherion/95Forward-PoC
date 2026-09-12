CREATE TYPE "public"."date_confidence" AS ENUM('firm', 'semi_firm', 'loose');--> statement-breakpoint
CREATE TYPE "public"."forward_opportunity_status" AS ENUM('open', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."forward_stage" AS ENUM('get_the_visit', 'prep_the_visit', 'visit_and_ask', 'follow_up_and_close', 'celebrate_steward', 'repeat');--> statement-breakpoint
CREATE TYPE "public"."goal_scope" AS ENUM('org', 'rep', 'initiative');--> statement-breakpoint
CREATE TYPE "public"."milestone_source" AS ENUM('they_said', 'we_said');--> statement-breakpoint
CREATE TYPE "public"."opportunity_event_type" AS ENUM('field_change', 'contact_logged', 'milestone_confirmed', 'stage_change', 'note');--> statement-breakpoint
CREATE TYPE "public"."probability_band" AS ENUM('longshot', 'medium', 'high', 'bookable', 'lock');--> statement-breakpoint
CREATE TYPE "public"."visit_rating" AS ENUM('poor', 'mixed', 'good', 'strong');--> statement-breakpoint
CREATE TABLE "forward_opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prospect_id" uuid NOT NULL,
	"initiative_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"amount_note" text,
	"close_date" date,
	"date_confidence" date_confidence DEFAULT 'semi_firm' NOT NULL,
	"stage" "forward_stage" DEFAULT 'get_the_visit' NOT NULL,
	"probability" "probability_band" DEFAULT 'medium' NOT NULL,
	"visit_rating" "visit_rating",
	"owner_user_id" uuid,
	"status" "forward_opportunity_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"scope" "goal_scope" NOT NULL,
	"scope_ref_id" uuid NOT NULL,
	"fiscal_period" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goals_scope_period_unique" UNIQUE("tenant_id","scope","scope_ref_id","fiscal_period")
);
--> statement-breakpoint
CREATE TABLE "milestone_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"source" "milestone_source" NOT NULL,
	"blocking" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "milestone_definitions_tenant_key_unique" UNIQUE("tenant_id","key")
);
--> statement-breakpoint
CREATE TABLE "opportunity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"event_type" "opportunity_event_type" NOT NULL,
	"field" text,
	"old_value" text,
	"new_value" text,
	"actor_user_id" uuid,
	"actor_name" text,
	"prospect_sourced" boolean DEFAULT false NOT NULL,
	"note" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"milestone_definition_id" uuid NOT NULL,
	"confirmed" boolean DEFAULT false NOT NULL,
	"confirmed_at" timestamp with time zone,
	"confirmed_by_user_id" uuid,
	"confirmed_by_name" text,
	"evidence" text,
	"document_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_milestones_unique" UNIQUE("tenant_id","opportunity_id","milestone_definition_id")
);
--> statement-breakpoint
ALTER TABLE "funding_initiatives" ADD COLUMN "colour_key" text;--> statement-breakpoint
ALTER TABLE "funding_initiatives" ADD COLUMN "restricted" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "funding_initiatives" ADD COLUMN "fiscal_period" text;--> statement-breakpoint
ALTER TABLE "forward_opportunities" ADD CONSTRAINT "forward_opportunities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forward_opportunities" ADD CONSTRAINT "forward_opportunities_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forward_opportunities" ADD CONSTRAINT "forward_opportunities_initiative_id_funding_initiatives_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."funding_initiatives"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forward_opportunities" ADD CONSTRAINT "forward_opportunities_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_definitions" ADD CONSTRAINT "milestone_definitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_events" ADD CONSTRAINT "opportunity_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_events" ADD CONSTRAINT "opportunity_events_opportunity_id_forward_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."forward_opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_events" ADD CONSTRAINT "opportunity_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_milestones" ADD CONSTRAINT "opportunity_milestones_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_milestones" ADD CONSTRAINT "opportunity_milestones_opportunity_id_forward_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."forward_opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_milestones" ADD CONSTRAINT "opportunity_milestones_milestone_definition_id_milestone_definitions_id_fk" FOREIGN KEY ("milestone_definition_id") REFERENCES "public"."milestone_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_milestones" ADD CONSTRAINT "opportunity_milestones_confirmed_by_user_id_users_id_fk" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "forward_opportunities_tenant_id_idx" ON "forward_opportunities" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "forward_opportunities_prospect_id_idx" ON "forward_opportunities" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "forward_opportunities_initiative_id_idx" ON "forward_opportunities" USING btree ("initiative_id");--> statement-breakpoint
CREATE INDEX "forward_opportunities_owner_user_id_idx" ON "forward_opportunities" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "forward_opportunities_stage_idx" ON "forward_opportunities" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "forward_opportunities_status_idx" ON "forward_opportunities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "goals_tenant_id_idx" ON "goals" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "goals_scope_idx" ON "goals" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "milestone_definitions_tenant_id_idx" ON "milestone_definitions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "opportunity_events_tenant_id_idx" ON "opportunity_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "opportunity_events_opportunity_id_idx" ON "opportunity_events" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "opportunity_events_occurred_at_idx" ON "opportunity_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "opportunity_events_event_type_idx" ON "opportunity_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "opportunity_milestones_tenant_id_idx" ON "opportunity_milestones" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "opportunity_milestones_opportunity_id_idx" ON "opportunity_milestones" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "opportunity_milestones_definition_id_idx" ON "opportunity_milestones" USING btree ("milestone_definition_id");
--> statement-breakpoint
-- I18: enable RLS + the tenant_isolation policy on the new tenant-scoped tables
-- (forward_opportunities, milestone_definitions, opportunity_milestones,
--  opportunity_events, goals). Same DO-loop every migration that adds tenant tables runs.
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

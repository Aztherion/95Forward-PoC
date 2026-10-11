CREATE TYPE "public"."criterion_type" AS ENUM('boolean', 'score', 'classification');--> statement-breakpoint
CREATE TYPE "public"."meeting_source_type" AS ENUM('notes', 'transcript');--> statement-breakpoint
CREATE TYPE "public"."scorecard_status" AS ENUM('queued', 'classifying', 'scoring', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "criterion_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"scorecard_id" uuid NOT NULL,
	"criterion_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"criterion_type" "criterion_type" NOT NULL,
	"determinable" boolean NOT NULL,
	"boolean_value" boolean,
	"score_value" numeric(5, 4),
	"option_id" uuid,
	"rationale" text NOT NULL,
	"evidence_quote" text,
	"evidence_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "criterion_results_scorecard_criterion_unique" UNIQUE("scorecard_id","criterion_id"),
	CONSTRAINT "criterion_results_value_matches_type" CHECK ((
        ("criterion_results"."determinable" = false
          and "criterion_results"."boolean_value" is null
          and "criterion_results"."score_value" is null
          and "criterion_results"."option_id" is null)
        or ("criterion_results"."determinable" = true and "criterion_results"."criterion_type" = 'boolean'
          and "criterion_results"."boolean_value" is not null
          and "criterion_results"."score_value" is null
          and "criterion_results"."option_id" is null)
        or ("criterion_results"."determinable" = true and "criterion_results"."criterion_type" = 'score'
          and "criterion_results"."score_value" is not null and "criterion_results"."score_value" between 0 and 1
          and "criterion_results"."boolean_value" is null
          and "criterion_results"."option_id" is null)
        or ("criterion_results"."determinable" = true and "criterion_results"."criterion_type" = 'classification'
          and "criterion_results"."option_id" is not null
          and "criterion_results"."boolean_value" is null
          and "criterion_results"."score_value" is null)
      ))
);
--> statement-breakpoint
CREATE TABLE "meeting_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"is_fallback" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meeting_types_tenant_name_unique" UNIQUE("tenant_id","name")
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"reported_by" uuid NOT NULL,
	"source_type" "meeting_source_type" NOT NULL,
	"content" text NOT NULL,
	"opportunity_id" uuid,
	"prospect_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meetings_exactly_one_link" CHECK (("meetings"."opportunity_id" is not null) <> ("meetings"."prospect_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "scorecard_criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"type" "criterion_type" NOT NULL,
	"prompt" text NOT NULL,
	"guidance" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scorecard_criterion_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"criterion_id" uuid NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scorecard_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"meeting_type_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scorecard_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"definition_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scorecards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"meeting_id" uuid NOT NULL,
	"definition_snapshot" jsonb NOT NULL,
	"definition_id" uuid,
	"meeting_type_id" uuid,
	"classification_rationale" text,
	"used_fallback" boolean DEFAULT false NOT NULL,
	"meeting_type_overridden_by" uuid,
	"status" "scorecard_status" DEFAULT 'queued' NOT NULL,
	"failure_reason" text,
	"overall_score" numeric(5, 4),
	"section_scores" jsonb,
	"classify_model" text,
	"score_model" text,
	"prompt_version" text,
	"classify_latency_ms" integer,
	"score_latency_ms" integer,
	"classify_input_tokens" integer,
	"classify_output_tokens" integer,
	"score_input_tokens" integer,
	"score_output_tokens" integer,
	"scored_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scorecards_meeting_unique" UNIQUE("meeting_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "manager_id" uuid;--> statement-breakpoint
ALTER TABLE "criterion_results" ADD CONSTRAINT "criterion_results_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "criterion_results" ADD CONSTRAINT "criterion_results_scorecard_id_scorecards_id_fk" FOREIGN KEY ("scorecard_id") REFERENCES "public"."scorecards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_types" ADD CONSTRAINT "meeting_types_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_opportunity_id_forward_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."forward_opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecard_criteria" ADD CONSTRAINT "scorecard_criteria_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecard_criteria" ADD CONSTRAINT "scorecard_criteria_section_id_scorecard_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."scorecard_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecard_criterion_options" ADD CONSTRAINT "scorecard_criterion_options_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecard_criterion_options" ADD CONSTRAINT "scorecard_criterion_options_criterion_id_scorecard_criteria_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."scorecard_criteria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecard_definitions" ADD CONSTRAINT "scorecard_definitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecard_definitions" ADD CONSTRAINT "scorecard_definitions_meeting_type_id_meeting_types_id_fk" FOREIGN KEY ("meeting_type_id") REFERENCES "public"."meeting_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecard_sections" ADD CONSTRAINT "scorecard_sections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecard_sections" ADD CONSTRAINT "scorecard_sections_definition_id_scorecard_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."scorecard_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_definition_id_scorecard_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."scorecard_definitions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_meeting_type_id_meeting_types_id_fk" FOREIGN KEY ("meeting_type_id") REFERENCES "public"."meeting_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_meeting_type_overridden_by_users_id_fk" FOREIGN KEY ("meeting_type_overridden_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "criterion_results_tenant_id_idx" ON "criterion_results" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "criterion_results_scorecard_id_idx" ON "criterion_results" USING btree ("scorecard_id");--> statement-breakpoint
CREATE INDEX "criterion_results_criterion_id_idx" ON "criterion_results" USING btree ("criterion_id");--> statement-breakpoint
CREATE INDEX "meeting_types_tenant_id_idx" ON "meeting_types" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_types_one_fallback_per_tenant" ON "meeting_types" USING btree ("tenant_id") WHERE "meeting_types"."is_fallback";--> statement-breakpoint
CREATE INDEX "meetings_tenant_id_idx" ON "meetings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "meetings_reported_by_idx" ON "meetings" USING btree ("reported_by");--> statement-breakpoint
CREATE INDEX "meetings_opportunity_id_idx" ON "meetings" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "meetings_prospect_id_idx" ON "meetings" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "meetings_occurred_at_idx" ON "meetings" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "scorecard_criteria_tenant_id_idx" ON "scorecard_criteria" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "scorecard_criteria_section_id_idx" ON "scorecard_criteria" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "scorecard_criterion_options_tenant_id_idx" ON "scorecard_criterion_options" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "scorecard_criterion_options_criterion_id_idx" ON "scorecard_criterion_options" USING btree ("criterion_id");--> statement-breakpoint
CREATE INDEX "scorecard_definitions_tenant_id_idx" ON "scorecard_definitions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "scorecard_definitions_meeting_type_id_idx" ON "scorecard_definitions" USING btree ("meeting_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scorecard_definitions_one_active_per_type" ON "scorecard_definitions" USING btree ("tenant_id","meeting_type_id") WHERE "scorecard_definitions"."is_active";--> statement-breakpoint
CREATE INDEX "scorecard_sections_tenant_id_idx" ON "scorecard_sections" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "scorecard_sections_definition_id_idx" ON "scorecard_sections" USING btree ("definition_id");--> statement-breakpoint
CREATE INDEX "scorecards_tenant_id_idx" ON "scorecards" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "scorecards_definition_id_idx" ON "scorecards" USING btree ("definition_id");--> statement-breakpoint
CREATE INDEX "scorecards_meeting_type_id_idx" ON "scorecards" USING btree ("meeting_type_id");--> statement-breakpoint
CREATE INDEX "scorecards_status_idx" ON "scorecards" USING btree ("status");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_manager_id_idx" ON "users" USING btree ("manager_id");
--> statement-breakpoint
-- ------------------------------------------------------------------------------------------------
-- RLS, by hand. drizzle-kit does not emit policies, so a new tenant-scoped table arrives readable
-- across tenants by `app_user` while every other table is not — the worst kind of gap, because
-- nothing fails and nothing looks wrong. This is the FIFTH migration where that has mattered.
--
-- What leaks here if this block is forgotten is worse than a row count. `meetings.content` is the
-- raw transcript of a conversation between a fundraiser and a named donor, and `criterion_results`
-- holds a judgement about how that fundraiser performed in it. One organisation reading another's
-- donor conversations, or another organisation's appraisal of its staff, is the failure this one
-- line of SQL prevents.
--
-- Idempotent and deliberately not narrowed to the new tables, so anything missed earlier is picked
-- up here. Same block as 0012/0013/0014/0015/0017.
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

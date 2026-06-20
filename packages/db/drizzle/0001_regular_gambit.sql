CREATE TYPE "public"."ask_outcome" AS ENUM('commitment', 'decline', 'roadmap');--> statement-breakpoint
CREATE TYPE "public"."candidate_confidence" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."candidate_status" AS ENUM('suggested', 'endorsed', 'intro_requested', 'promoted', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."constituent_prospect_status" AS ENUM('none', 'suspect', 'prospect', 'active', 'donor');--> statement-breakpoint
CREATE TYPE "public"."constituent_type" AS ENUM('individual', 'organization', 'foundation');--> statement-breakpoint
CREATE TYPE "public"."discovery_status" AS ENUM('queued', 'researching', 'ready', 'reviewed');--> statement-breakpoint
CREATE TYPE "public"."follow_up_status" AS ENUM('open', 'done');--> statement-breakpoint
CREATE TYPE "public"."funding_frame" AS ENUM('today', 'tomorrow', 'forever');--> statement-breakpoint
CREATE TYPE "public"."gift_type" AS ENUM('one_time', 'recurring', 'pledge', 'planned', 'corporate_grant', 'in_kind');--> statement-breakpoint
CREATE TYPE "public"."marketing_channel" AS ENUM('email', 'appeal');--> statement-breakpoint
CREATE TYPE "public"."opportunity_stage" AS ENUM('identification', 'cultivation', 'solicitation', 'stewardship');--> statement-breakpoint
CREATE TYPE "public"."power_question_category" AS ENUM('opening', 'dialogue', 'others', 'go_to_30k');--> statement-breakpoint
CREATE TYPE "public"."prospect_status" AS ENUM('research', 'cultivation', 'solicitation', 'stewardship', 'active');--> statement-breakpoint
CREATE TYPE "public"."qpi_dimension" AS ENUM('capacity', 'relationship', 'timing', 'gift_history', 'philanthropy');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('major_gifts_officer', 'gift_officer', 'chief_development_officer');--> statement-breakpoint
CREATE TYPE "public"."visit_outcome" AS ENUM('commitment', 'decline', 'roadmap');--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"auth0_subject" text,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" "role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_tenant_email_unique" UNIQUE("tenant_id","email")
);
--> statement-breakpoint
CREATE TABLE "constituent_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"constituent_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "constituents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" "constituent_type" NOT NULL,
	"display_name" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"organization_name" text,
	"email" text,
	"phone" text,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"region" text,
	"postal_code" text,
	"country" text,
	"prospect_status" "constituent_prospect_status" DEFAULT 'none' NOT NULL,
	"assigned_user_id" uuid,
	"board_member" boolean DEFAULT false NOT NULL,
	"volunteer" boolean DEFAULT false NOT NULL,
	"wavemaker_monthly" boolean DEFAULT false NOT NULL,
	"legacy" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"constituent_id" uuid NOT NULL,
	"type" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"summary" text,
	"owner_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"from_constituent_id" uuid NOT NULL,
	"to_constituent_id" uuid,
	"external_name" text,
	"type" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appeals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"start_date" date,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"start_date" date,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"start_date" date,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"constituent_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"gift_date" date NOT NULL,
	"fund_id" uuid,
	"campaign_id" uuid,
	"appeal_id" uuid,
	"gift_type" "gift_type" NOT NULL,
	"designation" text,
	"receipt_status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"constituent_id" uuid NOT NULL,
	"stage" "opportunity_stage" NOT NULL,
	"ask_amount_cents" integer,
	"expected_amount_cents" integer,
	"expected_close_date" date,
	"likelihood_pct" integer,
	"owner_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"constituent_id" uuid NOT NULL,
	"purpose" text,
	"amount_cents" integer,
	"status" text,
	"deadline" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"constituent_id" uuid NOT NULL,
	"status" text,
	"attended" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"location" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"channel" "marketing_channel" NOT NULL,
	"segment_id" uuid,
	"status" text,
	"scheduled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"amount_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"constituent_id" uuid NOT NULL,
	"tier_id" uuid NOT NULL,
	"status" text,
	"start_date" date,
	"renewal_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteer_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"constituent_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"hours" numeric(6, 2) NOT NULL,
	"logged_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteer_opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funding_initiatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"story" text,
	"goal_amount_cents" integer,
	"frame" "funding_frame" NOT NULL,
	"timeline_start" date,
	"timeline_end" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_base" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prospect_id" uuid NOT NULL,
	"capacity_source" text,
	"relationship_to_cause" text,
	"connectors_note" text,
	"gift_history_summary" text,
	"other_philanthropy" text,
	"timing_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_base_prospect_unique" UNIQUE("tenant_id","prospect_id")
);
--> statement-breakpoint
CREATE TABLE "natural_partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prospect_id" uuid NOT NULL,
	"user_id" uuid,
	"constituent_id" uuid,
	"external_name" text,
	"role" text,
	"warm_path_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospect_strategy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prospect_id" uuid NOT NULL,
	"relationship_goals" text,
	"hooks" text,
	"objections" text,
	"predisposition_plan" text,
	"presentation_design" text,
	"action_plan" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prospect_strategy_prospect_unique" UNIQUE("tenant_id","prospect_id")
);
--> statement-breakpoint
CREATE TABLE "prospects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"constituent_id" uuid NOT NULL,
	"rank" integer,
	"rm_user_id" uuid,
	"status" "prospect_status" DEFAULT 'research' NOT NULL,
	"top_33" boolean DEFAULT false NOT NULL,
	"momentum" boolean DEFAULT false NOT NULL,
	"connector" boolean DEFAULT false NOT NULL,
	"leadership" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prospects_constituent_unique" UNIQUE("tenant_id","constituent_id")
);
--> statement-breakpoint
CREATE TABLE "qpi_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prospect_id" uuid NOT NULL,
	"dimension" "qpi_dimension" NOT NULL,
	"rating" integer,
	"is_unknown" boolean DEFAULT false NOT NULL,
	"rationale" text,
	"source" text,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qpi_assessments_prospect_dimension_unique" UNIQUE("tenant_id","prospect_id","dimension")
);
--> statement-breakpoint
CREATE TABLE "relationship_map_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prospect_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"decision_power" text,
	"warm_path_note" text,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_gaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prospect_id" uuid NOT NULL,
	"label" text NOT NULL,
	"status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prospect_id" uuid NOT NULL,
	"visit_id" uuid,
	"amount_min_cents" integer,
	"amount_max_cents" integer,
	"funding_initiative_id" uuid NOT NULL,
	"frame" "funding_frame" NOT NULL,
	"ask_type" text,
	"numbers_on_table" boolean DEFAULT false NOT NULL,
	"outcome" "ask_outcome",
	"commitment_amount_cents" integer,
	"commitment_schedule" text,
	"roadmap_next_steps" text,
	"follow_up_due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follow_up_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"visit_id" uuid,
	"ask_id" uuid,
	"owner_user_id" uuid NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"template_used" text,
	"status" "follow_up_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source_visit_id" uuid,
	"source_prospect_id" uuid NOT NULL,
	"referred_name" text NOT NULL,
	"may_use_name" boolean DEFAULT false NOT NULL,
	"will_send_note" boolean DEFAULT false NOT NULL,
	"relationship_note" text,
	"promoted_prospect_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prospect_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone,
	"scheduled_at" timestamp with time zone,
	"location_type" text,
	"goal" text,
	"team" text,
	"priority_discussed_initiative_id" uuid,
	"discovery_questions" text,
	"engagement_tool_note" text,
	"call_memo" text,
	"outcome" "visit_outcome",
	"next_step" text,
	"follow_up_due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"discovery_task_id" uuid NOT NULL,
	"name" text NOT NULL,
	"evidence_connection" text,
	"evidence_affinity" text,
	"confidence" "candidate_confidence" NOT NULL,
	"status" "candidate_status" DEFAULT 'suggested' NOT NULL,
	"promoted_prospect_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discovery_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"connector_constituent_id" uuid,
	"connector_external_name" text,
	"funding_initiative_id" uuid NOT NULL,
	"status" "discovery_status" DEFAULT 'queued' NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "power_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"category" "power_question_category" NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"weight_capacity" integer NOT NULL,
	"weight_relationship" integer NOT NULL,
	"weight_timing" integer NOT NULL,
	"weight_gift_history" integer NOT NULL,
	"weight_philanthropy" integer NOT NULL,
	"research_public_sources" boolean DEFAULT true NOT NULL,
	"propose_qpi_updates_automatically" boolean DEFAULT true NOT NULL,
	"draft_24h_followups" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_settings_tenant_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constituent_tags" ADD CONSTRAINT "constituent_tags_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constituent_tags" ADD CONSTRAINT "constituent_tags_constituent_id_constituents_id_fk" FOREIGN KEY ("constituent_id") REFERENCES "public"."constituents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constituent_tags" ADD CONSTRAINT "constituent_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constituents" ADD CONSTRAINT "constituents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constituents" ADD CONSTRAINT "constituents_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_constituent_id_constituents_id_fk" FOREIGN KEY ("constituent_id") REFERENCES "public"."constituents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_from_constituent_id_constituents_id_fk" FOREIGN KEY ("from_constituent_id") REFERENCES "public"."constituents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_to_constituent_id_constituents_id_fk" FOREIGN KEY ("to_constituent_id") REFERENCES "public"."constituents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funds" ADD CONSTRAINT "funds_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_constituent_id_constituents_id_fk" FOREIGN KEY ("constituent_id") REFERENCES "public"."constituents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_fund_id_funds_id_fk" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_appeal_id_appeals_id_fk" FOREIGN KEY ("appeal_id") REFERENCES "public"."appeals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_constituent_id_constituents_id_fk" FOREIGN KEY ("constituent_id") REFERENCES "public"."constituents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_constituent_id_constituents_id_fk" FOREIGN KEY ("constituent_id") REFERENCES "public"."constituents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_constituent_id_constituents_id_fk" FOREIGN KEY ("constituent_id") REFERENCES "public"."constituents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_messages" ADD CONSTRAINT "marketing_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_messages" ADD CONSTRAINT "marketing_messages_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_tiers" ADD CONSTRAINT "membership_tiers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_constituent_id_constituents_id_fk" FOREIGN KEY ("constituent_id") REFERENCES "public"."constituents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tier_id_membership_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."membership_tiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segments" ADD CONSTRAINT "segments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_hours" ADD CONSTRAINT "volunteer_hours_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_hours" ADD CONSTRAINT "volunteer_hours_constituent_id_constituents_id_fk" FOREIGN KEY ("constituent_id") REFERENCES "public"."constituents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_hours" ADD CONSTRAINT "volunteer_hours_opportunity_id_volunteer_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."volunteer_opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_opportunities" ADD CONSTRAINT "volunteer_opportunities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_initiatives" ADD CONSTRAINT "funding_initiatives_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD CONSTRAINT "knowledge_base_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD CONSTRAINT "knowledge_base_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "natural_partners" ADD CONSTRAINT "natural_partners_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "natural_partners" ADD CONSTRAINT "natural_partners_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "natural_partners" ADD CONSTRAINT "natural_partners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "natural_partners" ADD CONSTRAINT "natural_partners_constituent_id_constituents_id_fk" FOREIGN KEY ("constituent_id") REFERENCES "public"."constituents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_strategy" ADD CONSTRAINT "prospect_strategy_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_strategy" ADD CONSTRAINT "prospect_strategy_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_constituent_id_constituents_id_fk" FOREIGN KEY ("constituent_id") REFERENCES "public"."constituents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_rm_user_id_users_id_fk" FOREIGN KEY ("rm_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qpi_assessments" ADD CONSTRAINT "qpi_assessments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qpi_assessments" ADD CONSTRAINT "qpi_assessments_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qpi_assessments" ADD CONSTRAINT "qpi_assessments_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship_map_entries" ADD CONSTRAINT "relationship_map_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship_map_entries" ADD CONSTRAINT "relationship_map_entries_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_gaps" ADD CONSTRAINT "research_gaps_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_gaps" ADD CONSTRAINT "research_gaps_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asks" ADD CONSTRAINT "asks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asks" ADD CONSTRAINT "asks_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asks" ADD CONSTRAINT "asks_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asks" ADD CONSTRAINT "asks_funding_initiative_id_funding_initiatives_id_fk" FOREIGN KEY ("funding_initiative_id") REFERENCES "public"."funding_initiatives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_tasks" ADD CONSTRAINT "follow_up_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_tasks" ADD CONSTRAINT "follow_up_tasks_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_tasks" ADD CONSTRAINT "follow_up_tasks_ask_id_asks_id_fk" FOREIGN KEY ("ask_id") REFERENCES "public"."asks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_tasks" ADD CONSTRAINT "follow_up_tasks_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_source_visit_id_visits_id_fk" FOREIGN KEY ("source_visit_id") REFERENCES "public"."visits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_source_prospect_id_prospects_id_fk" FOREIGN KEY ("source_prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_promoted_prospect_id_prospects_id_fk" FOREIGN KEY ("promoted_prospect_id") REFERENCES "public"."prospects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_priority_discussed_initiative_id_funding_initiatives_id_fk" FOREIGN KEY ("priority_discussed_initiative_id") REFERENCES "public"."funding_initiatives"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_discovery_task_id_discovery_tasks_id_fk" FOREIGN KEY ("discovery_task_id") REFERENCES "public"."discovery_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_promoted_prospect_id_prospects_id_fk" FOREIGN KEY ("promoted_prospect_id") REFERENCES "public"."prospects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_tasks" ADD CONSTRAINT "discovery_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_tasks" ADD CONSTRAINT "discovery_tasks_connector_constituent_id_constituents_id_fk" FOREIGN KEY ("connector_constituent_id") REFERENCES "public"."constituents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_tasks" ADD CONSTRAINT "discovery_tasks_funding_initiative_id_funding_initiatives_id_fk" FOREIGN KEY ("funding_initiative_id") REFERENCES "public"."funding_initiatives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_tasks" ADD CONSTRAINT "discovery_tasks_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "power_questions" ADD CONSTRAINT "power_questions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_tenant_id_idx" ON "users" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_auth0_subject_idx" ON "users" USING btree ("auth0_subject");--> statement-breakpoint
CREATE INDEX "constituent_tags_tenant_id_idx" ON "constituent_tags" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "constituent_tags_constituent_id_idx" ON "constituent_tags" USING btree ("constituent_id");--> statement-breakpoint
CREATE INDEX "constituent_tags_tag_id_idx" ON "constituent_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "constituents_tenant_id_idx" ON "constituents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "constituents_assigned_user_id_idx" ON "constituents" USING btree ("assigned_user_id");--> statement-breakpoint
CREATE INDEX "constituents_type_idx" ON "constituents" USING btree ("type");--> statement-breakpoint
CREATE INDEX "constituents_display_name_idx" ON "constituents" USING btree ("display_name");--> statement-breakpoint
CREATE INDEX "interactions_tenant_id_idx" ON "interactions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "interactions_constituent_id_idx" ON "interactions" USING btree ("constituent_id");--> statement-breakpoint
CREATE INDEX "interactions_owner_user_id_idx" ON "interactions" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "relationships_tenant_id_idx" ON "relationships" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "relationships_from_constituent_id_idx" ON "relationships" USING btree ("from_constituent_id");--> statement-breakpoint
CREATE INDEX "relationships_to_constituent_id_idx" ON "relationships" USING btree ("to_constituent_id");--> statement-breakpoint
CREATE INDEX "tags_tenant_id_idx" ON "tags" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tags_name_idx" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE INDEX "appeals_tenant_id_idx" ON "appeals" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "campaigns_tenant_id_idx" ON "campaigns" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "funds_tenant_id_idx" ON "funds" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "gifts_tenant_id_idx" ON "gifts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "gifts_constituent_id_idx" ON "gifts" USING btree ("constituent_id");--> statement-breakpoint
CREATE INDEX "gifts_fund_id_idx" ON "gifts" USING btree ("fund_id");--> statement-breakpoint
CREATE INDEX "gifts_campaign_id_idx" ON "gifts" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "gifts_appeal_id_idx" ON "gifts" USING btree ("appeal_id");--> statement-breakpoint
CREATE INDEX "opportunities_tenant_id_idx" ON "opportunities" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "opportunities_constituent_id_idx" ON "opportunities" USING btree ("constituent_id");--> statement-breakpoint
CREATE INDEX "opportunities_owner_user_id_idx" ON "opportunities" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "proposals_tenant_id_idx" ON "proposals" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "proposals_constituent_id_idx" ON "proposals" USING btree ("constituent_id");--> statement-breakpoint
CREATE INDEX "event_registrations_tenant_id_idx" ON "event_registrations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "event_registrations_event_id_idx" ON "event_registrations" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_registrations_constituent_id_idx" ON "event_registrations" USING btree ("constituent_id");--> statement-breakpoint
CREATE INDEX "events_tenant_id_idx" ON "events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "marketing_messages_tenant_id_idx" ON "marketing_messages" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "marketing_messages_segment_id_idx" ON "marketing_messages" USING btree ("segment_id");--> statement-breakpoint
CREATE INDEX "membership_tiers_tenant_id_idx" ON "membership_tiers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "memberships_tenant_id_idx" ON "memberships" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "memberships_constituent_id_idx" ON "memberships" USING btree ("constituent_id");--> statement-breakpoint
CREATE INDEX "memberships_tier_id_idx" ON "memberships" USING btree ("tier_id");--> statement-breakpoint
CREATE INDEX "segments_tenant_id_idx" ON "segments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "volunteer_hours_tenant_id_idx" ON "volunteer_hours" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "volunteer_hours_constituent_id_idx" ON "volunteer_hours" USING btree ("constituent_id");--> statement-breakpoint
CREATE INDEX "volunteer_hours_opportunity_id_idx" ON "volunteer_hours" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "volunteer_opportunities_tenant_id_idx" ON "volunteer_opportunities" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "funding_initiatives_tenant_id_idx" ON "funding_initiatives" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "funding_initiatives_frame_idx" ON "funding_initiatives" USING btree ("frame");--> statement-breakpoint
CREATE INDEX "knowledge_base_tenant_id_idx" ON "knowledge_base" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "natural_partners_tenant_id_idx" ON "natural_partners" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "natural_partners_prospect_id_idx" ON "natural_partners" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "prospect_strategy_tenant_id_idx" ON "prospect_strategy" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "prospects_tenant_id_idx" ON "prospects" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "prospects_rm_user_id_idx" ON "prospects" USING btree ("rm_user_id");--> statement-breakpoint
CREATE INDEX "qpi_assessments_tenant_id_idx" ON "qpi_assessments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "qpi_assessments_prospect_id_idx" ON "qpi_assessments" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "relationship_map_entries_tenant_id_idx" ON "relationship_map_entries" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "relationship_map_entries_prospect_id_idx" ON "relationship_map_entries" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "research_gaps_tenant_id_idx" ON "research_gaps" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "research_gaps_prospect_id_idx" ON "research_gaps" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "asks_tenant_id_idx" ON "asks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "asks_prospect_id_idx" ON "asks" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "asks_visit_id_idx" ON "asks" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "asks_funding_initiative_id_idx" ON "asks" USING btree ("funding_initiative_id");--> statement-breakpoint
CREATE INDEX "follow_up_tasks_tenant_id_idx" ON "follow_up_tasks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "follow_up_tasks_visit_id_idx" ON "follow_up_tasks" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "follow_up_tasks_ask_id_idx" ON "follow_up_tasks" USING btree ("ask_id");--> statement-breakpoint
CREATE INDEX "follow_up_tasks_owner_user_id_idx" ON "follow_up_tasks" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "referrals_tenant_id_idx" ON "referrals" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "referrals_source_visit_id_idx" ON "referrals" USING btree ("source_visit_id");--> statement-breakpoint
CREATE INDEX "referrals_source_prospect_id_idx" ON "referrals" USING btree ("source_prospect_id");--> statement-breakpoint
CREATE INDEX "referrals_promoted_prospect_id_idx" ON "referrals" USING btree ("promoted_prospect_id");--> statement-breakpoint
CREATE INDEX "visits_tenant_id_idx" ON "visits" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "visits_prospect_id_idx" ON "visits" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "visits_priority_discussed_initiative_id_idx" ON "visits" USING btree ("priority_discussed_initiative_id");--> statement-breakpoint
CREATE INDEX "candidates_tenant_id_idx" ON "candidates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "candidates_discovery_task_id_idx" ON "candidates" USING btree ("discovery_task_id");--> statement-breakpoint
CREATE INDEX "candidates_promoted_prospect_id_idx" ON "candidates" USING btree ("promoted_prospect_id");--> statement-breakpoint
CREATE INDEX "discovery_tasks_tenant_id_idx" ON "discovery_tasks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "discovery_tasks_connector_constituent_id_idx" ON "discovery_tasks" USING btree ("connector_constituent_id");--> statement-breakpoint
CREATE INDEX "discovery_tasks_funding_initiative_id_idx" ON "discovery_tasks" USING btree ("funding_initiative_id");--> statement-breakpoint
CREATE INDEX "discovery_tasks_requested_by_user_id_idx" ON "discovery_tasks" USING btree ("requested_by_user_id");--> statement-breakpoint
CREATE INDEX "power_questions_tenant_id_idx" ON "power_questions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "power_questions_category_idx" ON "power_questions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "tenant_settings_tenant_id_idx" ON "tenant_settings" USING btree ("tenant_id");
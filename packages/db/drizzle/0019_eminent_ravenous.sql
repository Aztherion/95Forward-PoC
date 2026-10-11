-- ------------------------------------------------------------------------------------------------
-- I31b — Scorecards become versioned.
--
-- An override or a re-score now INSERTS a new Scorecard and supersedes the old one rather than
-- overwriting it, so Criterion Results stay attached to the Scorecard that produced them.
--
-- The plain `unique(meeting_id)` is replaced by a PARTIAL unique index on `meeting_id WHERE
-- is_current`. That single line is the whole invariant: history is allowed, two current versions
-- are not, and the guarantee holds under a concurrent re-score where application logic would lose
-- the race.
--
-- Existing rows take `is_current = true` from the column default, which is correct: every Scorecard
-- that exists today is the only one for its meeting.
--
-- NO RLS BLOCK HERE, DELIBERATELY. This migration adds no table. Every table it touches already
-- carries the `tenant_isolation` policy from 0018, and the drift guard in `rls-isolation.test.ts`
-- fails the build if any tenant-scoped table ever loses it.
-- ------------------------------------------------------------------------------------------------
CREATE TYPE "public"."supersede_reason" AS ENUM('override', 'rescore');--> statement-breakpoint
ALTER TABLE "scorecards" DROP CONSTRAINT "scorecards_meeting_unique";--> statement-breakpoint
ALTER TABLE "scorecards" ADD COLUMN "is_current" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "scorecards" ADD COLUMN "superseded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "scorecards" ADD COLUMN "superseded_by" uuid;--> statement-breakpoint
ALTER TABLE "scorecards" ADD COLUMN "supersede_reason" "supersede_reason";--> statement-breakpoint
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_superseded_by_scorecards_id_fk" FOREIGN KEY ("superseded_by") REFERENCES "public"."scorecards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scorecards_meeting_id_idx" ON "scorecards" USING btree ("meeting_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scorecards_one_current_per_meeting" ON "scorecards" USING btree ("meeting_id") WHERE "scorecards"."is_current";
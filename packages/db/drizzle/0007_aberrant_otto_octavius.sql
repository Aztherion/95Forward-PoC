ALTER TABLE "membership_tiers" ADD COLUMN "level" integer;--> statement-breakpoint
ALTER TABLE "membership_tiers" ADD COLUMN "benefits" text;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "last_renewed_on" date;--> statement-breakpoint
ALTER TABLE "volunteer_opportunities" ADD COLUMN "starts_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "volunteer_opportunities" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "volunteer_opportunities" ADD COLUMN "capacity" integer;
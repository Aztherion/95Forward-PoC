ALTER TABLE "gifts" ADD COLUMN "event_id" uuid;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD COLUMN "guest_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD COLUMN "fee_amount_cents" integer;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "event_type" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "capacity" integer;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "goal_amount_cents" integer;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "marketing_messages" ADD COLUMN "subject" text;--> statement-breakpoint
ALTER TABLE "marketing_messages" ADD COLUMN "body" text;--> statement-breakpoint
ALTER TABLE "marketing_messages" ADD COLUMN "sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "segments" ADD COLUMN "definition" jsonb;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gifts_event_id_idx" ON "gifts" USING btree ("event_id");
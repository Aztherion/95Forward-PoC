CREATE TYPE "public"."saved_list_record_type" AS ENUM('constituent', 'gift', 'interaction');--> statement-breakpoint
CREATE TABLE "saved_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"record_type" "saved_list_record_type" NOT NULL,
	"definition" jsonb NOT NULL,
	"owner_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_lists_tenant_name_unique" UNIQUE("tenant_id","name")
);
--> statement-breakpoint
ALTER TABLE "constituents" ADD COLUMN "host_likelihood" integer;--> statement-breakpoint
ALTER TABLE "constituents" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "saved_lists" ADD CONSTRAINT "saved_lists_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_lists" ADD CONSTRAINT "saved_lists_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "saved_lists_tenant_id_idx" ON "saved_lists" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "saved_lists_owner_user_id_idx" ON "saved_lists" USING btree ("owner_user_id");
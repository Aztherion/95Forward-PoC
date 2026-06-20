ALTER TABLE "users" DROP CONSTRAINT "users_tenant_email_unique";--> statement-breakpoint
ALTER TABLE "follow_up_tasks" DROP CONSTRAINT "follow_up_tasks_owner_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "discovery_tasks" DROP CONSTRAINT "discovery_tasks_requested_by_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "users_email_idx";--> statement-breakpoint
DROP INDEX "users_auth0_subject_idx";--> statement-breakpoint
DROP INDEX "tags_name_idx";--> statement-breakpoint
ALTER TABLE "follow_up_tasks" ALTER COLUMN "owner_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "discovery_tasks" ALTER COLUMN "requested_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "follow_up_tasks" ADD CONSTRAINT "follow_up_tasks_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_tasks" ADD CONSTRAINT "discovery_tasks_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_auth0_subject_unique" ON "users" USING btree ("auth0_subject") WHERE "users"."auth0_subject" is not null;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");--> statement-breakpoint
ALTER TABLE "constituent_tags" ADD CONSTRAINT "constituent_tags_unique" UNIQUE("tenant_id","constituent_id","tag_id");--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_tenant_name_unique" UNIQUE("tenant_id","name");
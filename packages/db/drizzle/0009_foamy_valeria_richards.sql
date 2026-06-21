CREATE TABLE "prospect_funding_initiatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prospect_id" uuid NOT NULL,
	"funding_initiative_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prospect_funding_initiatives_unique" UNIQUE("tenant_id","prospect_id","funding_initiative_id")
);
--> statement-breakpoint
ALTER TABLE "prospect_funding_initiatives" ADD CONSTRAINT "prospect_funding_initiatives_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_funding_initiatives" ADD CONSTRAINT "prospect_funding_initiatives_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_funding_initiatives" ADD CONSTRAINT "prospect_funding_initiatives_funding_initiative_id_funding_initiatives_id_fk" FOREIGN KEY ("funding_initiative_id") REFERENCES "public"."funding_initiatives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prospect_funding_initiatives_tenant_id_idx" ON "prospect_funding_initiatives" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "prospect_funding_initiatives_prospect_id_idx" ON "prospect_funding_initiatives" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "prospect_funding_initiatives_funding_initiative_id_idx" ON "prospect_funding_initiatives" USING btree ("funding_initiative_id");--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "prospect_funding_initiatives" TO app_user;--> statement-breakpoint
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
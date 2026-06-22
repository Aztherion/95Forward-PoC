ALTER TABLE "candidates" ADD COLUMN "origin_key" text;--> statement-breakpoint
ALTER TABLE "discovery_tasks" ADD COLUMN "checkpoint" jsonb;--> statement-breakpoint
ALTER TABLE "discovery_tasks" ADD COLUMN "error" text;--> statement-breakpoint
ALTER TABLE "discovery_tasks" ADD COLUMN "origin_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "candidates_origin_key_unique" ON "candidates" USING btree ("origin_key") WHERE "candidates"."origin_key" IS NOT NULL;--> statement-breakpoint
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
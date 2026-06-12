-- Supabase Row Level Security policies (run after prisma migrate)
-- Enable RLS on tenant-scoped tables and restrict by company_id via JWT claim

-- Example: enable RLS on leads table
-- ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "tenant_isolation" ON "Lead"
--   USING ("companyId" = current_setting('app.current_company_id', true));

-- Set company context in application before queries:
-- SELECT set_config('app.current_company_id', '<companyId>', true);

-- Apply similar policies to all tables with companyId column.
-- Full RLS deployment requires Supabase auth integration or service-role bypass for migrations.

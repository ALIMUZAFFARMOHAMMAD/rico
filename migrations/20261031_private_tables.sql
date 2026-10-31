-- Ricomates uses Clerk-authenticated server APIs, never direct browser table reads.
-- Restrict only these application tables. No customer rows are modified.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $$ DECLARE name text; policy record; relation regclass; BEGIN
  FOREACH name IN ARRAY ARRAY['users','conversations','career_results'] LOOP
    relation := to_regclass('public.' || name);
    IF relation IS NULL THEN CONTINUE; END IF;
    IF EXISTS (SELECT 1 FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) permission
      WHERE NOT has_table_privilege('service_role', relation, permission)) THEN
      RAISE EXCEPTION 'Server access missing for %; aborting without changes', name;
    END IF;
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', relation);
    EXECUTE format('REVOKE ALL ON TABLE %s FROM PUBLIC, anon, authenticated', relation);
    -- Defense in depth if a future migration accidentally restores table grants.
    FOR policy IN SELECT polname FROM pg_policy WHERE polrelid=relation LOOP
      EXECUTE format('ALTER POLICY %I ON %s TO service_role', policy.polname, relation);
    END LOOP;
  END LOOP;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;

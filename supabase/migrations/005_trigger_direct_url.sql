-- Kotrou — Migration 005 : Config sécurisée pour le trigger pg_net
-- Table privée + réécriture du trigger avec URL directe

CREATE SCHEMA IF NOT EXISTS internal;

CREATE TABLE internal.config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

REVOKE ALL ON SCHEMA internal FROM anon, authenticated;
REVOKE ALL ON internal.config FROM anon, authenticated;

INSERT INTO internal.config (key, value) VALUES
  ('service_role_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3eXJyaWVxcG9jc2pmZnVxZ3luIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODgyNTUwOSwiZXhwIjoyMDk0NDAxNTA5fQ.mQgtY-bUSzDsWceztGZExTHMF5ShCAQCb-jQwiOEohA');

CREATE OR REPLACE FUNCTION appeler_edge_function_notifier()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _key TEXT;
BEGIN
  SELECT value INTO _key FROM internal.config WHERE key = 'service_role_key';

  PERFORM net.http_post(
    url     := 'https://twyrrieqpocsjffuqgyn.supabase.co/functions/v1/notifier-trajets-affectes',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _key
    ),
    body    := jsonb_build_object(
      'signalement_id', NEW.id,
      'type',           NEW.type,
      'lat',            ST_Y(NEW.coords::geometry),
      'lng',            ST_X(NEW.coords::geometry)
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Edge function call failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

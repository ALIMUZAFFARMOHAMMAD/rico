-- Local synthetic data only. No production credentials or restored customer data.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
GRANT service_role, anon, authenticated TO staging_admin;
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  messages jsonb DEFAULT '[]', traits jsonb DEFAULT '{}', riasec text DEFAULT '',
  msg_count integer DEFAULT 0, voice_notes jsonb DEFAULT '[]'
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.conversations TO service_role;
CREATE FUNCTION public.update_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

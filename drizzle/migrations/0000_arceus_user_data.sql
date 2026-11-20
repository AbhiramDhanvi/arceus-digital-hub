CREATE TABLE public.households (
  user_id uuid PRIMARY KEY,
  facts jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.households TO authenticated;
GRANT ALL ON public.households TO service_role;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own households select" ON public.households FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own households insert" ON public.households FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own households update" ON public.households FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own households delete" ON public.households FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.saved_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  scheme_id text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, scheme_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_schemes TO authenticated;
GRANT ALL ON public.saved_schemes TO service_role;
ALTER TABLE public.saved_schemes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saved select" ON public.saved_schemes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own saved insert" ON public.saved_schemes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own saved update" ON public.saved_schemes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own saved delete" ON public.saved_schemes FOR DELETE TO authenticated USING (auth.uid() = user_id);
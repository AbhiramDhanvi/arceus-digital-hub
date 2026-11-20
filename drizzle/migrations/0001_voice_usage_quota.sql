CREATE TABLE public.voice_usage (
  bucket text NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, day)
);
GRANT ALL ON public.voice_usage TO service_role;
ALTER TABLE public.voice_usage ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_voice_quota(_bucket text, _max integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c integer;
BEGIN
  INSERT INTO public.voice_usage(bucket, day, count) VALUES (_bucket, (now() AT TIME ZONE 'utc')::date, 1)
  ON CONFLICT (bucket, day) DO UPDATE SET count = public.voice_usage.count + 1
  RETURNING count INTO c;
  RETURN c <= _max;
END $$;
REVOKE ALL ON FUNCTION public.consume_voice_quota(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_voice_quota(text, integer) TO service_role;
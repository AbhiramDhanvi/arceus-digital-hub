DROP FUNCTION IF EXISTS public.consume_voice_quota(text, integer);
CREATE OR REPLACE FUNCTION public.consume_voice_quota()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c integer; b text; m integer;
BEGIN
  IF auth.uid() IS NULL THEN b := 'guest'; m := 400; ELSE b := 'user:' || auth.uid()::text; m := 150; END IF;
  INSERT INTO public.voice_usage(bucket, day, count) VALUES (b, (now() AT TIME ZONE 'utc')::date, 1)
  ON CONFLICT (bucket, day) DO UPDATE SET count = public.voice_usage.count + 1
  RETURNING count INTO c;
  RETURN c <= m;
END $$;
REVOKE ALL ON FUNCTION public.consume_voice_quota() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_voice_quota() TO anon, authenticated, service_role;
-- Add a write-based keepalive endpoint.
-- Supabase's inactivity detector may not treat a tiny read-only REST query as
-- sufficient activity, so the scheduled workflow calls this fixed RPC instead.

CREATE TABLE IF NOT EXISTS public.keepalive_heartbeats (
    id boolean PRIMARY KEY DEFAULT true CHECK (id),
    pinged_at timestamptz NOT NULL DEFAULT now(),
    source text NOT NULL DEFAULT 'github-actions',
    ping_count bigint NOT NULL DEFAULT 0
);

ALTER TABLE public.keepalive_heartbeats ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.keepalive_heartbeats FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.keepalive_ping()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
BEGIN
    INSERT INTO public.keepalive_heartbeats (id, pinged_at, source, ping_count)
    VALUES (true, now(), 'github-actions', 1)
    ON CONFLICT (id) DO UPDATE
    SET pinged_at = EXCLUDED.pinged_at,
        source = EXCLUDED.source,
        ping_count = public.keepalive_heartbeats.ping_count + 1
    RETURNING jsonb_build_object(
        'pinged_at', pinged_at,
        'ping_count', ping_count
    )
    INTO result;

    RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.keepalive_ping() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.keepalive_ping() TO anon, authenticated;

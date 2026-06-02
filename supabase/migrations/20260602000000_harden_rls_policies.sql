-- Harden public Data API writes.
-- The frontend still uses the public anon key, so RLS must block anonymous
-- writes and restrict room data changes to room participants/admins.

-- Helper functions used by policies. SECURITY DEFINER avoids recursive RLS
-- checks when a policy needs to inspect room membership or admin status.
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (
            SELECT p.is_admin
            FROM public.players p
            WHERE p.id = auth.uid()
        ),
        false
    );
$$;

CREATE OR REPLACE FUNCTION public.is_room_member(room_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (
            SELECT true
            FROM public.room_players rp
            WHERE rp.room_id = room_uuid
              AND rp.player_id = auth.uid()
            LIMIT 1
        ),
        false
    );
$$;

CREATE OR REPLACE FUNCTION public.is_room_host(room_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (
            SELECT true
            FROM public.game_rooms gr
            WHERE gr.id = room_uuid
              AND gr.host_id = auth.uid()
            LIMIT 1
        ),
        false
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_member(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_host(uuid) TO anon, authenticated;

-- Prevent a signed-in client from making itself admin through profile updates.
CREATE OR REPLACE FUNCTION public.prevent_client_admin_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF auth.role() IN ('anon', 'authenticated')
       AND OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
        RAISE EXCEPTION 'is_admin cannot be changed by client requests';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_client_admin_change ON public.players;
CREATE TRIGGER prevent_client_admin_change
    BEFORE UPDATE ON public.players
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_client_admin_change();

-- Players.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.players;
DROP POLICY IF EXISTS "Users can create guest players" ON public.players;
DROP POLICY IF EXISTS "Authenticated users can insert own profile" ON public.players;
DROP POLICY IF EXISTS "Authenticated users can create guest players" ON public.players;
DROP POLICY IF EXISTS "Authenticated users can delete orphan guest players" ON public.players;

CREATE POLICY "Authenticated users can insert own profile"
    ON public.players FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND auth.uid() = id
    );

CREATE POLICY "Authenticated users can create guest players"
    ON public.players FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND is_guest = true
    );

CREATE POLICY "Authenticated users can delete orphan guest players"
    ON public.players FOR DELETE
    USING (
        auth.role() = 'authenticated'
        AND is_guest = true
        AND NOT EXISTS (
            SELECT 1
            FROM public.owner_players op
            WHERE op.player_id = players.id
        )
    );

-- Game rooms.
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Host can update room" ON public.game_rooms;
DROP POLICY IF EXISTS "Host can update own room" ON public.game_rooms;
DROP POLICY IF EXISTS "Room members can update room" ON public.game_rooms;
DROP POLICY IF EXISTS "Admins can update any room" ON public.game_rooms;
DROP POLICY IF EXISTS "Admins can delete any room" ON public.game_rooms;
DROP POLICY IF EXISTS "Authenticated users can create own hosted rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Hosts members and admins can update rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Admins can delete rooms" ON public.game_rooms;

CREATE POLICY "Authenticated users can create own hosted rooms"
    ON public.game_rooms FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND host_id = auth.uid()
    );

CREATE POLICY "Hosts members and admins can update rooms"
    ON public.game_rooms FOR UPDATE
    USING (
        public.is_room_host(id)
        OR public.is_room_member(id)
        OR public.is_current_user_admin()
    )
    WITH CHECK (
        public.is_room_host(id)
        OR public.is_room_member(id)
        OR public.is_current_user_admin()
    );

CREATE POLICY "Admins can delete rooms"
    ON public.game_rooms FOR DELETE
    USING (public.is_current_user_admin());

-- Room players.
DROP POLICY IF EXISTS "Authenticated users can join rooms" ON public.room_players;
DROP POLICY IF EXISTS "Players can leave rooms" ON public.room_players;
DROP POLICY IF EXISTS "Users can delete themselves from room" ON public.room_players;
DROP POLICY IF EXISTS "Room members can update points" ON public.room_players;
DROP POLICY IF EXISTS "Admins can insert room players" ON public.room_players;
DROP POLICY IF EXISTS "Admins can delete room players" ON public.room_players;
DROP POLICY IF EXISTS "Authenticated users can join as themselves" ON public.room_players;
DROP POLICY IF EXISTS "Room members and admins can update room players" ON public.room_players;
DROP POLICY IF EXISTS "Players and admins can delete room players" ON public.room_players;

CREATE POLICY "Authenticated users can join as themselves"
    ON public.room_players FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND (
            player_id = auth.uid()
            OR public.is_current_user_admin()
        )
    );

CREATE POLICY "Room members and admins can update room players"
    ON public.room_players FOR UPDATE
    USING (
        public.is_room_member(room_id)
        OR public.is_current_user_admin()
    )
    WITH CHECK (
        public.is_room_member(room_id)
        OR public.is_current_user_admin()
    );

CREATE POLICY "Players and admins can delete room players"
    ON public.room_players FOR DELETE
    USING (
        player_id = auth.uid()
        OR public.is_current_user_admin()
    );

-- Game rounds.
DROP POLICY IF EXISTS "Room members can create rounds" ON public.game_rounds;
DROP POLICY IF EXISTS "Allow delete game_rounds" ON public.game_rounds;
DROP POLICY IF EXISTS "Room members and admins can create rounds" ON public.game_rounds;
DROP POLICY IF EXISTS "Room members and admins can delete rounds" ON public.game_rounds;

CREATE POLICY "Room members and admins can create rounds"
    ON public.game_rounds FOR INSERT
    WITH CHECK (
        public.is_room_member(room_id)
        OR public.is_current_user_admin()
    );

CREATE POLICY "Room members and admins can delete rounds"
    ON public.game_rounds FOR DELETE
    USING (
        public.is_room_member(room_id)
        OR public.is_current_user_admin()
    );

-- Round points are not currently written by the client, but keep the policy
-- aligned with game_round membership in case they are used later.
DROP POLICY IF EXISTS "System can insert round points" ON public.round_points;
DROP POLICY IF EXISTS "Room members and admins can insert round points" ON public.round_points;

CREATE POLICY "Room members and admins can insert round points"
    ON public.round_points FOR INSERT
    WITH CHECK (
        public.is_current_user_admin()
        OR EXISTS (
            SELECT 1
            FROM public.game_rounds gr
            WHERE gr.id = round_points.round_id
              AND public.is_room_member(gr.room_id)
        )
    );

-- Vacated seats are touched during leave/rejoin flows. For now, require a
-- signed-in user and a live room; moving this into RPC would allow stricter
-- member checks without breaking active-game rejoin.
DROP POLICY IF EXISTS "Allow insert vacated_seats" ON public.vacated_seats;
DROP POLICY IF EXISTS "Allow update vacated_seats" ON public.vacated_seats;
DROP POLICY IF EXISTS "Allow delete vacated_seats" ON public.vacated_seats;
DROP POLICY IF EXISTS "Authenticated users can insert vacated seats" ON public.vacated_seats;
DROP POLICY IF EXISTS "Authenticated users can update vacated seats" ON public.vacated_seats;
DROP POLICY IF EXISTS "Authenticated users can delete vacated seats" ON public.vacated_seats;

CREATE POLICY "Authenticated users can insert vacated seats"
    ON public.vacated_seats FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1
            FROM public.game_rooms gr
            WHERE gr.id = vacated_seats.room_id
              AND gr.status IN ('waiting', 'active')
        )
    );

CREATE POLICY "Authenticated users can update vacated seats"
    ON public.vacated_seats FOR UPDATE
    USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1
            FROM public.game_rooms gr
            WHERE gr.id = vacated_seats.room_id
              AND gr.status IN ('waiting', 'active')
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1
            FROM public.game_rooms gr
            WHERE gr.id = vacated_seats.room_id
              AND gr.status IN ('waiting', 'active')
        )
    );

CREATE POLICY "Authenticated users can delete vacated seats"
    ON public.vacated_seats FOR DELETE
    USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1
            FROM public.game_rooms gr
            WHERE gr.id = vacated_seats.room_id
              AND gr.status IN ('waiting', 'active')
        )
    );

-- Stats tables are still maintained directly by the frontend. This blocks
-- anonymous tampering now; the next hardening step should move stats updates
-- into SECURITY DEFINER RPC functions and remove these broad authenticated
-- update policies.
DROP POLICY IF EXISTS "Triggers can insert player stats" ON public.player_stats;
DROP POLICY IF EXISTS "System can update player stats" ON public.player_stats;
DROP POLICY IF EXISTS "Triggers can insert fan breakdown" ON public.fan_breakdown;
DROP POLICY IF EXISTS "System can update fan breakdown" ON public.fan_breakdown;
DROP POLICY IF EXISTS "System can insert PvP stats" ON public.player_vs_player;
DROP POLICY IF EXISTS "System can update PvP stats" ON public.player_vs_player;
DROP POLICY IF EXISTS "Authenticated users can insert player stats" ON public.player_stats;
DROP POLICY IF EXISTS "Authenticated users can update player stats" ON public.player_stats;
DROP POLICY IF EXISTS "Authenticated users can insert fan breakdown" ON public.fan_breakdown;
DROP POLICY IF EXISTS "Authenticated users can update fan breakdown" ON public.fan_breakdown;
DROP POLICY IF EXISTS "Authenticated users can insert PvP stats" ON public.player_vs_player;
DROP POLICY IF EXISTS "Authenticated users can update PvP stats" ON public.player_vs_player;

CREATE POLICY "Authenticated users can insert player stats"
    ON public.player_stats FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update player stats"
    ON public.player_stats FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert fan breakdown"
    ON public.fan_breakdown FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update fan breakdown"
    ON public.fan_breakdown FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert PvP stats"
    ON public.player_vs_player FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update PvP stats"
    ON public.player_vs_player FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

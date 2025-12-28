-- Fix RLS policies for player creation flow

-- Allow system (triggers) to insert player_stats
CREATE POLICY "Triggers can insert player stats"
    ON player_stats FOR INSERT
    WITH CHECK (true);

-- Allow system to update player stats
CREATE POLICY "System can update player stats"
    ON player_stats FOR UPDATE
    USING (true);

-- Allow inserting fan_breakdown via triggers
CREATE POLICY "Triggers can insert fan breakdown"
    ON fan_breakdown FOR INSERT
    WITH CHECK (true);

-- Fix room_players to allow updating points
CREATE POLICY "Room members can update points"
    ON room_players FOR UPDATE
    USING (true);

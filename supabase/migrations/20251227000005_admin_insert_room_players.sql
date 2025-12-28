-- Allow admins to insert any room_players
CREATE POLICY "Admins can insert room players"
    ON room_players FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM players
            WHERE players.id = auth.uid()
            AND players.is_admin = TRUE
        )
    );

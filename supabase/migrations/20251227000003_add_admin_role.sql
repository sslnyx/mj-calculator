-- Add admin role to players
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Set sslnyx@gmail.com as admin
UPDATE players SET is_admin = TRUE WHERE email = 'sslnyx@gmail.com';

-- Allow admins to delete any table
CREATE POLICY "Admins can delete any room"
    ON game_rooms FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM players
            WHERE players.id = auth.uid()
            AND players.is_admin = TRUE
        )
    );

-- Allow admins to update any room
CREATE POLICY "Admins can update any room"
    ON game_rooms FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM players
            WHERE players.id = auth.uid()
            AND players.is_admin = TRUE
        )
    );

-- Allow admins to delete room_players
CREATE POLICY "Admins can delete room players"
    ON room_players FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM players
            WHERE players.id = auth.uid()
            AND players.is_admin = TRUE
        )
    );

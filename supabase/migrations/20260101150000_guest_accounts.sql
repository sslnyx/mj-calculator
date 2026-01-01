-- ============================================
-- Guest Accounts Support
-- ============================================

-- 1. Make email optional for guest players
ALTER TABLE players ALTER COLUMN email DROP NOT NULL;

-- 2. Add is_guest flag
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE;

-- 3. Create owner_players join table for shared guest ownership
CREATE TABLE IF NOT EXISTS owner_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(owner_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_owner_players_owner ON owner_players(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_players_player ON owner_players(player_id);

-- 4. RLS for owner_players
ALTER TABLE owner_players ENABLE ROW LEVEL SECURITY;

-- Everyone can view owner_players (needed for guest lookup)
CREATE POLICY "Owner players viewable by everyone"
    ON owner_players FOR SELECT
    USING (true);

-- Users can insert their own ownership records
CREATE POLICY "Users can add guest ownership"
    ON owner_players FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Users can delete their own ownership records
CREATE POLICY "Users can remove guest ownership"
    ON owner_players FOR DELETE
    USING (auth.uid() = owner_id);

-- 5. Update players RLS to allow updating guests you own
CREATE POLICY "Owners can update their guests"
    ON players FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM owner_players
            WHERE owner_players.player_id = players.id
            AND owner_players.owner_id = auth.uid()
        )
        OR auth.uid() = id
    );

-- 6. Allow inserting guest players (for creating new guests)
CREATE POLICY "Users can create guest players"
    ON players FOR INSERT
    WITH CHECK (
        is_guest = true OR auth.uid() = id
    );

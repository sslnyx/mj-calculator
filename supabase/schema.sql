-- ============================================
-- Mahjong Calculator V2 - Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PLAYERS TABLE (User Accounts)
-- ============================================
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PLAYER STATS TABLE (Lifetime Statistics)
-- ============================================
CREATE TABLE player_stats (
    player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    total_games INT DEFAULT 0,
    total_wins INT DEFAULT 0,
    total_zimo INT DEFAULT 0,
    total_eat INT DEFAULT 0,
    total_points_won BIGINT DEFAULT 0,
    total_points_lost BIGINT DEFAULT 0,
    highest_fan INT DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0.00,
    -- Hexagon Warrior (六邊形戰士) stats
    total_rounds_played INT DEFAULT 0,
    total_deal_ins INT DEFAULT 0,
    total_bao INT DEFAULT 0,
    total_fan_value BIGINT DEFAULT 0,
    total_limit_hands INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_player_stats_updated_at
    BEFORE UPDATE ON player_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-create stats row when player is created
CREATE OR REPLACE FUNCTION create_player_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO player_stats (player_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_player_created
    AFTER INSERT ON players
    FOR EACH ROW
    EXECUTE FUNCTION create_player_stats();

-- ============================================
-- GAME ROOMS TABLE (Active Game Sessions)
-- ============================================
CREATE TABLE game_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code TEXT UNIQUE NOT NULL,
    host_id UUID REFERENCES players(id),
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
    current_round INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ
);

-- Index for quick room code lookup
CREATE INDEX idx_game_rooms_code ON game_rooms(room_code);
CREATE INDEX idx_game_rooms_status ON game_rooms(status);

-- ============================================
-- ROOM PLAYERS TABLE (Players in a Game Room)
-- ============================================
CREATE TABLE room_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id),
    seat_position INT CHECK (seat_position BETWEEN 1 AND 4),
    current_points INT DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, seat_position),
    UNIQUE(room_id, player_id)
);

CREATE INDEX idx_room_players_room ON room_players(room_id);
CREATE INDEX idx_room_players_player ON room_players(player_id);

-- ============================================
-- GAME ROUNDS TABLE (Individual Round Results)
-- ============================================
CREATE TABLE game_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    winner_id UUID REFERENCES players(id),
    loser_id UUID REFERENCES players(id),
    win_type TEXT NOT NULL CHECK (win_type IN ('eat', 'zimo', 'zimo_bao')),
    fan_count INT NOT NULL CHECK (fan_count BETWEEN 0 AND 13),
    points INT NOT NULL,
    bao_player_id UUID REFERENCES players(id),
    hand_patterns TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_game_rounds_room ON game_rounds(room_id);

-- ============================================
-- ROUND POINTS TABLE (Point Changes Per Round)
-- ============================================
CREATE TABLE round_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID REFERENCES game_rounds(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id),
    points_change INT NOT NULL,
    UNIQUE(round_id, player_id)
);

CREATE INDEX idx_round_points_round ON round_points(round_id);

-- ============================================
-- FAN POINTS REFERENCE TABLE
-- ============================================
CREATE TABLE fan_points (
    fan_count INT PRIMARY KEY,
    points INT NOT NULL
);

INSERT INTO fan_points (fan_count, points) VALUES
    (0, 1),    -- 雞糊 (Chicken Hand)
    (1, 2),
    (2, 4),
    (3, 8),
    (4, 16),   -- 滿糊 (Limit / Full - Low)
    (5, 24),
    (6, 32),
    (7, 48),
    (8, 64),
    (9, 96),
    (10, 128), -- 細爆 (Small Limit)
    (11, 192),
    (12, 256),
    (13, 384); -- 爆棚 (Limit / Max)

-- ============================================
-- FAN BREAKDOWN STATS (Per-fan win tracking)
-- ============================================
CREATE TABLE fan_breakdown (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    fan_count INT NOT NULL CHECK (fan_count BETWEEN 3 AND 13),
    win_count INT DEFAULT 0,
    UNIQUE(player_id, fan_count)
);

CREATE INDEX idx_fan_breakdown_player ON fan_breakdown(player_id);

-- Auto-create fan breakdown rows when player is created
CREATE OR REPLACE FUNCTION create_fan_breakdown()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO fan_breakdown (player_id, fan_count)
    SELECT NEW.id, generate_series(3, 13);
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_player_created_fan_breakdown
    AFTER INSERT ON players
    FOR EACH ROW
    EXECUTE FUNCTION create_fan_breakdown();

-- ============================================
-- PLAYER VS PLAYER STATS (Head-to-head records)
-- ============================================
CREATE TABLE player_vs_player (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    opponent_id UUID REFERENCES players(id) ON DELETE CASCADE,
    games_played INT DEFAULT 0,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    points_won BIGINT DEFAULT 0,
    points_lost BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_id, opponent_id)
);

CREATE INDEX idx_pvp_player ON player_vs_player(player_id);
CREATE INDEX idx_pvp_opponent ON player_vs_player(opponent_id);

CREATE TRIGGER update_pvp_updated_at
    BEFORE UPDATE ON player_vs_player
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE fan_points ENABLE ROW LEVEL SECURITY;

-- Players: Users can read all, but only update their own
CREATE POLICY "Players are viewable by everyone"
    ON players FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON players FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON players FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Player Stats: Users can read all, system updates
CREATE POLICY "Player stats are viewable by everyone"
    ON player_stats FOR SELECT
    USING (true);

-- Game Rooms: Anyone can view, authenticated can create
CREATE POLICY "Rooms are viewable by everyone"
    ON game_rooms FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create rooms"
    ON game_rooms FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Host can update room"
    ON game_rooms FOR UPDATE
    USING (auth.uid() = host_id);

-- Room Players: View if in room, join if authenticated
CREATE POLICY "Room players viewable by room members"
    ON room_players FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can join rooms"
    ON room_players FOR INSERT
    WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players can leave rooms"
    ON room_players FOR DELETE
    USING (auth.uid() = player_id);

-- Game Rounds: Viewable by room members
CREATE POLICY "Rounds viewable by everyone"
    ON game_rounds FOR SELECT
    USING (true);

CREATE POLICY "Room members can create rounds"
    ON game_rounds FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM room_players
            WHERE room_players.room_id = game_rounds.room_id
            AND room_players.player_id = auth.uid()
        )
    );

-- Round Points: Viewable by everyone
CREATE POLICY "Round points viewable by everyone"
    ON round_points FOR SELECT
    USING (true);

CREATE POLICY "System can insert round points"
    ON round_points FOR INSERT
    WITH CHECK (true);

-- Fan Points: Read only for everyone
CREATE POLICY "Fan points readable by everyone"
    ON fan_points FOR SELECT
    USING (true);

-- Fan Breakdown: Viewable by everyone
ALTER TABLE fan_breakdown ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fan breakdown viewable by everyone"
    ON fan_breakdown FOR SELECT
    USING (true);

CREATE POLICY "System can update fan breakdown"
    ON fan_breakdown FOR UPDATE
    USING (true);

-- Player vs Player: Viewable by everyone
ALTER TABLE player_vs_player ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PvP stats viewable by everyone"
    ON player_vs_player FOR SELECT
    USING (true);

CREATE POLICY "System can insert PvP stats"
    ON player_vs_player FOR INSERT
    WITH CHECK (true);

CREATE POLICY "System can update PvP stats"
    ON player_vs_player FOR UPDATE
    USING (true);

-- ============================================
-- ENABLE REALTIME FOR KEY TABLES
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;

-- ============================================
-- FUNCTION: Auto-delete rooms after 24 hours
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_rooms()
RETURNS void AS $$
BEGIN
    UPDATE game_rooms
    SET status = 'completed', ended_at = NOW()
    WHERE status IN ('waiting', 'active')
    AND created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Note: Set up a cron job in Supabase Dashboard > Database > Extensions > pg_cron
-- SELECT cron.schedule('cleanup-rooms', '0 * * * *', 'SELECT cleanup_old_rooms();');


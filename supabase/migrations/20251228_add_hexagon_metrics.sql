-- Add missing columns to player_stats for hexagon warrior metrics
-- Existing columns: player_id, total_games, total_wins, total_zimo, total_eat, 
--                   total_points_won, total_points_lost, highest_fan, win_rate, updated_at

-- Only add columns that don't exist yet
ALTER TABLE player_stats 
ADD COLUMN IF NOT EXISTS total_fan_value INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_deal_ins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_bao INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_limit_hands INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN player_stats.total_fan_value IS 'Cumulative fan value from all wins';
COMMENT ON COLUMN player_stats.total_deal_ins IS 'Number of times dealt into someone else winning';
COMMENT ON COLUMN player_stats.total_bao IS 'Number of times responsible for bao (包) payment';
COMMENT ON COLUMN player_stats.total_limit_hands IS 'Number of limit hands (10+ fan) achieved';

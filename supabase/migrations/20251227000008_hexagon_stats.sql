-- ============================================
-- Add Hexagon Warrior stats columns to player_stats
-- ============================================

-- New columns for advanced player metrics
ALTER TABLE player_stats
ADD COLUMN IF NOT EXISTS total_rounds_played INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_deal_ins INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_bao INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_fan_value BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_limit_hands INT DEFAULT 0;

-- Comment: These columns support the "Hexagon Warrior" (六邊形戰士) profile feature
-- total_rounds_played: Divisor for rate calculations (Win Rate, Deal-in Rate)
-- total_deal_ins: Count of times player dealt in (lost by Dianpao)
-- total_bao: Count of times player was responsible for Bao (Feeding)
-- total_fan_value: Sum of fan values from all wins (for Avg Fan calculation)
-- total_limit_hands: Count of wins with Fan >= 10 (Small Limit and above)

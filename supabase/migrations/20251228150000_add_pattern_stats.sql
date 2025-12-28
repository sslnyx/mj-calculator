-- Add hand pattern tracking to player_stats
-- Stores a JSON object with pattern_id -> count mapping

ALTER TABLE player_stats 
ADD COLUMN IF NOT EXISTS hand_pattern_counts JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN player_stats.hand_pattern_counts IS 'JSON object tracking how many times each hand pattern was won, e.g. {"dui_dui_hu": 5, "qing_yi_se": 2}';

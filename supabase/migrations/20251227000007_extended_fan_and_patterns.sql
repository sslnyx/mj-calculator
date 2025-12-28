-- Migration: Update fan_points table and add hand_patterns to game_rounds
-- Created: 2025-12-27

-- ============================================
-- 1. Update FAN_POINTS table with 0-13 scale
-- ============================================

-- First, clear existing data
TRUNCATE TABLE fan_points;

-- Insert updated values matching HK Mahjong scoring
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
-- 2. Update game_rounds table
-- ============================================

-- Modify fan_count constraint to allow 0-13
ALTER TABLE game_rounds 
    DROP CONSTRAINT IF EXISTS game_rounds_fan_count_check;

ALTER TABLE game_rounds 
    ADD CONSTRAINT game_rounds_fan_count_check 
    CHECK (fan_count BETWEEN 0 AND 13);

-- Add hand_patterns column for tracking specific win types
ALTER TABLE game_rounds 
    ADD COLUMN IF NOT EXISTS hand_patterns TEXT[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN game_rounds.hand_patterns IS 'Array of hand pattern codes, e.g. ["qing_yi_se", "dui_dui_hu"]';

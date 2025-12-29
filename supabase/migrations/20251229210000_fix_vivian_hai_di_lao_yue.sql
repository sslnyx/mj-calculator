-- Fix Vivian Ho's 十三幺 record to include 海底撈月
-- Round played at 2025-12-29T08:08:16.829162+00:00

-- Update game round to add hai_di_lao_yue pattern
UPDATE game_rounds 
SET hand_patterns = ARRAY['shi_san_yao', 'hai_di_lao_yue'] 
WHERE id = '6a333225-6f00-40de-a7fc-0f322e0c3769';

-- Update Vivian Ho's player stats to include hai_di_lao_yue in pattern counts
UPDATE player_stats 
SET hand_pattern_counts = hand_pattern_counts || '{"hai_di_lao_yue": 1}'::jsonb
WHERE player_id = 'af50a41b-dcfc-478a-8b2a-a00f3602a31a';

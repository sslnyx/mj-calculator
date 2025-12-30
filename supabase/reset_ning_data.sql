-- Reset ning's player stats and remove test games
-- Run this in Supabase Dashboard SQL Editor

-- 1. Find ning's player ID
-- SELECT id, display_name FROM players WHERE display_name ILIKE '%ning%';
-- Expected: Ning Lee -> use that ID below

-- 2. Reset ning's stats (replace with actual ID from step 1)
UPDATE player_stats SET
  total_games = 0,
  total_wins = 0,
  total_zimo = 0,
  total_deal_ins = 0,
  total_bao = 0,
  total_points_won = 0,
  total_points_lost = 0,
  total_fan_value = 0,
  total_limit_hands = 0,
  hand_pattern_counts = '{}'
WHERE player_id = (SELECT id FROM players WHERE display_name ILIKE '%ning%' LIMIT 1);

-- 3. Delete game rounds that involve test players
DELETE FROM game_rounds WHERE 
  winner_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333')
  OR loser_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333');

-- 4. Delete room_players entries for test players  
DELETE FROM room_players WHERE player_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222', 
  '33333333-3333-3333-3333-333333333333'
);

-- 5. Delete test player stats
DELETE FROM player_stats WHERE player_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222', 
  '33333333-3333-3333-3333-333333333333'
);

-- 6. Reset room_players points for ning
UPDATE room_players SET current_points = 0
WHERE player_id = (SELECT id FROM players WHERE display_name ILIKE '%ning%' LIMIT 1);

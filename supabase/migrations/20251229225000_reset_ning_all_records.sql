-- Reset ALL play records for ning (including game rounds where ning participated)

-- Reset ning's stats completely
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

-- Delete game rounds where ning was winner or loser
DELETE FROM game_rounds WHERE 
  winner_id = (SELECT id FROM players WHERE display_name ILIKE '%ning%' LIMIT 1)
  OR loser_id = (SELECT id FROM players WHERE display_name ILIKE '%ning%' LIMIT 1);

-- Reset room points for ning
UPDATE room_players SET current_points = 0
WHERE player_id = (SELECT id FROM players WHERE display_name ILIKE '%ning%' LIMIT 1);

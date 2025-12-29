-- Add final_scores column to game_rooms to store end-of-game scores
-- Structure: { "seat1": { "player_id": "...", "player_name": "...", "points": 123 }, ... }

ALTER TABLE game_rooms
ADD COLUMN IF NOT EXISTS final_scores JSONB DEFAULT NULL;

COMMENT ON COLUMN game_rooms.final_scores IS 'Stores final scores by seat when game ends: { seat1: {player_id, player_name, points}, ... }';

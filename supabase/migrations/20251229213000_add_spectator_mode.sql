-- Add spectator support to room_players
-- Spectators can join and watch the game but don't have a seat position

ALTER TABLE room_players
ADD COLUMN IF NOT EXISTS is_spectator BOOLEAN DEFAULT FALSE;

-- Update the unique constraint to allow spectators (who don't have seat positions)
-- Spectators will have seat_position = NULL

COMMENT ON COLUMN room_players.is_spectator IS 'If true, this player is watching the game without participating';

-- Allow spectators to be added without seat position
-- Update the seat_position constraint to allow NULL for spectators
ALTER TABLE room_players 
ALTER COLUMN seat_position DROP NOT NULL;

-- Add player info columns to vacated_seats table
-- This allows tracking which player left and their name for final scores

ALTER TABLE vacated_seats 
ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES players(id),
ADD COLUMN IF NOT EXISTS player_name TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vacated_seats_room_id ON vacated_seats(room_id);

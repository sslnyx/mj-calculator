-- Table to store seat data when a player leaves an active game
-- This allows the next player who takes the seat to inherit the points

CREATE TABLE IF NOT EXISTS vacated_seats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
    seat_position INTEGER NOT NULL CHECK (seat_position BETWEEN 1 AND 4),
    current_points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (room_id, seat_position)
);

-- Enable RLS
ALTER TABLE vacated_seats ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read vacated seats
CREATE POLICY "Allow read vacated_seats" ON vacated_seats
    FOR SELECT USING (true);

-- Allow authenticated users to insert/update vacated seats
CREATE POLICY "Allow insert vacated_seats" ON vacated_seats
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update vacated_seats" ON vacated_seats
    FOR UPDATE USING (true);

CREATE POLICY "Allow delete vacated_seats" ON vacated_seats
    FOR DELETE USING (true);

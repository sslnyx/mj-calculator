-- Add delete policy for game_rounds table
-- Allow authenticated users to delete game rounds

CREATE POLICY "Allow delete game_rounds" ON game_rounds
    FOR DELETE USING (true);

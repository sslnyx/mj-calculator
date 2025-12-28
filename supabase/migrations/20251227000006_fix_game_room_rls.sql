-- Allow host to update their own room (start game, etc.)
CREATE POLICY "Host can update own room"
    ON game_rooms FOR UPDATE
    USING (host_id = auth.uid());

-- Allow room members to update room (for game state changes)
CREATE POLICY "Room members can update room"
    ON game_rooms FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM room_players
            WHERE room_players.room_id = game_rooms.id
            AND room_players.player_id = auth.uid()
        )
    );

-- Allow users to delete themselves from room_players
CREATE POLICY "Users can delete themselves from room"
    ON room_players FOR DELETE
    USING (player_id = auth.uid());

-- Remove unique constraint from room_code since we use room id as identifier
-- The room_code is now just a display title (搭錯線 style)

ALTER TABLE game_rooms
DROP CONSTRAINT IF EXISTS game_rooms_room_code_key;

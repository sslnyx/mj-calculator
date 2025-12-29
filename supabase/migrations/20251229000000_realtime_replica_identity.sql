-- Enable REPLICA IDENTITY FULL for realtime with filters
-- This is required for postgres_changes to work with non-PK column filters

ALTER TABLE room_players REPLICA IDENTITY FULL;
ALTER TABLE game_rounds REPLICA IDENTITY FULL;
ALTER TABLE game_rooms REPLICA IDENTITY FULL;

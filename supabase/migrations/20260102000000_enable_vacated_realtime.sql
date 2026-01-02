-- Enable Realtime for vacated_seats table
-- 1. Set REPLICA IDENTITY FULL to allow filters on room_id
-- 2. Add to supabase_realtime publication

ALTER TABLE vacated_seats REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE vacated_seats;

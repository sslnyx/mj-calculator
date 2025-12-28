-- Auto-close tables when last player leaves
CREATE OR REPLACE FUNCTION close_empty_table()
RETURNS TRIGGER AS $$
DECLARE
    player_count INT;
BEGIN
    -- Count remaining players in the room
    SELECT COUNT(*) INTO player_count
    FROM room_players
    WHERE room_id = OLD.room_id;
    
    -- If no players left, mark room as completed
    IF player_count = 0 THEN
        UPDATE game_rooms
        SET status = 'completed', ended_at = NOW()
        WHERE id = OLD.room_id;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger after player leaves
CREATE TRIGGER on_player_leave_check_empty
    AFTER DELETE ON room_players
    FOR EACH ROW
    EXECUTE FUNCTION close_empty_table();

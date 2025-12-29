-- Add display_name_updated_at column to track weekly name change limit
ALTER TABLE players ADD COLUMN IF NOT EXISTS display_name_updated_at TIMESTAMPTZ DEFAULT NULL;

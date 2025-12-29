-- ============================================
-- Add avatar_seed column to players table
-- This stores the seed/options for DiceBear avatar generation
-- ============================================

-- Add avatar_seed column to store DiceBear avatar configuration
ALTER TABLE players ADD COLUMN IF NOT EXISTS avatar_seed TEXT;

-- The avatar_seed will be a simple string seed that generates consistent avatars
-- Players can "randomize" their avatar by changing this seed
-- Example URL: https://api.dicebear.com/9.x/dylan/svg?seed={avatar_seed}

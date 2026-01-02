-- Ensure test players have stats rows to avoid 406 errors on .single() fetches
-- These rows were previously deleted in a cleanup migration but players remained,
-- causing frontend fetches with .single() to fail with 406 Not Acceptable.

INSERT INTO player_stats (player_id)
VALUES 
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333')
ON CONFLICT (player_id) DO NOTHING;

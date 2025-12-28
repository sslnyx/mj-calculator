-- Create 3 test players for testing
-- Using UUIDs that won't conflict with real Google auth users

INSERT INTO players (id, email, display_name, avatar_url, is_admin)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'test1@test.com', 'Player A', NULL, FALSE),
  ('22222222-2222-2222-2222-222222222222', 'test2@test.com', 'Player B', NULL, FALSE),
  ('33333333-3333-3333-3333-333333333333', 'test3@test.com', 'Player C', NULL, FALSE)
ON CONFLICT (id) DO NOTHING;

-- seed_leaderboard.sql
-- Inserts 10 fake users with realistic, static XP into users + user_stats + user_badges.
-- Level formula matches GamificationService.addXp(): level = (xp / 100) + 1
-- Run once: psql -U postgres -d digitaltwin -f seed_leaderboard.sql
-- Safe to re-run: uses INSERT ... ON CONFLICT DO NOTHING throughout.

BEGIN;

-- ── 0. Pre-flight cleanup ─────────────────────────────────────────────────────
-- Remove any orphaned records left by previous runs or incomplete migrations.
-- These DELETEs are safe no-ops if the data is already clean.
DELETE FROM user_stats        WHERE user_id NOT IN (SELECT id FROM users);
DELETE FROM user_badges       WHERE user_id NOT IN (SELECT id FROM users);
DELETE FROM health_records    WHERE user_id NOT IN (SELECT id FROM users);
DELETE FROM finance_records   WHERE user_id NOT IN (SELECT id FROM users);
DELETE FROM career_records    WHERE user_id NOT IN (SELECT id FROM users);
DELETE FROM study_sessions    WHERE user_id NOT IN (SELECT id FROM users);
DELETE FROM transaction_records WHERE user_id NOT IN (SELECT id FROM users);
-- Null out dangling import_id references (can't delete import_history rows that
-- may be referenced by other tables, so we just clear the FK instead).
UPDATE health_records  SET import_id = NULL WHERE import_id IS NOT NULL AND import_id NOT IN (SELECT id FROM import_history);
UPDATE finance_records SET import_id = NULL WHERE import_id IS NOT NULL AND import_id NOT IN (SELECT id FROM import_history);
UPDATE career_records  SET import_id = NULL WHERE import_id IS NOT NULL AND import_id NOT IN (SELECT id FROM import_history);

-- ── 1. Users ──────────────────────────────────────────────────────────────────
INSERT INTO users (id, email, password_hash, name, created_at) VALUES
  ('seed-user-01', 'aryan.kapoor@example.com',   '$2a$10$placeholder', 'Aryan Kapoor',   NOW() - INTERVAL '87 days'),
  ('seed-user-02', 'priya.nair@example.com',      '$2a$10$placeholder', 'Priya Nair',     NOW() - INTERVAL '74 days'),
  ('seed-user-03', 'rohan.mehta@example.com',     '$2a$10$placeholder', 'Rohan Mehta',    NOW() - INTERVAL '61 days'),
  ('seed-user-04', 'ananya.sharma@example.com',   '$2a$10$placeholder', 'Ananya Sharma',  NOW() - INTERVAL '55 days'),
  ('seed-user-05', 'dev.patel@example.com',       '$2a$10$placeholder', 'Dev Patel',      NOW() - INTERVAL '48 days'),
  ('seed-user-06', 'ishaan.gupta@example.com',    '$2a$10$placeholder', 'Ishaan Gupta',   NOW() - INTERVAL '42 days'),
  ('seed-user-07', 'kavya.reddy@example.com',     '$2a$10$placeholder', 'Kavya Reddy',    NOW() - INTERVAL '35 days'),
  ('seed-user-08', 'nikhil.joshi@example.com',    '$2a$10$placeholder', 'Nikhil Joshi',   NOW() - INTERVAL '29 days'),
  ('seed-user-09', 'sanya.iyer@example.com',      '$2a$10$placeholder', 'Sanya Iyer',     NOW() - INTERVAL '21 days'),
  ('seed-user-10', 'tanvi.singh@example.com',     '$2a$10$placeholder', 'Tanvi Singh',    NOW() - INTERVAL '14 days')
ON CONFLICT (id) DO NOTHING;

-- ── 2. UserStats ──────────────────────────────────────────────────────────────
-- xp values are hand-picked to spread across levels 3-18 (level = xp/100 + 1).
-- streak values are plausible given account age.
INSERT INTO user_stats (
    user_id, xp, level,
    current_streak, longest_streak,
    last_activity_date,
    total_health_logs, total_finance_logs, total_career_logs, total_goals_completed,
    created_at, updated_at
) VALUES
  ('seed-user-01', 1740, 18, 34, 42, CURRENT_DATE - 1,  87, 62, 74, 9,  NOW() - INTERVAL '87 days', NOW() - INTERVAL '1 day'),
  ('seed-user-02', 1520, 16, 27, 31, CURRENT_DATE - 1,  74, 55, 61, 7,  NOW() - INTERVAL '74 days', NOW() - INTERVAL '1 day'),
  ('seed-user-03', 1280, 13, 19, 24, CURRENT_DATE - 2,  61, 43, 58, 6,  NOW() - INTERVAL '61 days', NOW() - INTERVAL '2 days'),
  ('seed-user-04', 1070, 11, 22, 28, CURRENT_DATE - 1,  55, 38, 49, 5,  NOW() - INTERVAL '55 days', NOW() - INTERVAL '1 day'),
  ('seed-user-05',  890, 9,  15, 20, CURRENT_DATE - 2,  48, 31, 42, 4,  NOW() - INTERVAL '48 days', NOW() - INTERVAL '2 days'),
  ('seed-user-06',  720, 8,  11, 17, CURRENT_DATE - 1,  42, 27, 36, 3,  NOW() - INTERVAL '42 days', NOW() - INTERVAL '1 day'),
  ('seed-user-07',  580, 6,   9, 14, CURRENT_DATE - 3,  35, 22, 30, 3,  NOW() - INTERVAL '35 days', NOW() - INTERVAL '3 days'),
  ('seed-user-08',  430, 5,   7, 10, CURRENT_DATE - 2,  29, 18, 24, 2,  NOW() - INTERVAL '29 days', NOW() - INTERVAL '2 days'),
  ('seed-user-09',  260, 3,   4,  7, CURRENT_DATE - 1,  21, 12, 17, 1,  NOW() - INTERVAL '21 days', NOW() - INTERVAL '1 day'),
  ('seed-user-10',  150, 2,   3,  5, CURRENT_DATE - 1,  14,  8, 11, 0,  NOW() - INTERVAL '14 days', NOW() - INTERVAL '1 day')
ON CONFLICT (user_id) DO NOTHING;

-- ── 3. UserBadges ─────────────────────────────────────────────────────────────
-- Higher-ranked users have more badges. Badge set is consistent with their log counts.
INSERT INTO user_badges (user_id, badge_id, badge_name, description, domain, icon, earned_at) VALUES
  -- Aryan (rank 1) — 9 badges
  ('seed-user-01', 'first_log',      'First Step',      'Logged your first entry',          'health',   '🌱', NOW() - INTERVAL '87 days'),
  ('seed-user-01', 'week_warrior',   'Week Warrior',    '7-day activity streak',             'general',  '🔥', NOW() - INTERVAL '80 days'),
  ('seed-user-01', 'month_warrior',  'Month Warrior',   '30-day activity streak',            'general',  '⚡', NOW() - INTERVAL '57 days'),
  ('seed-user-01', 'health_hero',    'Health Hero',     '50 health logs',                    'health',   '💚', NOW() - INTERVAL '40 days'),
  ('seed-user-01', 'finance_pro',    'Finance Pro',     '50 finance logs',                   'finance',  '💰', NOW() - INTERVAL '35 days'),
  ('seed-user-01', 'career_ace',     'Career Ace',      '50 career logs',                    'career',   '🎯', NOW() - INTERVAL '30 days'),
  ('seed-user-01', 'goal_setter',    'Goal Setter',     'Created your first goal',           'general',  '🎯', NOW() - INTERVAL '85 days'),
  ('seed-user-01', 'goal_crusher',   'Goal Crusher',    'Completed 5 goals',                 'general',  '🏆', NOW() - INTERVAL '20 days'),
  ('seed-user-01', 'data_master',    'Data Master',     'Logged in all 3 domains',           'general',  '🧠', NOW() - INTERVAL '60 days'),

  -- Priya (rank 2) — 7 badges
  ('seed-user-02', 'first_log',      'First Step',      'Logged your first entry',          'health',   '🌱', NOW() - INTERVAL '74 days'),
  ('seed-user-02', 'week_warrior',   'Week Warrior',    '7-day activity streak',             'general',  '🔥', NOW() - INTERVAL '67 days'),
  ('seed-user-02', 'month_warrior',  'Month Warrior',   '30-day activity streak',            'general',  '⚡', NOW() - INTERVAL '44 days'),
  ('seed-user-02', 'health_hero',    'Health Hero',     '50 health logs',                    'health',   '💚', NOW() - INTERVAL '30 days'),
  ('seed-user-02', 'goal_setter',    'Goal Setter',     'Created your first goal',           'general',  '🎯', NOW() - INTERVAL '72 days'),
  ('seed-user-02', 'goal_crusher',   'Goal Crusher',    'Completed 5 goals',                 'general',  '🏆', NOW() - INTERVAL '15 days'),
  ('seed-user-02', 'data_master',    'Data Master',     'Logged in all 3 domains',           'general',  '🧠', NOW() - INTERVAL '50 days'),

  -- Rohan (rank 3) — 6 badges
  ('seed-user-03', 'first_log',      'First Step',      'Logged your first entry',          'career',   '🌱', NOW() - INTERVAL '61 days'),
  ('seed-user-03', 'week_warrior',   'Week Warrior',    '7-day activity streak',             'general',  '🔥', NOW() - INTERVAL '54 days'),
  ('seed-user-03', 'career_ace',     'Career Ace',      '50 career logs',                    'career',   '🎯', NOW() - INTERVAL '20 days'),
  ('seed-user-03', 'goal_setter',    'Goal Setter',     'Created your first goal',           'general',  '🎯', NOW() - INTERVAL '59 days'),
  ('seed-user-03', 'goal_crusher',   'Goal Crusher',    'Completed 5 goals',                 'general',  '🏆', NOW() - INTERVAL '10 days'),
  ('seed-user-03', 'data_master',    'Data Master',     'Logged in all 3 domains',           'general',  '🧠', NOW() - INTERVAL '40 days'),

  -- Ananya (rank 4) — 5 badges
  ('seed-user-04', 'first_log',      'First Step',      'Logged your first entry',          'finance',  '🌱', NOW() - INTERVAL '55 days'),
  ('seed-user-04', 'week_warrior',   'Week Warrior',    '7-day activity streak',             'general',  '🔥', NOW() - INTERVAL '48 days'),
  ('seed-user-04', 'finance_pro',    'Finance Pro',     '30 finance logs',                   'finance',  '💰', NOW() - INTERVAL '25 days'),
  ('seed-user-04', 'goal_setter',    'Goal Setter',     'Created your first goal',           'general',  '🎯', NOW() - INTERVAL '53 days'),
  ('seed-user-04', 'data_master',    'Data Master',     'Logged in all 3 domains',           'general',  '🧠', NOW() - INTERVAL '35 days'),

  -- Dev (rank 5) — 4 badges
  ('seed-user-05', 'first_log',      'First Step',      'Logged your first entry',          'health',   '🌱', NOW() - INTERVAL '48 days'),
  ('seed-user-05', 'week_warrior',   'Week Warrior',    '7-day activity streak',             'general',  '🔥', NOW() - INTERVAL '40 days'),
  ('seed-user-05', 'goal_setter',    'Goal Setter',     'Created your first goal',           'general',  '🎯', NOW() - INTERVAL '46 days'),
  ('seed-user-05', 'data_master',    'Data Master',     'Logged in all 3 domains',           'general',  '🧠', NOW() - INTERVAL '30 days'),

  -- Ishaan (rank 6) — 3 badges
  ('seed-user-06', 'first_log',      'First Step',      'Logged your first entry',          'career',   '🌱', NOW() - INTERVAL '42 days'),
  ('seed-user-06', 'week_warrior',   'Week Warrior',    '7-day activity streak',             'general',  '🔥', NOW() - INTERVAL '35 days'),
  ('seed-user-06', 'goal_setter',    'Goal Setter',     'Created your first goal',           'general',  '🎯', NOW() - INTERVAL '40 days'),

  -- Kavya (rank 7) — 3 badges
  ('seed-user-07', 'first_log',      'First Step',      'Logged your first entry',          'health',   '🌱', NOW() - INTERVAL '35 days'),
  ('seed-user-07', 'week_warrior',   'Week Warrior',    '7-day activity streak',             'general',  '🔥', NOW() - INTERVAL '28 days'),
  ('seed-user-07', 'goal_setter',    'Goal Setter',     'Created your first goal',           'general',  '🎯', NOW() - INTERVAL '33 days'),

  -- Nikhil (rank 8) — 2 badges
  ('seed-user-08', 'first_log',      'First Step',      'Logged your first entry',          'finance',  '🌱', NOW() - INTERVAL '29 days'),
  ('seed-user-08', 'goal_setter',    'Goal Setter',     'Created your first goal',           'general',  '🎯', NOW() - INTERVAL '27 days'),

  -- Sanya (rank 9) — 2 badges
  ('seed-user-09', 'first_log',      'First Step',      'Logged your first entry',          'health',   '🌱', NOW() - INTERVAL '21 days'),
  ('seed-user-09', 'goal_setter',    'Goal Setter',     'Created your first goal',           'general',  '🎯', NOW() - INTERVAL '19 days'),

  -- Tanvi (rank 10) — 1 badge
  ('seed-user-10', 'first_log',      'First Step',      'Logged your first entry',          'career',   '🌱', NOW() - INTERVAL '14 days')
ON CONFLICT DO NOTHING;

COMMIT;

-- Verify
SELECT u.name, s.xp, s.level, s.current_streak, s.longest_streak,
       COUNT(b.id) AS badges
FROM users u
JOIN user_stats s ON s.user_id = u.id
LEFT JOIN user_badges b ON b.user_id = u.id
WHERE u.id LIKE 'seed-user-%'
GROUP BY u.name, s.xp, s.level, s.current_streak, s.longest_streak
ORDER BY s.xp DESC;

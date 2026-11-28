-- RUNNA Adaptive Running Platform — Multi-User PostgreSQL Schema

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
  ON user_sessions (user_id);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal TEXT NOT NULL,
  intent TEXT NOT NULL,
  goal_label TEXT NOT NULL,
  current_5k_minutes DOUBLE PRECISION NOT NULL,
  days_per_week SMALLINT NOT NULL,
  ramp_rate TEXT NOT NULL DEFAULT 'standard',
  start_date TEXT,
  custom_start_date TEXT,
  target_race_date TEXT NOT NULL,
  plan_weeks SMALLINT NOT NULL,
  current_week SMALLINT NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'km',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS ramp_rate TEXT NOT NULL DEFAULT 'standard';

CREATE TABLE IF NOT EXISTS user_training_weeks (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_number SMALLINT NOT NULL,
  phase_name TEXT NOT NULL,
  total_planned_km DOUBLE PRECISION NOT NULL,
  workouts_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, week_number)
);

CREATE TABLE IF NOT EXISTS user_workout_logs (
  id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  linked_workout_id TEXT,
  title TEXT NOT NULL,
  workout_type TEXT NOT NULL,
  distance_km DOUBLE PRECISION NOT NULL,
  duration_seconds INTEGER NOT NULL,
  avg_pace_str TEXT NOT NULL,
  rpe SMALLINT NOT NULL DEFAULT 6,
  source TEXT NOT NULL DEFAULT 'Manual',
  route_preset_id TEXT,
  location_name TEXT,
  weather_summary TEXT,
  notes TEXT,
  garmin_metrics_json JSONB,
  splits_json JSONB,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_user_workout_logs_completed_at
  ON user_workout_logs (user_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS user_garmin_connections (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  connected BOOLEAN NOT NULL DEFAULT FALSE,
  watch_model TEXT NOT NULL,
  athlete_account TEXT NOT NULL,
  battery_pct SMALLINT NOT NULL DEFAULT 100,
  firmware_version TEXT NOT NULL,
  auto_push_workouts BOOLEAN NOT NULL DEFAULT TRUE,
  auto_import_activities BOOLEAN NOT NULL DEFAULT TRUE,
  pace_target_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  hr_zone_guidance BOOLEAN NOT NULL DEFAULT TRUE,
  pushed_workout_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  biometrics_json JSONB NOT NULL,
  recent_activities_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

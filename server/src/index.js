import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { buildInitialSeedPayload } from './seedDefault.js';
import {
  generateSessionToken,
  hashPassword,
  verifyPassword,
} from './auth.js';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 4000);
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://runna:runna_secret@db:5432/runna_db';

const DEMO_EMAIL = 'alex@runna.demo';
const DEMO_PASSWORD = 'demo1234';

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 12,
  idleTimeoutMillis: 30000,
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));

const startedAt = Date.now();

function rowToProfile(row) {
  return {
    name: row.name,
    goal: row.goal,
    intent: row.intent,
    goalLabel: row.goal_label,
    current5kMinutes: Number(row.current_5k_minutes),
    daysPerWeek: Number(row.days_per_week),
    rampRate: row.ramp_rate || 'standard',
    startDate: row.start_date || undefined,
    customStartDate: row.custom_start_date || undefined,
    targetRaceDate: row.target_race_date,
    planWeeks: Number(row.plan_weeks),
    currentWeek: Number(row.current_week),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    unit: row.unit || 'km',
  };
}

function rowToGarmin(row) {
  return {
    connected: Boolean(row.connected),
    watchModel: row.watch_model,
    athleteAccount: row.athlete_account,
    batteryPct: Number(row.battery_pct),
    firmwareVersion: row.firmware_version,
    autoPushWorkouts: Boolean(row.auto_push_workouts),
    autoImportActivities: Boolean(row.auto_import_activities),
    paceTargetAlerts: Boolean(row.pace_target_alerts),
    hrZoneGuidance: Boolean(row.hr_zone_guidance),
    pushedWorkoutIds: row.pushed_workout_ids || [],
    biometrics: row.biometrics_json,
    recentActivities: row.recent_activities_json || [],
    lastSyncedAt:
      row.last_synced_at instanceof Date
        ? row.last_synced_at.toISOString()
        : String(row.last_synced_at),
  };
}

async function syncPlanWorkoutsToLogs(client, userId, weeks) {
  for (const wk of weeks) {
    for (const wo of wk.workouts || []) {
      const logId = `plan-${wo.id}`;
      if (wo.completed && wo.type !== 'Rest') {
        const ld = wo.loggedData || {};
        await client.query(
          `INSERT INTO user_workout_logs (
            id, user_id, linked_workout_id, title, workout_type,
            distance_km, duration_seconds, avg_pace_str, rpe, source,
            route_preset_id, location_name, weather_summary, notes,
            garmin_metrics_json, splits_json, completed_at
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10,
            $11, $12, $13, $14,
            $15, $16, $17
          )
          ON CONFLICT (user_id, id) DO UPDATE SET
            title = EXCLUDED.title,
            workout_type = EXCLUDED.workout_type,
            distance_km = EXCLUDED.distance_km,
            duration_seconds = EXCLUDED.duration_seconds,
            avg_pace_str = EXCLUDED.avg_pace_str,
            rpe = EXCLUDED.rpe,
            source = EXCLUDED.source,
            route_preset_id = EXCLUDED.route_preset_id,
            location_name = EXCLUDED.location_name,
            weather_summary = EXCLUDED.weather_summary,
            notes = EXCLUDED.notes,
            garmin_metrics_json = EXCLUDED.garmin_metrics_json,
            splits_json = EXCLUDED.splits_json,
            completed_at = EXCLUDED.completed_at`,
          [
            logId,
            userId,
            wo.id,
            wo.title,
            wo.type,
            Number(ld.actualDistanceKm ?? wo.plannedDistanceKm ?? 5),
            Number(
              ld.actualDurationSeconds ?? (wo.estimatedDurationMin || 25) * 60
            ),
            ld.actualPaceStr || wo.targetPaceSummary || '5:00/km',
            Number(ld.rpe ?? 6),
            ld.source || 'Manual',
            ld.routePresetId || null,
            ld.locationName || null,
            ld.weatherSummary || null,
            ld.notes || null,
            ld.garminMetrics ? JSON.stringify(ld.garminMetrics) : null,
            ld.splits ? JSON.stringify(ld.splits) : null,
            ld.completedAt || new Date().toISOString(),
          ]
        );
      } else {
        await client.query(
          `DELETE FROM user_workout_logs WHERE user_id = $1 AND id = $2`,
          [userId, logId]
        );
      }
    }
  }
}

async function persistUserStateInTransaction(
  client,
  userId,
  { profile, weeks, garmin }
) {
  await client.query('BEGIN');
  try {
    if (profile && Array.isArray(weeks) && weeks.length > 0) {
      await client.query(
        `INSERT INTO user_profiles (
          user_id, name, goal, intent, goal_label, current_5k_minutes,
          days_per_week, ramp_rate, start_date, custom_start_date, target_race_date,
          plan_weeks, current_week, unit, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          name = EXCLUDED.name,
          goal = EXCLUDED.goal,
          intent = EXCLUDED.intent,
          goal_label = EXCLUDED.goal_label,
          current_5k_minutes = EXCLUDED.current_5k_minutes,
          days_per_week = EXCLUDED.days_per_week,
          ramp_rate = EXCLUDED.ramp_rate,
          start_date = EXCLUDED.start_date,
          custom_start_date = EXCLUDED.custom_start_date,
          target_race_date = EXCLUDED.target_race_date,
          plan_weeks = EXCLUDED.plan_weeks,
          current_week = EXCLUDED.current_week,
          unit = EXCLUDED.unit,
          updated_at = NOW()`,
        [
          userId,
          profile.name,
          profile.goal,
          profile.intent,
          profile.goalLabel,
          Number(profile.current5kMinutes),
          Number(profile.daysPerWeek),
          profile.rampRate || 'standard',
          profile.startDate || null,
          profile.customStartDate || null,
          profile.targetRaceDate,
          Number(profile.planWeeks),
          Number(profile.currentWeek || 1),
          profile.unit || 'km',
        ]
      );

      await client.query('DELETE FROM user_training_weeks WHERE user_id = $1', [
        userId,
      ]);
      for (const wk of weeks) {
        await client.query(
          `INSERT INTO user_training_weeks (
            user_id, week_number, phase_name, total_planned_km, workouts_json, updated_at
          ) VALUES ($1, $2, $3, $4, $5::jsonb, NOW())`,
          [
            userId,
            Number(wk.weekNumber),
            wk.phaseName,
            Number(wk.totalPlannedKm),
            JSON.stringify(wk.workouts),
          ]
        );
      }

      await client.query(
        "DELETE FROM user_workout_logs WHERE user_id = $1 AND id LIKE 'plan-%'",
        [userId]
      );
      await syncPlanWorkoutsToLogs(client, userId, weeks);
    }

    if (garmin) {
      await client.query(
        `INSERT INTO user_garmin_connections (
          user_id, connected, watch_model, athlete_account, battery_pct,
          firmware_version, auto_push_workouts, auto_import_activities,
          pace_target_alerts, hr_zone_guidance, pushed_workout_ids,
          biometrics_json, recent_activities_json, last_synced_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb, NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
          connected = EXCLUDED.connected,
          watch_model = EXCLUDED.watch_model,
          athlete_account = EXCLUDED.athlete_account,
          battery_pct = EXCLUDED.battery_pct,
          firmware_version = EXCLUDED.firmware_version,
          auto_push_workouts = EXCLUDED.auto_push_workouts,
          auto_import_activities = EXCLUDED.auto_import_activities,
          pace_target_alerts = EXCLUDED.pace_target_alerts,
          hr_zone_guidance = EXCLUDED.hr_zone_guidance,
          pushed_workout_ids = EXCLUDED.pushed_workout_ids,
          biometrics_json = EXCLUDED.biometrics_json,
          recent_activities_json = EXCLUDED.recent_activities_json,
          last_synced_at = NOW()`,
        [
          userId,
          Boolean(garmin.connected),
          garmin.watchModel,
          garmin.athleteAccount,
          Number(garmin.batteryPct ?? 100),
          garmin.firmwareVersion,
          Boolean(garmin.autoPushWorkouts),
          Boolean(garmin.autoImportActivities),
          Boolean(garmin.paceTargetAlerts),
          Boolean(garmin.hrZoneGuidance),
          JSON.stringify(garmin.pushedWorkoutIds || []),
          JSON.stringify(garmin.biometrics || {}),
          JSON.stringify(garmin.recentActivities || []),
        ]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function waitForDatabaseAndMigrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = await fs.readFile(schemaPath, 'utf8');

  for (let attempt = 1; attempt <= 25; attempt++) {
    try {
      const client = await pool.connect();
      try {
        await client.query(schemaSql);

        // Seed only the optional demo account (alex@runna.demo) if not present
        const demoCheck = await client.query(
          'SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
          [DEMO_EMAIL]
        );
        if (demoCheck.rowCount === 0) {
          console.log('[runna-api] Creating optional demo athlete account...');
          const demoHash = hashPassword(DEMO_PASSWORD);
          const inserted = await client.query(
            `INSERT INTO users (email, name, password_hash, is_demo)
             VALUES ($1, $2, $3, TRUE)
             RETURNING id`,
            [DEMO_EMAIL, 'Alex Rivera', demoHash]
          );
          const demoUserId = inserted.rows[0].id;
          const seedPayload = buildInitialSeedPayload();
          await persistUserStateInTransaction(client, demoUserId, seedPayload);
        }

        console.log('[runna-api] Connected to PostgreSQL and verified multi-user schema.');
        return;
      } finally {
        client.release();
      }
    } catch (err) {
      console.log(
        `[runna-api] Waiting for PostgreSQL (attempt ${attempt}/25): ${err.message}`
      );
      await new Promise((r) => setTimeout(r, 1200));
    }
  }
  throw new Error('Could not connect to PostgreSQL after 25 attempts.');
}

// Auth Middleware
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : '';
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const sessionRes = await pool.query(
      `SELECT u.id, u.email, u.name, u.is_demo
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = $1 AND s.expires_at > NOW()
       LIMIT 1`,
      [token]
    );

    if (sessionRes.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const row = sessionRes.rows[0];
    req.user = {
      id: Number(row.id),
      email: row.email,
      name: row.name,
      isDemo: Boolean(row.is_demo),
    };
    req.sessionToken = token;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/health — Public Diagnostics
app.get('/api/health', async (_req, res) => {
  const t0 = performance.now();
  try {
    const versionRes = await pool.query('SHOW server_version');
    const countsRes = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS athletes_count,
        (SELECT COUNT(*)::int FROM user_training_weeks) AS weeks_count,
        (SELECT COUNT(*)::int FROM user_workout_logs) AS workout_logs_count,
        (SELECT COUNT(*)::int FROM user_garmin_connections WHERE connected = TRUE) AS garmin_count
    `);
    const latencyMs = Number((performance.now() - t0).toFixed(2));

    res.json({
      status: 'ok',
      engine: `PostgreSQL ${versionRes.rows[0].server_version.split(' ')[0]}`,
      containerized: true,
      latencyMs,
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      tables: countsRes.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message,
    });
  }
});

// POST /api/auth/register — Create a completely empty new user account
app.post('/api/auth/register', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!name) {
    return res.status(400).json({ error: 'Please enter your full name.' });
  }
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1',
      [email]
    );
    if (existing.rowCount > 0) {
      return res
        .status(409)
        .json({ error: 'An account with this email already exists. Please sign in.' });
    }

    const passwordHash = hashPassword(password);
    // Insert ONLY the user record — NO pre-populated profile, weeks, workout logs, or Garmin data!
    const userInsert = await pool.query(
      `INSERT INTO users (email, name, password_hash, is_demo)
       VALUES ($1, $2, $3, FALSE)
       RETURNING id, email, name, is_demo`,
      [email, name, passwordHash]
    );

    const userRow = userInsert.rows[0];
    const token = generateSessionToken();
    await pool.query(
      `INSERT INTO user_sessions (token, user_id) VALUES ($1, $2)`,
      [token, userRow.id]
    );

    res.status(201).json({
      token,
      user: {
        id: Number(userRow.id),
        email: userRow.email,
        name: userRow.name,
        isDemo: false,
      },
    });
  } catch (err) {
    console.error('[runna-api] POST /api/auth/register failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login — Sign into an existing user account
app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: 'Please enter both email and password.' });
  }

  try {
    const userRes = await pool.query(
      'SELECT id, email, name, password_hash, is_demo FROM users WHERE LOWER(email) = $1 LIMIT 1',
      [email]
    );
    if (userRes.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const userRow = userRes.rows[0];
    if (!verifyPassword(password, userRow.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateSessionToken();
    await pool.query(
      `INSERT INTO user_sessions (token, user_id) VALUES ($1, $2)`,
      [token, userRow.id]
    );

    res.json({
      token,
      user: {
        id: Number(userRow.id),
        email: userRow.email,
        name: userRow.name,
        isDemo: Boolean(userRow.is_demo),
      },
    });
  } catch (err) {
    console.error('[runna-api] POST /api/auth/login failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout — Revoke current session token
app.post('/api/auth/logout', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM user_sessions WHERE token = $1', [
      req.sessionToken,
    ]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me — Verify current bearer session
app.get('/api/auth/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

// GET /api/bootstrap — Load authenticated user's isolated state
app.get('/api/bootstrap', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    const profileRes = await pool.query(
      'SELECT * FROM user_profiles WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    const garminRes = await pool.query(
      'SELECT * FROM user_garmin_connections WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    const logsRes = await pool.query(
      'SELECT * FROM user_workout_logs WHERE user_id = $1 ORDER BY completed_at DESC',
      [userId]
    );

    if (profileRes.rowCount === 0) {
      return res.json({
        initialized: false,
        hasPlan: false,
        user: req.user,
        weeks: [],
        garmin: garminRes.rowCount > 0 ? rowToGarmin(garminRes.rows[0]) : null,
        customWorkoutLogs: [],
      });
    }

    const weeksRes = await pool.query(
      'SELECT * FROM user_training_weeks WHERE user_id = $1 ORDER BY week_number ASC',
      [userId]
    );

    const weeks = weeksRes.rows.map((r) => ({
      weekNumber: Number(r.week_number),
      phaseName: r.phase_name,
      totalPlannedKm: Number(r.total_planned_km),
      workouts: r.workouts_json,
    }));

    res.json({
      initialized: true,
      hasPlan: weeks.length > 0,
      user: req.user,
      profile: rowToProfile(profileRes.rows[0]),
      weeks,
      garmin: garminRes.rowCount > 0 ? rowToGarmin(garminRes.rows[0]) : null,
      customWorkoutLogs: logsRes.rows
        .filter((r) => !r.id.startsWith('plan-'))
        .map((r) => ({
          id: r.id,
          linkedWorkoutId: r.linked_workout_id,
          title: r.title,
          workoutType: r.workout_type,
          distanceKm: Number(r.distance_km),
          durationSeconds: Number(r.duration_seconds),
          avgPaceStr: r.avg_pace_str,
          rpe: Number(r.rpe),
          source: r.source,
          routePresetId: r.route_preset_id,
          locationName: r.location_name,
          weatherSummary: r.weather_summary,
          notes: r.notes,
          garminMetrics: r.garmin_metrics_json,
          splits: r.splits_json,
          completedAt:
            r.completed_at instanceof Date
              ? r.completed_at.toISOString()
              : String(r.completed_at),
        })),
    });
  } catch (err) {
    console.error('[runna-api] GET /api/bootstrap failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/state — Persist authenticated user's plan & Garmin state
app.post('/api/state', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { profile, weeks, garmin } = req.body;

  const client = await pool.connect();
  try {
    await persistUserStateInTransaction(client, userId, {
      profile,
      weeks,
      garmin,
    });
    res.json({ ok: true, savedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[runna-api] POST /api/state failed:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/state — Clear authenticated user's training plan & logs
app.delete('/api/state', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM user_training_weeks WHERE user_id = $1', [
      userId,
    ]);
    await client.query('DELETE FROM user_workout_logs WHERE user_id = $1', [
      userId,
    ]);
    await client.query('DELETE FROM user_profiles WHERE user_id = $1', [
      userId,
    ]);
    await client.query(
      'DELETE FROM user_garmin_connections WHERE user_id = $1',
      [userId]
    );
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/workout-logs — Direct SQL query of authenticated user's completed workout logs
app.get('/api/workout-logs', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_workout_logs WHERE user_id = $1 ORDER BY completed_at DESC',
      [req.user.id]
    );
    res.json({ count: result.rowCount, rows: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

waitForDatabaseAndMigrate()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[runna-api] Listening on http://0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[runna-api] Fatal startup error:', err);
    process.exit(1);
  });

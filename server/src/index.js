import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { buildInitialSeedPayload } from './seedDefault.js';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 4000);
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://runna:runna_secret@db:5432/runna_db';

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 12,
  idleTimeoutMillis: 30000,
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));

const startedAt = Date.now();

async function waitForDatabaseAndMigrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = await fs.readFile(schemaPath, 'utf8');

  for (let attempt = 1; attempt <= 25; attempt++) {
    try {
      const client = await pool.connect();
      try {
        await client.query(schemaSql);
        const existing = await client.query(
          'SELECT COUNT(*)::int AS cnt FROM athletes'
        );
        if (existing.rows[0].cnt === 0) {
          console.log('[runna-api] Seeding fresh PostgreSQL database with initial athlete & 8-week plan...');
          const seedPayload = buildInitialSeedPayload();
          await persistStateInTransaction(client, seedPayload);
        }
        console.log('[runna-api] Connected to PostgreSQL and verified schema.');
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

function rowToProfile(row) {
  return {
    name: row.name,
    goal: row.goal,
    intent: row.intent,
    goalLabel: row.goal_label,
    current5kMinutes: Number(row.current_5k_minutes),
    daysPerWeek: Number(row.days_per_week),
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

async function syncPlanWorkoutsToLogs(client, athleteId, weeks) {
  // Sync completed workouts from weeks into normalized workout_logs table
  for (const wk of weeks) {
    for (const wo of wk.workouts || []) {
      const logId = `plan-${wo.id}`;
      if (wo.completed && wo.type !== 'Rest') {
        const ld = wo.loggedData || {};
        await client.query(
          `INSERT INTO workout_logs (
            id, athlete_id, linked_workout_id, title, workout_type,
            distance_km, duration_seconds, avg_pace_str, rpe, source,
            route_preset_id, location_name, weather_summary, notes,
            garmin_metrics_json, splits_json, completed_at
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10,
            $11, $12, $13, $14,
            $15, $16, $17
          )
          ON CONFLICT (id) DO UPDATE SET
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
            athleteId,
            wo.id,
            wo.title,
            wo.type,
            Number(ld.actualDistanceKm ?? wo.plannedDistanceKm ?? 5),
            Number(ld.actualDurationSeconds ?? (wo.estimatedDurationMin || 25) * 60),
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
          `DELETE FROM workout_logs WHERE id = $1 AND athlete_id = $2`,
          [logId, athleteId]
        );
      }
    }
  }
}

// GET /api/health — Live PostgreSQL & Docker Diagnostics
app.get('/api/health', async (_req, res) => {
  const t0 = performance.now();
  try {
    const versionRes = await pool.query('SHOW server_version');
    const countsRes = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM athletes) AS athletes_count,
        (SELECT COUNT(*)::int FROM training_weeks) AS weeks_count,
        (SELECT COUNT(*)::int FROM workout_logs) AS workout_logs_count,
        (SELECT COUNT(*)::int FROM garmin_connections) AS garmin_count
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

// GET /api/bootstrap — Load persisted state from PostgreSQL
app.get('/api/bootstrap', async (_req, res) => {
  try {
    const athleteRes = await pool.query(
      'SELECT * FROM athletes WHERE id = 1 LIMIT 1'
    );
    if (athleteRes.rowCount === 0) {
      return res.json({ initialized: false });
    }

    const weeksRes = await pool.query(
      'SELECT * FROM training_weeks WHERE athlete_id = 1 ORDER BY week_number ASC'
    );
    const garminRes = await pool.query(
      'SELECT * FROM garmin_connections WHERE athlete_id = 1 LIMIT 1'
    );
    const logsRes = await pool.query(
      'SELECT * FROM workout_logs WHERE athlete_id = 1 ORDER BY completed_at DESC'
    );

    const weeks = weeksRes.rows.map((r) => ({
      weekNumber: Number(r.week_number),
      phaseName: r.phase_name,
      totalPlannedKm: Number(r.total_planned_km),
      workouts: r.workouts_json,
    }));

    res.json({
      initialized: true,
      profile: rowToProfile(athleteRes.rows[0]),
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

async function persistStateInTransaction(client, { profile, weeks, garmin }) {
  await client.query('BEGIN');
  try {
    await client.query(
      `INSERT INTO athletes (
        id, name, goal, intent, goal_label, current_5k_minutes,
        days_per_week, start_date, custom_start_date, target_race_date,
        plan_weeks, current_week, unit, updated_at
      ) VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        goal = EXCLUDED.goal,
        intent = EXCLUDED.intent,
        goal_label = EXCLUDED.goal_label,
        current_5k_minutes = EXCLUDED.current_5k_minutes,
        days_per_week = EXCLUDED.days_per_week,
        start_date = EXCLUDED.start_date,
        custom_start_date = EXCLUDED.custom_start_date,
        target_race_date = EXCLUDED.target_race_date,
        plan_weeks = EXCLUDED.plan_weeks,
        current_week = EXCLUDED.current_week,
        unit = EXCLUDED.unit,
        updated_at = NOW()`,
      [
        profile.name,
        profile.goal,
        profile.intent,
        profile.goalLabel,
        Number(profile.current5kMinutes),
        Number(profile.daysPerWeek),
        profile.startDate || null,
        profile.customStartDate || null,
        profile.targetRaceDate,
        Number(profile.planWeeks),
        Number(profile.currentWeek || 1),
        profile.unit || 'km',
      ]
    );

    await client.query('DELETE FROM training_weeks WHERE athlete_id = 1');
    for (const wk of weeks) {
      await client.query(
        `INSERT INTO training_weeks (
          athlete_id, week_number, phase_name, total_planned_km, workouts_json, updated_at
        ) VALUES (1, $1, $2, $3, $4::jsonb, NOW())`,
        [
          Number(wk.weekNumber),
          wk.phaseName,
          Number(wk.totalPlannedKm),
          JSON.stringify(wk.workouts),
        ]
      );
    }

    await client.query(
      "DELETE FROM workout_logs WHERE athlete_id = 1 AND id LIKE 'plan-%'"
    );
    await syncPlanWorkoutsToLogs(client, 1, weeks);

    if (garmin) {
      await client.query(
        `INSERT INTO garmin_connections (
          athlete_id, connected, watch_model, athlete_account, battery_pct,
          firmware_version, auto_push_workouts, auto_import_activities,
          pace_target_alerts, hr_zone_guidance, pushed_workout_ids,
          biometrics_json, recent_activities_json, last_synced_at
        ) VALUES (
          1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, NOW()
        )
        ON CONFLICT (athlete_id) DO UPDATE SET
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
          Boolean(garmin.connected),
          garmin.watchModel,
          garmin.athleteAccount,
          Number(garmin.batteryPct || 86),
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

// POST /api/state — Persist full athlete + plan + garmin state into PostgreSQL
app.post('/api/state', async (req, res) => {
  const { profile, weeks, garmin } = req.body;
  if (!profile || !Array.isArray(weeks)) {
    return res.status(400).json({ error: 'Missing profile or weeks payload' });
  }

  const client = await pool.connect();
  try {
    await persistStateInTransaction(client, { profile, weeks, garmin });
    res.json({ ok: true, savedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[runna-api] POST /api/state failed:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/workout-logs — Direct SQL query of normalized completed workout logs
app.get('/api/workout-logs', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM workout_logs WHERE athlete_id = 1 ORDER BY completed_at DESC'
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

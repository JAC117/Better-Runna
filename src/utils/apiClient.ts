import type {
  GarminIntegrationState,
  TrainingWeek,
  UserProfile,
} from '../types';

export interface DbHealthResponse {
  status: 'ok' | 'error';
  engine?: string;
  containerized?: boolean;
  latencyMs?: number;
  uptimeSeconds?: number;
  tables?: {
    athletes_count: number;
    weeks_count: number;
    workout_logs_count: number;
    garmin_count: number;
  };
  timestamp?: string;
  message?: string;
}

export interface BootstrapResponse {
  initialized: boolean;
  profile?: UserProfile;
  weeks?: TrainingWeek[];
  garmin?: GarminIntegrationState | null;
}

export interface SqlWorkoutLogRow {
  id: string;
  linked_workout_id: string | null;
  title: string;
  workout_type: string;
  distance_km: number;
  duration_seconds: number;
  avg_pace_str: string;
  rpe: number;
  source: string;
  completed_at: string;
}

export async function fetchDbHealth(): Promise<DbHealthResponse | null> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return null;
    return (await res.json()) as DbHealthResponse;
  } catch {
    return null;
  }
}

export async function fetchBootstrapState(): Promise<BootstrapResponse | null> {
  try {
    const res = await fetch('/api/bootstrap');
    if (!res.ok) return null;
    return (await res.json()) as BootstrapResponse;
  } catch {
    return null;
  }
}

export async function saveFullStateToDb(payload: {
  profile: UserProfile;
  weeks: TrainingWeek[];
  garmin: GarminIntegrationState;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchSqlWorkoutLogs(): Promise<SqlWorkoutLogRow[]> {
  try {
    const res = await fetch('/api/workout-logs');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.rows) ? data.rows : [];
  } catch {
    return [];
  }
}

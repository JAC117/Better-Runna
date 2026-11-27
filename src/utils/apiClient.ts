import type {
  AuthUser,
  GarminIntegrationState,
  TrainingWeek,
  UserProfile,
} from '../types';

const AUTH_TOKEN_KEY = 'runna_auth_session_token_v1';

export function getStoredAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

function getAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getStoredAuthToken();
  return token
    ? { ...extra, Authorization: `Bearer ${token}` }
    : { ...extra };
}

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
  hasPlan?: boolean;
  user?: AuthUser;
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

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export async function registerAccount(payload: {
  name: string;
  email: string;
  password: string;
}): Promise<{ data?: AuthResponse; error?: string }> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) {
      return { error: body.error || 'Registration failed.' };
    }
    setStoredAuthToken(body.token);
    return { data: body as AuthResponse };
  } catch {
    return { error: 'Network error connecting to backend server.' };
  }
}

export async function loginAccount(payload: {
  email: string;
  password: string;
}): Promise<{ data?: AuthResponse; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) {
      return { error: body.error || 'Sign in failed.' };
    }
    setStoredAuthToken(body.token);
    return { data: body as AuthResponse };
  } catch {
    return { error: 'Network error connecting to backend server.' };
  }
}

export async function logoutAccount(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch {
    // ignore network errors on logout
  } finally {
    setStoredAuthToken(null);
  }
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = getStoredAuthToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/auth/me', {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      if (res.status === 401) setStoredAuthToken(null);
      return null;
    }
    const body = await res.json();
    return body.user as AuthUser;
  } catch {
    return null;
  }
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
    const res = await fetch('/api/bootstrap', {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    return (await res.json()) as BootstrapResponse;
  } catch {
    return null;
  }
}

export async function saveFullStateToDb(payload: {
  profile: UserProfile | null;
  weeks: TrainingWeek[];
  garmin: GarminIntegrationState;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/state', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function clearUserStateInDb(): Promise<boolean> {
  try {
    const res = await fetch('/api/state', {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchSqlWorkoutLogs(): Promise<SqlWorkoutLogRow[]> {
  try {
    const res = await fetch('/api/workout-logs', {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.rows) ? data.rows : [];
  } catch {
    return [];
  }
}

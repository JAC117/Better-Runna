export interface AuthUser {
  id: number;
  name: string;
  email: string;
  isDemo: boolean;
}

export type RaceGoal = '5K' | '10K' | 'Half Marathon' | 'Marathon' | 'General Fitness';

export type GoalIntent = 'complete' | 'improve';

export type RampRate = 'low' | 'standard' | 'high';

export type FitnessTier = 'Beginner' | 'Intermediate' | 'Competitive' | 'Advanced';

export type WorkoutType = 'Easy Run' | 'Tempo' | 'Intervals' | 'Long Run' | 'Rest' | 'Race Day';

export interface UserProfile {
  name: string;
  goal: RaceGoal;
  intent: GoalIntent;
  goalLabel: string; // e.g., "Improve 5K Time", "Run a 10K"
  current5kMinutes: number; // e.g. 25.0 (25:00 5K equivalent)
  daysPerWeek: 3 | 4 | 5 | 6;
  rampRate?: RampRate; // 'low' (~6%/wk) | 'standard' (~10%/wk) | 'high' (~13%/wk)
  startDate: string; // YYYY-MM-DD (synced to current date unless customStartDate is set)
  customStartDate?: string; // Optional YYYY-MM-DD override chosen by user
  targetRaceDate: string; // YYYY-MM-DD
  planWeeks: number;
  currentWeek: number;
  createdAt: string;
  unit: 'km' | 'mi';
}

export interface WorkoutSegment {
  id: string;
  type: 'Warmup' | 'Work' | 'Recovery' | 'Cooldown' | 'Steady';
  title: string;
  distanceKm?: number;
  durationSeconds?: number;
  repeats?: number;
  targetPaceMinPerKm?: string; // e.g., "4:35 - 4:45/km"
  targetPaceSecPerKm?: number;
  restDurationSeconds?: number;
  description: string;
}

export type RouteMapPresetId =
  | 'waterfront-embarcadero'
  | 'track-kezar-oval'
  | 'golden-gate-park-loop'
  | 'presidio-coastal-ridge'
  | 'marina-bay-bridge';

export interface GpsPoint {
  lat: number;
  lng: number;
  x: number; // 0..1000 SVG map space
  y: number; // 0..560 SVG map space
  distanceKm: number;
  elevationM: number;
  paceSecPerKm: number;
  heartRateBpm: number;
  cadenceSpm: number;
}

export interface SplitDetail {
  km: number;
  timeSeconds: number;
  paceSecPerKm: number;
  paceStr: string;
  avgHrBpm: number;
  elevationDeltaM: number;
  x: number;
  y: number;
}

export interface LoggedRunData {
  actualDistanceKm: number;
  actualDurationSeconds: number;
  actualPaceStr: string;
  rpe: number; // 1 - 10 Perceived Effort
  notes?: string;
  completedAt: string;
  routePresetId?: RouteMapPresetId;
  locationName?: string;
  weatherSummary?: string;
  splits?: { km: number; timeSeconds: number; paceStr: string; avgHrBpm?: number; elevationDeltaM?: number }[];
  source?: 'Manual' | 'Live Simulator' | 'Garmin Connect';
  garminMetrics?: {
    deviceName: string;
    avgHeartRate: number;
    maxHeartRate: number;
    avgCadenceSpm: number;
    elevationGainM: number;
    trainingEffectAerobic: number;
    calories: number;
  };
}

export interface PastWorkoutRecord {
  id: string;
  linkedWorkoutId?: string;
  title: string;
  type: WorkoutType;
  dateLabel: string;
  isoDate: string;
  locationName: string;
  coordinatesLabel: string;
  weatherSummary: string;
  routePresetId: RouteMapPresetId;
  distanceKm: number;
  durationSeconds: number;
  avgPaceSecPerKm: number;
  avgPaceStr: string;
  rpe: number;
  source: 'Garmin Connect' | 'Live Simulator' | 'Manual';
  deviceName: string;
  avgHeartRate: number;
  maxHeartRate: number;
  avgCadenceSpm: number;
  elevationGainM: number;
  trainingEffectAerobic: number;
  calories: number;
  notes: string;
  coachAnalysis: string;
  gpsTrack: GpsPoint[];
  splits: SplitDetail[];
}

export interface ScheduledWorkout {
  id: string;
  weekNumber: number;
  dayOfWeek: number; // 0 = Day 1 of week .. 6 = Day 7 of week
  dayName: string; // 'Mon', 'Tue', etc.
  dateStr: string;
  isoDate?: string; // YYYY-MM-DD exact calendar date
  type: WorkoutType;
  title: string;
  subtitle: string;
  plannedDistanceKm: number;
  estimatedDurationMin: number;
  keyFocus: string;
  coachTip: string;
  targetPaceSummary: string;
  segments: WorkoutSegment[];
  completed: boolean;
  loggedData?: LoggedRunData;
  garminPushed?: boolean;
  garminPushedAt?: string;
}

export interface TrainingWeek {
  weekNumber: number;
  phaseName: string; // e.g., "Base Building", "Speed & Threshold", "Peak Volume", "Race Taper"
  totalPlannedKm: number;
  workouts: ScheduledWorkout[];
}

export interface PaceZones {
  easy: { min: number; max: number; label: string };
  marathon: { min: number; max: number; label: string };
  tempo: { min: number; max: number; label: string };
  interval: { min: number; max: number; label: string };
  repetition: { min: number; max: number; label: string };
}

export interface RacePrediction {
  distance: string;
  distanceKm: number;
  predictedTimeSeconds: number;
  formattedTime: string;
  pacePerKm: string;
}

export type GarminWatchModel =
  | 'Forerunner 265'
  | 'Forerunner 965'
  | 'Fenix 8 AMOLED'
  | 'Enduro 3'
  | 'Forerunner 165 Music';

export interface GarminActivityFeedItem {
  id: string;
  activityName: string;
  recordedAt: string;
  distanceKm: number;
  durationSeconds: number;
  avgPaceStr: string;
  avgHeartRate: number;
  maxHeartRate: number;
  avgCadenceSpm: number;
  elevationGainM: number;
  trainingEffectAerobic: number;
  calories: number;
  matchedWorkoutId?: string;
  imported: boolean;
}

export interface GarminIntegrationState {
  connected: boolean;
  watchModel: GarminWatchModel;
  athleteAccount: string;
  batteryPct: number;
  firmwareVersion: string;
  autoPushWorkouts: boolean;
  autoImportActivities: boolean;
  paceTargetAlerts: boolean;
  hrZoneGuidance: boolean;
  lastSyncedAt: string;
  pushedWorkoutIds: string[];
  biometrics: {
    garminVo2Max: number;
    trainingStatus: 'Productive' | 'Peaking' | 'Maintaining';
    hrvStatusMs: number;
    restingHrBpm: number;
    trainingReadinessScore: number;
    sleepScore: number;
    recoveryTimeHours: number;
  };
  recentActivities: GarminActivityFeedItem[];
}

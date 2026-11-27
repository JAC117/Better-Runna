import type {
  GpsPoint,
  PastWorkoutRecord,
  RouteMapPresetId,
  SplitDetail,
  TrainingWeek,
  UserProfile,
  WorkoutType,
} from '../types';
import { formatSecondsToPace } from './planGenerator';

export interface CartographicEnvironment {
  id: RouteMapPresetId;
  locationName: string;
  areaSubtitle: string;
  coordinatesLabel: string;
  baseLat: number;
  baseLng: number;
  scaleLabel: string;
  waterPaths: string[];
  parkPaths: string[];
  majorRoadPaths: string[];
  minorStreetPaths: string[];
  landmarks: {
    x: number;
    y: number;
    label: string;
    type: 'water' | 'park' | 'landmark';
  }[];
  waypoints: [number, number][];
  elevationProfileFn: (progress: number) => number;
}

export const ROUTE_ENVIRONMENTS: Record<RouteMapPresetId, CartographicEnvironment> = {
  'waterfront-embarcadero': {
    id: 'waterfront-embarcadero',
    locationName: 'Embarcadero Waterfront & Pier 39 Loop',
    areaSubtitle: 'San Francisco Bay Promenade • Flat Fast Asphalt',
    coordinatesLabel: '37.8041° N, 122.4032° W',
    baseLat: 37.8041,
    baseLng: -122.4032,
    scaleLabel: '500 m',
    waterPaths: [
      'M 0 0 L 1000 0 L 1000 260 L 860 245 L 770 210 L 680 185 L 555 155 L 420 145 L 260 155 L 120 175 L 0 190 Z',
    ],
    parkPaths: [
      'M 140 245 L 295 235 L 305 320 L 150 335 Z',
      'M 540 280 L 685 295 L 665 405 L 515 390 Z',
      'M 80 415 L 245 410 L 240 515 L 75 520 Z',
    ],
    majorRoadPaths: [
      'M 0 215 Q 290 165 560 180 T 980 285',
      'M 90 560 L 395 190',
      'M 460 560 L 690 215',
      'M 0 400 L 1000 435',
      // Piers jutting into bay
      'M 285 162 L 298 112',
      'M 365 155 L 382 104',
      'M 465 156 L 488 106',
      'M 580 168 L 610 120',
      'M 705 198 L 742 152',
    ],
    minorStreetPaths: [
      'M 120 195 L 120 560',
      'M 230 180 L 230 560',
      'M 340 170 L 340 560',
      'M 450 175 L 450 560',
      'M 560 185 L 560 560',
      'M 670 205 L 670 560',
      'M 780 235 L 780 560',
      'M 890 260 L 890 560',
      'M 0 295 L 1000 315',
      'M 0 490 L 1000 505',
    ],
    landmarks: [
      { x: 650, y: 78, label: 'SAN FRANCISCO BAY', type: 'water' },
      { x: 382, y: 92, label: 'Pier 27', type: 'landmark' },
      { x: 600, y: 345, label: 'Levi Plaza Green', type: 'park' },
      { x: 218, y: 285, label: 'Aquatic Cove', type: 'park' },
      { x: 785, y: 205, label: 'Ferry Building', type: 'landmark' },
    ],
    waypoints: [
      [155, 222],
      [285, 192],
      [435, 182],
      [585, 198],
      [735, 238],
      [835, 282],
      [810, 368],
      [675, 385],
      [530, 355],
      [385, 342],
      [245, 330],
      [165, 278],
      [155, 222],
    ],
    elevationProfileFn: (p) =>
      6 + Math.sin(p * Math.PI * 2) * 3.5 + (p > 0.55 && p < 0.78 ? 14 * Math.sin(((p - 0.55) / 0.23) * Math.PI) : 0),
  },

  'track-kezar-oval': {
    id: 'track-kezar-oval',
    locationName: 'Kezar Stadium Track & Panhandle Approach',
    areaSubtitle: 'All-Weather Polyurethane 400m Oval • Precision Splits',
    coordinatesLabel: '37.7668° N, 122.4559° W',
    baseLat: 37.7668,
    baseLng: -122.4559,
    scaleLabel: '250 m',
    waterPaths: [
      'M 80 120 Q 155 95 210 135 Q 225 185 160 195 Q 90 185 80 120 Z',
    ],
    parkPaths: [
      'M 25 40 L 975 40 L 975 465 L 25 465 Z',
    ],
    majorRoadPaths: [
      'M 0 485 L 1000 485',
      'M 0 32 L 1000 32',
      'M 290 0 L 290 560',
      'M 845 0 L 845 560',
    ],
    minorStreetPaths: [
      'M 60 265 Q 250 220 410 260',
      'M 120 485 L 120 560',
      'M 440 485 L 440 560',
      'M 610 485 L 610 560',
      'M 740 485 L 740 560',
      'M 0 530 L 1000 530',
      // Stadium outer oval border
      'M 445 165 L 685 165 A 105 105 0 0 1 685 375 L 445 375 A 105 105 0 0 1 445 165 Z',
      'M 455 190 L 675 190 A 80 80 0 0 1 675 350 L 455 350 A 80 80 0 0 1 455 190 Z',
    ],
    landmarks: [
      { x: 148, y: 152, label: 'Alvord Lake', type: 'water' },
      { x: 565, y: 272, label: 'KEZAR 400M TRACK', type: 'landmark' },
      { x: 200, y: 365, label: 'East Meadow Trail', type: 'park' },
      { x: 895, y: 245, label: 'Panhandle Greenway', type: 'park' },
    ],
    waypoints: [
      [185, 315],
      [315, 285],
      [445, 178],
      [685, 178],
      [775, 270],
      [685, 362],
      [445, 362],
      [355, 270],
      [445, 178],
      [685, 178],
      [775, 270],
      [685, 362],
      [445, 362],
      [345, 320],
      [215, 335],
    ],
    elevationProfileFn: (p) =>
      58 + (p < 0.18 ? p * 22 : p > 0.85 ? (1 - p) * 25 : 4 + Math.sin(p * Math.PI * 12) * 0.8),
  },

  'golden-gate-park-loop': {
    id: 'golden-gate-park-loop',
    locationName: 'Golden Gate Park JFK Promenade Loop',
    areaSubtitle: 'Car-Free Parkland Corridor • Rolling Canopy Hills',
    coordinatesLabel: '37.7694° N, 122.4862° W',
    baseLat: 37.7694,
    baseLng: -122.4862,
    scaleLabel: '1.0 km',
    waterPaths: [
      'M 0 0 L 95 0 L 82 560 L 0 560 Z',
      'M 385 255 Q 455 225 520 265 Q 530 325 450 335 Q 375 315 385 255 Z',
      'M 690 190 Q 735 178 760 212 Q 748 242 702 235 Z',
    ],
    parkPaths: [
      'M 95 95 L 945 95 L 945 465 L 95 465 Z',
    ],
    majorRoadPaths: [
      'M 95 95 L 980 95',
      'M 90 465 L 980 465',
      'M 92 0 L 80 560',
      'M 565 0 L 565 560',
      'M 130 235 Q 360 190 595 228 T 925 255',
      'M 130 365 Q 395 405 645 360 T 920 345',
    ],
    minorStreetPaths: [
      'M 210 0 L 210 95',
      'M 330 0 L 330 95',
      'M 450 0 L 450 95',
      'M 690 0 L 690 95',
      'M 820 0 L 820 95',
      'M 210 465 L 210 560',
      'M 330 465 L 330 560',
      'M 450 465 L 450 560',
      'M 690 465 L 690 560',
      'M 820 465 L 820 560',
      'M 0 42 L 1000 42',
      'M 0 518 L 1000 518',
    ],
    landmarks: [
      { x: 44, y: 280, label: 'OCEAN', type: 'water' },
      { x: 452, y: 292, label: 'Blue Heron Lake', type: 'water' },
      { x: 775, y: 158, label: 'Conservatory of Flowers', type: 'landmark' },
      { x: 255, y: 165, label: 'Bison Paddock', type: 'park' },
      { x: 660, y: 412, label: 'Botanical Gardens', type: 'park' },
    ],
    waypoints: [
      [855, 252],
      [720, 215],
      [560, 192],
      [395, 198],
      [235, 215],
      [138, 265],
      [155, 345],
      [295, 388],
      [465, 392],
      [635, 368],
      [795, 338],
      [875, 295],
      [855, 252],
    ],
    elevationProfileFn: (p) =>
      24 + Math.sin(p * Math.PI) * 58 + Math.sin(p * Math.PI * 5) * 8,
  },

  'presidio-coastal-ridge': {
    id: 'presidio-coastal-ridge',
    locationName: 'Presidio Crissy Field & Coastal Overlook',
    areaSubtitle: 'Dirt Trail & Bayfront Multi-Use Path • Scenic Climb',
    coordinatesLabel: '37.8039° N, 122.4647° W',
    baseLat: 37.8039,
    baseLng: -122.4647,
    scaleLabel: '750 m',
    waterPaths: [
      'M 0 0 L 1000 0 L 1000 185 L 795 198 L 595 188 L 415 162 L 245 125 L 115 155 L 0 235 Z',
    ],
    parkPaths: [
      'M 95 205 L 895 215 L 885 515 L 115 515 Z',
    ],
    majorRoadPaths: [
      // Golden Gate Bridge span at left!
      'M 238 0 L 238 480',
      'M 248 0 L 248 480',
      'M 80 285 Q 345 215 620 225 T 985 245',
      'M 145 485 Q 465 435 895 475',
    ],
    minorStreetPaths: [
      'M 320 220 Q 430 340 595 365 T 835 315',
      'M 465 215 L 485 515',
      'M 695 220 L 715 515',
      'M 0 535 L 1000 535',
    ],
    landmarks: [
      { x: 580, y: 92, label: 'GOLDEN GATE STRAIT', type: 'water' },
      { x: 182, y: 85, label: 'Golden Gate Bridge', type: 'landmark' },
      { x: 645, y: 215, label: 'Crissy Marsh', type: 'park' },
      { x: 525, y: 415, label: 'Presidio Cypress Ridge', type: 'park' },
    ],
    waypoints: [
      [785, 225],
      [620, 212],
      [445, 198],
      [275, 175],
      [225, 255],
      [285, 365],
      [435, 425],
      [615, 405],
      [755, 335],
      [815, 270],
      [785, 225],
    ],
    elevationProfileFn: (p) =>
      p < 0.36
        ? 5 + Math.sin(p * 8) * 2
        : 5 + Math.sin(((p - 0.36) / 0.64) * Math.PI) * 96,
  },

  'marina-bay-bridge': {
    id: 'marina-bay-bridge',
    locationName: 'Marina Green & Fort Mason Headland Loop',
    areaSubtitle: 'Harbor Esplanade • Tempo & Aerobic Base Route',
    coordinatesLabel: '37.8065° N, 122.4368° W',
    baseLat: 37.8065,
    baseLng: -122.4368,
    scaleLabel: '500 m',
    waterPaths: [
      'M 0 0 L 1000 0 L 1000 205 L 820 175 L 685 195 L 520 172 L 315 182 L 155 165 L 0 185 Z',
    ],
    parkPaths: [
      'M 165 195 L 545 192 L 545 275 L 165 275 Z',
      'M 675 205 L 865 195 L 865 335 L 675 335 Z',
    ],
    majorRoadPaths: [
      'M 0 295 L 1000 295',
      'M 0 435 L 1000 435',
      'M 265 185 L 265 560',
      'M 615 185 L 615 560',
    ],
    minorStreetPaths: [
      'M 135 200 L 135 560',
      'M 385 200 L 385 560',
      'M 495 200 L 495 560',
      'M 745 200 L 745 560',
      'M 885 200 L 885 560',
      'M 0 365 L 1000 365',
      'M 0 505 L 1000 505',
      // Yacht harbor jetties
      'M 245 178 L 245 135 L 310 135',
      'M 425 178 L 425 132 L 485 132',
    ],
    landmarks: [
      { x: 540, y: 78, label: 'MARINA YACHT HARBOR', type: 'water' },
      { x: 355, y: 238, label: 'Marina Green', type: 'park' },
      { x: 770, y: 268, label: 'Fort Mason Great Meadow', type: 'park' },
      { x: 215, y: 395, label: 'Palace of Fine Arts', type: 'landmark' },
    ],
    waypoints: [
      [185, 232],
      [355, 215],
      [535, 212],
      [715, 218],
      [835, 245],
      [815, 325],
      [655, 345],
      [465, 338],
      [275, 342],
      [165, 310],
      [185, 232],
    ],
    elevationProfileFn: (p) =>
      4 + (p > 0.35 && p < 0.62 ? Math.sin(((p - 0.35) / 0.27) * Math.PI) * 34 : Math.sin(p * 10) * 2.5),
  },
};

function interpolateSplinePoint(
  pts: [number, number][],
  tNorm: number
): { x: number; y: number } {
  const n = pts.length - 1;
  const scaled = Math.max(0, Math.min(n - 0.0001, tNorm * n));
  const idx = Math.floor(scaled);
  const f = scaled - idx;

  const p0 = pts[Math.max(0, idx - 1)];
  const p1 = pts[idx];
  const p2 = pts[Math.min(n, idx + 1)];
  const p3 = pts[Math.min(n, idx + 2)];

  // Catmull-Rom spline for smooth organic road/trail corners
  const f2 = f * f;
  const f3 = f2 * f;

  const x =
    0.5 *
    (2 * p1[0] +
      (-p0[0] + p2[0]) * f +
      (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * f2 +
      (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * f3);

  const y =
    0.5 *
    (2 * p1[1] +
      (-p0[1] + p2[1]) * f +
      (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * f2 +
      (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * f3);

  return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
}

export function selectPresetForWorkout(
  type: WorkoutType,
  seedIndex: number
): RouteMapPresetId {
  if (type === 'Intervals') return 'track-kezar-oval';
  if (type === 'Tempo') {
    return seedIndex % 2 === 0 ? 'waterfront-embarcadero' : 'marina-bay-bridge';
  }
  if (type === 'Long Run') {
    return seedIndex % 2 === 0 ? 'presidio-coastal-ridge' : 'golden-gate-park-loop';
  }
  const easyPresets: RouteMapPresetId[] = [
    'marina-bay-bridge',
    'golden-gate-park-loop',
    'waterfront-embarcadero',
  ];
  return easyPresets[seedIndex % easyPresets.length];
}

export function generateGpsTelemetryAndSplits(params: {
  presetId: RouteMapPresetId;
  workoutType: WorkoutType;
  distanceKm: number;
  avgPaceSecPerKm: number;
  avgHeartRate: number;
  maxHeartRate: number;
  avgCadenceSpm: number;
}): {
  gpsTrack: GpsPoint[];
  splits: SplitDetail[];
  elevationGainM: number;
} {
  const env = ROUTE_ENVIRONMENTS[params.presetId];
  const sampleCount = 76;
  const gpsTrack: GpsPoint[] = [];

  let elevationGainM = 0;
  let prevElev = env.elevationProfileFn(0);

  for (let i = 0; i < sampleCount; i++) {
    const p = i / (sampleCount - 1);
    const pos = interpolateSplinePoint(env.waypoints, p);
    const dist = Number((p * params.distanceKm).toFixed(2));
    const elev = Number(env.elevationProfileFn(p).toFixed(1));

    if (elev > prevElev) {
      elevationGainM += elev - prevElev;
    }
    prevElev = elev;

    // Realistic workout-specific pace & HR dynamics
    let paceMod = 1.0;
    let hrRatio = 0.75;

    if (params.workoutType === 'Intervals') {
      if (p < 0.18 || p > 0.84) {
        paceMod = 1.18; // Warmup / Cooldown
        hrRatio = 0.62 + p * 0.15;
      } else {
        // 6 interval surges
        const wave = Math.sin(((p - 0.18) / 0.66) * Math.PI * 12);
        paceMod = wave > -0.15 ? 0.89 : 1.24;
        hrRatio = wave > -0.15 ? 0.94 : 0.78;
      }
    } else if (params.workoutType === 'Tempo') {
      if (p < 0.2) {
        paceMod = 1.14;
        hrRatio = 0.68 + p;
      } else if (p > 0.82) {
        paceMod = 1.16;
        hrRatio = 0.76;
      } else {
        paceMod = 0.94 + Math.sin(p * 14) * 0.015;
        hrRatio = 0.87 + (p - 0.2) * 0.12;
      }
    } else if (params.workoutType === 'Long Run') {
      // Fast-finish progression after 68%
      paceMod = p < 0.68 ? 1.04 + Math.sin(p * 9) * 0.02 : 0.91;
      hrRatio = p < 0.68 ? 0.72 + p * 0.14 : 0.88 + (p - 0.68) * 0.25;
    } else {
      // Easy aerobic steady
      paceMod = 1.0 + Math.sin(p * 10) * 0.03;
      hrRatio = 0.68 + Math.min(0.18, p * 0.2) + Math.sin(p * 8) * 0.03;
    }

    const paceSec = Math.round(params.avgPaceSecPerKm * paceMod);
    const hrSpan = Math.max(16, params.maxHeartRate - (params.avgHeartRate - 18));
    const hr = Math.round(
      Math.min(
        params.maxHeartRate,
        params.avgHeartRate - 14 + hrSpan * Math.min(1, hrRatio * 0.65)
      )
    );
    const cadence = Math.round(
      params.avgCadenceSpm + (1 - paceMod) * 35 + Math.sin(p * 15) * 1.5
    );

    gpsTrack.push({
      lat: Number((env.baseLat + (280 - pos.y) * 0.000045).toFixed(5)),
      lng: Number((env.baseLng + (pos.x - 500) * 0.000055).toFixed(5)),
      x: pos.x,
      y: pos.y,
      distanceKm: dist,
      elevationM: elev,
      paceSecPerKm: paceSec,
      heartRateBpm: hr,
      cadenceSpm: cadence,
    });
  }

  // Compute integer kilometer splits along the track
  const wholeKms = Math.max(1, Math.floor(params.distanceKm));
  const splits: SplitDetail[] = [];

  for (let km = 1; km <= wholeKms; km++) {
    const startDist = km - 1;
    const endDist = km;
    const segPoints = gpsTrack.filter(
      (pt) => pt.distanceKm >= startDist && pt.distanceKm <= endDist
    );
    const fallbackPt =
      gpsTrack[
        Math.min(
          gpsTrack.length - 1,
          Math.round((km / params.distanceKm) * (gpsTrack.length - 1))
        )
      ];
    const markerPt = segPoints[segPoints.length - 1] || fallbackPt;
    const firstPt = segPoints[0] || gpsTrack[0];

    const avgSplitPace =
      segPoints.length > 0
        ? Math.round(
            segPoints.reduce((s, pt) => s + pt.paceSecPerKm, 0) /
              segPoints.length
          )
        : params.avgPaceSecPerKm;

    const avgSplitHr =
      segPoints.length > 0
        ? Math.round(
            segPoints.reduce((s, pt) => s + pt.heartRateBpm, 0) /
              segPoints.length
          )
        : params.avgHeartRate;

    splits.push({
      km,
      timeSeconds: avgSplitPace,
      paceSecPerKm: avgSplitPace,
      paceStr: `${formatSecondsToPace(avgSplitPace)}/km`,
      avgHrBpm: avgSplitHr,
      elevationDeltaM: Math.round(markerPt.elevationM - firstPt.elevationM),
      x: markerPt.x,
      y: markerPt.y,
    });
  }

  return {
    gpsTrack,
    splits,
    elevationGainM: Math.max(8, Math.round(elevationGainM)),
  };
}

export function buildPastWorkoutsList(
  weeks: TrainingWeek[],
  profile: UserProfile,
  watchModel: string
): PastWorkoutRecord[] {
  const records: PastWorkoutRecord[] = [];
  const base5kSecPerKm = (profile.current5kMinutes * 60) / 5;

  // 1. Convert all completed workouts in the active plan into mapped PastWorkoutRecords
  const completedInPlan = weeks
    .flatMap((w) => w.workouts)
    .filter((w) => w.completed && w.type !== 'Rest');

  completedInPlan.forEach((wo, idx) => {
    const dist = wo.loggedData?.actualDistanceKm || wo.plannedDistanceKm;
    const dur =
      wo.loggedData?.actualDurationSeconds ||
      Math.round(dist * base5kSecPerKm * 1.15);
    const avgPaceSec = Math.round(dur / Math.max(0.5, dist));
    const presetId =
      wo.loggedData?.routePresetId || selectPresetForWorkout(wo.type, idx);
    const env = ROUTE_ENVIRONMENTS[presetId];

    const avgHr =
      wo.loggedData?.garminMetrics?.avgHeartRate ||
      (wo.type === 'Intervals' ? 171 : wo.type === 'Tempo' ? 166 : 148);
    const maxHr =
      wo.loggedData?.garminMetrics?.maxHeartRate || avgHr + 15;
    const cadence =
      wo.loggedData?.garminMetrics?.avgCadenceSpm ||
      (wo.type === 'Intervals' ? 182 : 174);

    const generated = generateGpsTelemetryAndSplits({
      presetId,
      workoutType: wo.type,
      distanceKm: dist,
      avgPaceSecPerKm: avgPaceSec,
      avgHeartRate: avgHr,
      maxHeartRate: maxHr,
      avgCadenceSpm: cadence,
    });

    records.push({
      id: `plan-${wo.id}`,
      linkedWorkoutId: wo.id,
      title: wo.title,
      type: wo.type,
      dateLabel: `Week ${wo.weekNumber} • ${wo.dayName}, ${wo.dateStr}`,
      isoDate: wo.loggedData?.completedAt || new Date().toISOString(),
      locationName: wo.loggedData?.locationName || env.locationName,
      coordinatesLabel: env.coordinatesLabel,
      weatherSummary: wo.loggedData?.weatherSummary || '14°C • Crisp & Clear • Wind 8 km/h NW',
      routePresetId: presetId,
      distanceKm: dist,
      durationSeconds: dur,
      avgPaceSecPerKm: avgPaceSec,
      avgPaceStr: `${formatSecondsToPace(avgPaceSec)}/km`,
      rpe: wo.loggedData?.rpe || 6,
      source: wo.loggedData?.source || 'Garmin Connect',
      deviceName:
        wo.loggedData?.garminMetrics?.deviceName || `Garmin ${watchModel}`,
      avgHeartRate: avgHr,
      maxHeartRate: maxHr,
      avgCadenceSpm: cadence,
      elevationGainM:
        wo.loggedData?.garminMetrics?.elevationGainM ||
        generated.elevationGainM,
      trainingEffectAerobic:
        wo.loggedData?.garminMetrics?.trainingEffectAerobic ||
        (wo.type === 'Intervals' ? 4.2 : 3.4),
      calories:
        wo.loggedData?.garminMetrics?.calories || Math.round(dist * 64),
      notes:
        wo.loggedData?.notes ||
        'Consistent pacing throughout the main block with strong cadence control.',
      coachAnalysis: `Target zone execution rated 96%. ${wo.coachTip}`,
      gpsTrack: generated.gpsTrack,
      splits: generated.splits,
    });
  });

  // 2. Append rich recent historical GPS runs so the runner can explore diverse routes & terrain
  const historicalTemplates: {
    id: string;
    title: string;
    type: WorkoutType;
    dateLabel: string;
    daysAgo: number;
    presetId: RouteMapPresetId;
    distanceKm: number;
    paceFactor: number;
    avgHr: number;
    maxHr: number;
    cadence: number;
    rpe: number;
    te: number;
    weather: string;
    notes: string;
    coachAnalysis: string;
  }[] = [
    {
      id: 'hist-presidio-long',
      title: '12.0km Presidio Coastal Fast-Finish Long Run',
      type: 'Long Run',
      dateLabel: 'Last Sunday • 07:30 AM',
      daysAgo: 4,
      presetId: 'presidio-coastal-ridge',
      distanceKm: 12.0,
      paceFactor: 1.2,
      avgHr: 154,
      maxHr: 173,
      cadence: 175,
      rpe: 7,
      te: 4.0,
      weather: '12°C • Coastal Mist • 91% Humidity',
      notes: 'Cruised flat along Crissy Field for the first 4.5km, climbed steady up Cypress Ridge, and closed the final 3km at goal Marathon rhythm.',
      coachAnalysis: 'Textbook negative-effort progression. Heart rate stayed locked in Zone 2 until the coastal hill climb, demonstrating strong aerobic durability.',
    },
    {
      id: 'hist-waterfront-tempo',
      title: '7.5km Embarcadero Threshold Tempo',
      type: 'Tempo',
      dateLabel: 'Last Thursday • 06:15 AM',
      daysAgo: 7,
      presetId: 'waterfront-embarcadero',
      distanceKm: 7.5,
      paceFactor: 1.06,
      avgHr: 168,
      maxHr: 179,
      cadence: 179,
      rpe: 8,
      te: 4.1,
      weather: '13°C • Calm Dawn • Flat Asphalt',
      notes: 'Locked right onto threshold pace passing Pier 27. Breathing stayed 2-2 rhythmic all the way back past Levi Plaza.',
      coachAnalysis: 'Minimal cardiac drift (<2.5%) across the 4.5km continuous tempo block—a clear indicator your lactate threshold pace is improving.',
    },
    {
      id: 'hist-ggp-easy',
      title: '6.5km Golden Gate Park Canopy Recovery',
      type: 'Easy Run',
      dateLabel: '9 Days Ago • 05:20 PM',
      daysAgo: 9,
      presetId: 'golden-gate-park-loop',
      distanceKm: 6.5,
      paceFactor: 1.28,
      avgHr: 142,
      maxHr: 154,
      cadence: 172,
      rpe: 4,
      te: 2.9,
      weather: '16°C • Golden Hour Sun • Light Breeze',
      notes: 'Relaxed post-work flush around JFK Promenade and Blue Heron Lake. Kept shoulders loose and effort strictly conversational.',
      coachAnalysis: 'Ideal Zone 2 recovery discipline. Keeping easy days genuinely easy allowed full supercompensation ahead of your weekend long run.',
    },
    {
      id: 'hist-marina-intervals',
      title: '8 x 400m Marina Green Speed Flushes',
      type: 'Intervals',
      dateLabel: '12 Days Ago • 06:45 AM',
      daysAgo: 12,
      presetId: 'marina-bay-bridge',
      distanceKm: 6.0,
      paceFactor: 0.99,
      avgHr: 169,
      maxHr: 185,
      cadence: 185,
      rpe: 8,
      te: 4.3,
      weather: '11°C • Crisp Harbor Air • Zero Wind',
      notes: 'Quick turnover along the flat Marina Green esplanade. Last two 400m reps were the fastest of the morning!',
      coachAnalysis: 'Peak cadence hit 190 spm during your final intervals with rapid 60-second HR recovery drops between reps.',
    },
  ];

  historicalTemplates.forEach((item) => {
    const avgPaceSec = Math.round(base5kSecPerKm * item.paceFactor);
    const dur = Math.round(item.distanceKm * avgPaceSec);
    const env = ROUTE_ENVIRONMENTS[item.presetId];
    const generated = generateGpsTelemetryAndSplits({
      presetId: item.presetId,
      workoutType: item.type,
      distanceKm: item.distanceKm,
      avgPaceSecPerKm: avgPaceSec,
      avgHeartRate: item.avgHr,
      maxHeartRate: item.maxHr,
      avgCadenceSpm: item.cadence,
    });

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - item.daysAgo);

    records.push({
      id: item.id,
      title: item.title,
      type: item.type,
      dateLabel: item.dateLabel,
      isoDate: pastDate.toISOString(),
      locationName: env.locationName,
      coordinatesLabel: env.coordinatesLabel,
      weatherSummary: item.weather,
      routePresetId: item.presetId,
      distanceKm: item.distanceKm,
      durationSeconds: dur,
      avgPaceSecPerKm: avgPaceSec,
      avgPaceStr: `${formatSecondsToPace(avgPaceSec)}/km`,
      rpe: item.rpe,
      source: 'Garmin Connect',
      deviceName: `Garmin ${watchModel}`,
      avgHeartRate: item.avgHr,
      maxHeartRate: item.maxHr,
      avgCadenceSpm: item.cadence,
      elevationGainM: generated.elevationGainM,
      trainingEffectAerobic: item.te,
      calories: Math.round(item.distanceKm * 65),
      notes: item.notes,
      coachAnalysis: item.coachAnalysis,
      gpsTrack: generated.gpsTrack,
      splits: generated.splits,
    });
  });

  // Sort newest first
  return records.sort(
    (a, b) => new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime()
  );
}

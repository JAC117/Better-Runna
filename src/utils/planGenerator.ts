import type {
  PaceZones,
  RacePrediction,
  ScheduledWorkout,
  TrainingWeek,
  UserProfile,
  WorkoutSegment,
  WorkoutType,
} from '../types';

export function formatSecondsToPace(secPerKm: number): string {
  const rounded = Math.round(secPerKm);
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDuration(totalSeconds: number): string {
  const rounded = Math.round(totalSeconds);
  const hrs = Math.floor(rounded / 3600);
  const mins = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function calculatePaceZones(current5kMinutes: number): PaceZones {
  // Base 5K pace in seconds per km
  const base5kSecPerKm = (current5kMinutes * 60) / 5;

  const easyMin = Math.round(base5kSecPerKm * 1.24);
  const easyMax = Math.round(base5kSecPerKm * 1.34);

  const marathonMin = Math.round(base5kSecPerKm * 1.11);
  const marathonMax = Math.round(base5kSecPerKm * 1.15);

  const tempoMin = Math.round(base5kSecPerKm * 1.04);
  const tempoMax = Math.round(base5kSecPerKm * 1.07);

  const intervalMin = Math.round(base5kSecPerKm * 0.96);
  const intervalMax = Math.round(base5kSecPerKm * 0.99);

  const repMin = Math.round(base5kSecPerKm * 0.91);
  const repMax = Math.round(base5kSecPerKm * 0.94);

  return {
    easy: {
      min: easyMin,
      max: easyMax,
      label: `${formatSecondsToPace(easyMin)}–${formatSecondsToPace(easyMax)}/km`,
    },
    marathon: {
      min: marathonMin,
      max: marathonMax,
      label: `${formatSecondsToPace(marathonMin)}–${formatSecondsToPace(marathonMax)}/km`,
    },
    tempo: {
      min: tempoMin,
      max: tempoMax,
      label: `${formatSecondsToPace(tempoMin)}–${formatSecondsToPace(tempoMax)}/km`,
    },
    interval: {
      min: intervalMin,
      max: intervalMax,
      label: `${formatSecondsToPace(intervalMin)}–${formatSecondsToPace(intervalMax)}/km`,
    },
    repetition: {
      min: repMin,
      max: repMax,
      label: `${formatSecondsToPace(repMin)}–${formatSecondsToPace(repMax)}/km`,
    },
  };
}

export function calculateRacePredictions(current5kMinutes: number): RacePrediction[] {
  const t1 = current5kMinutes * 60;
  const d1 = 5.0;

  // Riegel formula: T2 = T1 * (D2 / D1)^1.06
  // Also show projected post-plan improvement (~4.5% faster)
  const distances = [
    { name: '5K', km: 5.0 },
    { name: '10K', km: 10.0 },
    { name: 'Half Marathon', km: 21.0975 },
    { name: 'Marathon', km: 42.195 },
  ];

  return distances.map((d) => {
    const predictedSec = Math.round(t1 * Math.pow(d.km / d1, 1.06));
    const paceSec = Math.round(predictedSec / d.km);
    return {
      distance: d.name,
      distanceKm: d.km,
      predictedTimeSeconds: predictedSec,
      formattedTime: formatDuration(predictedSec),
      pacePerKm: `${formatSecondsToPace(paceSec)}/km`,
    };
  });
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function getLocalTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseIsoLocal(isoDate: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate || '');
  if (!match) {
    const fallback = new Date();
    fallback.setHours(12, 0, 0, 0);
    return fallback;
  }
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    12,
    0,
    0
  );
}

export function addDaysIso(isoDate: string, days: number): string {
  const dt = parseIsoLocal(isoDate);
  dt.setDate(dt.getDate() + days);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatIsoShort(isoDate: string): string {
  return parseIsoLocal(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatIsoFull(isoDate: string): string {
  return parseIsoLocal(isoDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getMondayWeekdayIndex(isoDate: string): number {
  const jsDay = parseIsoLocal(isoDate).getDay(); // 0=Sun..6=Sat
  return jsDay === 0 ? 6 : jsDay - 1; // 0=Mon..6=Sun
}

export function resolveEffectiveStartDate(
  profile: Pick<UserProfile, 'customStartDate'>
): string {
  const custom = profile.customStartDate?.trim();
  if (custom && /^\d{4}-\d{2}-\d{2}$/.test(custom)) {
    return custom;
  }
  return getLocalTodayIso();
}

export function findActiveWeekForToday(
  weeks: TrainingWeek[],
  todayIso: string = getLocalTodayIso()
): number {
  for (const wk of weeks) {
    if (wk.workouts.some((w) => w.isoDate === todayIso)) {
      return wk.weekNumber;
    }
  }
  const firstIso = weeks[0]?.workouts[0]?.isoDate;
  if (firstIso && todayIso < firstIso) return 1;
  const lastWk = weeks[weeks.length - 1];
  const lastIso = lastWk?.workouts[lastWk.workouts.length - 1]?.isoDate;
  if (lastIso && todayIso > lastIso) return lastWk.weekNumber;
  return 1;
}

function getActiveDaysSchedule(daysPerWeek: 3 | 4 | 5 | 6): Record<number, WorkoutType> {
  // Returns map of weekdayIndex (0=Mon..6=Sun) -> WorkoutType
  switch (daysPerWeek) {
    case 3:
      return {
        0: 'Rest',
        1: 'Intervals',
        2: 'Rest',
        3: 'Tempo',
        4: 'Rest',
        5: 'Rest',
        6: 'Long Run',
      };
    case 4:
      return {
        0: 'Rest',
        1: 'Intervals',
        2: 'Rest',
        3: 'Tempo',
        4: 'Easy Run',
        5: 'Rest',
        6: 'Long Run',
      };
    case 5:
      return {
        0: 'Easy Run',
        1: 'Intervals',
        2: 'Rest',
        3: 'Tempo',
        4: 'Easy Run',
        5: 'Rest',
        6: 'Long Run',
      };
    case 6:
      return {
        0: 'Easy Run',
        1: 'Intervals',
        2: 'Easy Run',
        3: 'Tempo',
        4: 'Easy Run',
        5: 'Rest',
        6: 'Long Run',
      };
  }
}

function buildSegmentsForWorkout(
  type: WorkoutType,
  distanceKm: number,
  weekNum: number,
  zones: PaceZones
): {
  title: string;
  subtitle: string;
  keyFocus: string;
  coachTip: string;
  targetPaceSummary: string;
  segments: WorkoutSegment[];
} {
  const easyPaceMid = Math.round((zones.easy.min + zones.easy.max) / 2);
  const tempoPaceMid = Math.round((zones.tempo.min + zones.tempo.max) / 2);
  const intervalPaceMid = Math.round((zones.interval.min + zones.interval.max) / 2);
  const marathonPaceMid = Math.round((zones.marathon.min + zones.marathon.max) / 2);

  if (type === 'Rest') {
    return {
      title: 'Rest & Mobility',
      subtitle: 'Active recovery & tissue adaptation',
      keyFocus: 'Recovery & Glycogen Replenishment',
      coachTip: 'Adaptation happens while you recover. Prioritize 8 hours of sleep, hydration, and 10 minutes of light calf/hip mobility.',
      targetPaceSummary: 'Recovery Day',
      segments: [],
    };
  }

  if (type === 'Easy Run') {
    return {
      title: `Conversational Easy ${distanceKm}km`,
      subtitle: `${distanceKm}km @ ${zones.easy.label}`,
      keyFocus: 'Aerobic Base & Capillary Density',
      coachTip: 'Keep your heart rate firmly in Zone 2. You should be able to speak full sentences without gasping for air.',
      targetPaceSummary: zones.easy.label,
      segments: [
        {
          id: `seg-easy-1`,
          type: 'Steady',
          title: `${distanceKm}km Easy Aerobic Run`,
          distanceKm: distanceKm,
          targetPaceMinPerKm: zones.easy.label,
          targetPaceSecPerKm: easyPaceMid,
          description: 'Relax your shoulders, maintain a quick 170+ spm cadence, and resist the urge to push the pace.',
        },
      ],
    };
  }

  if (type === 'Intervals') {
    // Vary interval structures by week
    const variants = [
      {
        name: '800m VO2 Max Repeats',
        reps: Math.max(4, Math.min(8, Math.round((distanceKm - 2.4) / 0.8))),
        repDistKm: 0.8,
        repLabel: '800m',
        restSec: 90,
      },
      {
        name: '400m Track Speed Flushes',
        reps: Math.max(6, Math.min(12, Math.round((distanceKm - 2.4) / 0.4))),
        repDistKm: 0.4,
        repLabel: '400m',
        restSec: 60,
      },
      {
        name: '1km Speed Endurance Repeats',
        reps: Math.max(3, Math.min(6, Math.round((distanceKm - 2.0) / 1.0))),
        repDistKm: 1.0,
        repLabel: '1km',
        restSec: 90,
      },
    ];
    const v = variants[(weekNum - 1) % variants.length];
    const targetPaceSingle = `${formatSecondsToPace(intervalPaceMid)}/km`;

    return {
      title: `${v.reps} x ${v.repLabel} Speed Intervals`,
      subtitle: `1.2km Warmup • ${v.reps}x${v.repLabel} @ ${targetPaceSingle} • 1.2km Cool`,
      keyFocus: 'VO2 Max & Running Economy',
      coachTip: `Run the first repeat controlled at ${targetPaceSingle}—don't empty the tank early. Goal is even splits from rep 1 to rep ${v.reps}.`,
      targetPaceSummary: zones.interval.label,
      segments: [
        {
          id: 'seg-int-wu',
          type: 'Warmup',
          title: '1.2km Progressive Warmup + Dynamic Drills',
          distanceKm: 1.2,
          targetPaceMinPerKm: zones.easy.label,
          targetPaceSecPerKm: easyPaceMid,
          description: 'Start very gentle and finish with 3x15s high-cadence strides to prime neuromuscular recruitment.',
        },
        {
          id: 'seg-int-work',
          type: 'Work',
          title: `${v.reps} x ${v.repLabel} @ ${targetPaceSingle} (${v.restSec}s walking/jog rest)`,
          distanceKm: Number((v.reps * v.repDistKm).toFixed(1)),
          repeats: v.reps,
          restDurationSeconds: v.restSec,
          targetPaceMinPerKm: zones.interval.label,
          targetPaceSecPerKm: intervalPaceMid,
          description: `Hit ${targetPaceSingle} with tall posture and strong arm drive. Recover for ${v.restSec}s between each interval.`,
        },
        {
          id: 'seg-int-cd',
          type: 'Cooldown',
          title: '1.2km Flush Cooldown Jog',
          distanceKm: 1.2,
          targetPaceMinPerKm: zones.easy.label,
          targetPaceSecPerKm: easyPaceMid,
          description: 'Bring heart rate down gradually and clear lactate buildup.',
        },
      ],
    };
  }

  if (type === 'Tempo') {
    const wuCd = 1.5;
    const tempoDist = Math.max(2.0, Number((distanceKm - wuCd * 2).toFixed(1)));
    const tempoSingle = `${formatSecondsToPace(tempoPaceMid)}/km`;

    return {
      title: `${tempoDist}km Lactate Threshold Tempo`,
      subtitle: `1.5km Warmup • ${tempoDist}km @ ${tempoSingle} • 1.5km Cool`,
      keyFocus: 'Lactate Clearance & Threshold Stamina',
      coachTip: 'Tempo pace should feel "comfortably hard"—a pace you could hold for 45–60 minutes in a race, focusing on rhythmic breathing.',
      targetPaceSummary: zones.tempo.label,
      segments: [
        {
          id: 'seg-tmp-wu',
          type: 'Warmup',
          title: '1.5km Easy Warmup',
          distanceKm: 1.5,
          targetPaceMinPerKm: zones.easy.label,
          targetPaceSecPerKm: easyPaceMid,
          description: 'Ease into your stride and settle your breathing rhythm.',
        },
        {
          id: 'seg-tmp-work',
          type: 'Work',
          title: `${tempoDist}km Continuous Threshold Block`,
          distanceKm: tempoDist,
          targetPaceMinPerKm: zones.tempo.label,
          targetPaceSecPerKm: tempoPaceMid,
          description: `Lock into ${tempoSingle}. Avoid surging on hills; maintain steady effort.`,
        },
        {
          id: 'seg-tmp-cd',
          type: 'Cooldown',
          title: '1.5km Easy Cooldown',
          distanceKm: 1.5,
          targetPaceMinPerKm: zones.easy.label,
          targetPaceSecPerKm: easyPaceMid,
          description: 'Gentle jog to kickstart recovery.',
        },
      ],
    };
  }

  // Long Run
  const easyPortion = Number((distanceKm * 0.7).toFixed(1));
  const fastFinishPortion = Number((distanceKm - easyPortion).toFixed(1));

  return {
    title: `${distanceKm}km Progressive Long Run`,
    subtitle: `${easyPortion}km Easy → ${fastFinishPortion}km @ Marathon Pace`,
    keyFocus: 'Endurance, Fat Oxidation & Late-Race Resilience',
    coachTip: 'Practice your race-day fueling and hydration strategy. Keep the first 70% strictly conversational before picking up the final stretch.',
    targetPaceSummary: `${zones.easy.label} → ${zones.marathon.label}`,
    segments: [
      {
        id: 'seg-lr-1',
        type: 'Steady',
        title: `${easyPortion}km Conversational Endurance Block`,
        distanceKm: easyPortion,
        targetPaceMinPerKm: zones.easy.label,
        targetPaceSecPerKm: easyPaceMid,
        description: 'Settle into a sustainable rhythm and conserve glycogen stores.',
      },
      {
        id: 'seg-lr-2',
        type: 'Work',
        title: `${fastFinishPortion}km Fast-Finish Progression`,
        distanceKm: fastFinishPortion,
        targetPaceMinPerKm: zones.marathon.label,
        targetPaceSecPerKm: marathonPaceMid,
        description: 'Smoothly increase cadence to race-pace rhythm on tired legs.',
      },
    ],
  };
}

export function generateTrainingPlan(profile: UserProfile): TrainingWeek[] {
  const zones = calculatePaceZones(profile.current5kMinutes);
  const schedule = getActiveDaysSchedule(profile.daysPerWeek);

  // Base weekly volume by goal
  const baseWeeklyKmMap: Record<UserProfile['goal'], number> = {
    '5K': 22,
    '10K': 30,
    'Half Marathon': 38,
    'Marathon': 48,
    'General Fitness': 25,
  };

  const baseKm = baseWeeklyKmMap[profile.goal] * (profile.daysPerWeek / 4);
  const totalWeeks = profile.planWeeks || 8;
  const weeks: TrainingWeek[] = [];

  const todayIso = getLocalTodayIso();
  const startIso =
    profile.customStartDate?.trim() || profile.startDate?.trim() || todayIso;

  for (let w = 1; w <= totalWeeks; w++) {
    let phaseName = 'Aerobic Foundation';
    let volumeMultiplier = 1.0 + (w - 1) * 0.07;

    if (w === 4) {
      phaseName = 'Deload & Adaptation Week';
      volumeMultiplier = 0.85;
    } else if (w > 4 && w < totalWeeks - 1) {
      phaseName = 'Speed & Threshold Peak';
      volumeMultiplier = 1.12 + (w - 5) * 0.06;
    } else if (w === totalWeeks - 1) {
      phaseName = 'Sharpening & Taper';
      volumeMultiplier = 0.82;
    } else if (w === totalWeeks) {
      phaseName = 'Race Week Taper';
      volumeMultiplier = 0.6;
    }

    const weeklyTargetKm = Math.round(baseKm * volumeMultiplier);
    const workouts: ScheduledWorkout[] = [];

    // Weight distribution across active workout types
    const weights: Record<WorkoutType, number> = {
      Rest: 0,
      'Easy Run': 0.18,
      Intervals: 0.2,
      Tempo: 0.22,
      'Long Run': 0.34,
      'Race Day': 0.35,
    };

    let totalWeight = 0;
    for (let d = 0; d < 7; d++) {
      totalWeight += weights[schedule[d]];
    }

    let accumulatedKm = 0;

    for (let d = 0; d < 7; d++) {
      const workoutIso = addDaysIso(startIso, (w - 1) * 7 + d);
      const weekdayIdx = getMondayWeekdayIndex(workoutIso);
      const dateStr = formatIsoShort(workoutIso);

      const wType = schedule[weekdayIdx];
      const rawDist =
        wType === 'Rest'
          ? 0
          : Math.max(
              3.5,
              Math.round((weeklyTargetKm * (weights[wType] / totalWeight)) * 2) / 2
            );

      accumulatedKm += rawDist;

      const built = buildSegmentsForWorkout(wType, rawDist, w, zones);
      const avgPaceMin = (profile.current5kMinutes / 5) * 1.18;
      const estimatedDurationMin =
        wType === 'Rest' ? 0 : Math.round(rawDist * avgPaceMin);

      // Never pre-complete workouts on newly created user plans
      const isPreCompleted = false;
      const actualPaceSec = Math.round(
        ((profile.current5kMinutes * 60) / 5) *
          (wType === 'Intervals' ? 0.97 : 1.25)
      );
      const actualDurSec = Math.round(rawDist * actualPaceSec);

      workouts.push({
        id: `w${w}-d${d}`,
        weekNumber: w,
        dayOfWeek: d,
        dayName: DAY_NAMES[weekdayIdx],
        dateStr,
        isoDate: workoutIso,
        type: wType,
        title: built.title,
        subtitle: built.subtitle,
        plannedDistanceKm: rawDist,
        estimatedDurationMin,
        keyFocus: built.keyFocus,
        coachTip: built.coachTip,
        targetPaceSummary: built.targetPaceSummary,
        segments: built.segments,
        completed: isPreCompleted,
        loggedData: isPreCompleted
          ? {
              actualDistanceKm: rawDist,
              actualDurationSeconds: actualDurSec,
              actualPaceStr: `${formatSecondsToPace(actualPaceSec)}/km`,
              rpe: wType === 'Intervals' ? 8 : 5,
              notes:
                wType === 'Intervals'
                  ? 'Hit all splits within 2s of target pace! Legs felt snappy.'
                  : 'Smooth aerobic cruise, breathing felt super controlled.',
              completedAt: parseIsoLocal(workoutIso).toISOString(),
            }
          : undefined,
      });
    }

    weeks.push({
      weekNumber: w,
      phaseName,
      totalPlannedKm: Number(accumulatedKm.toFixed(1)),
      workouts,
    });
  }

  return weeks;
}

export function rebuildPlanPreservingLogs(
  oldWeeks: TrainingWeek[],
  updatedProfile: UserProfile
): TrainingWeek[] {
  const freshPlan = generateTrainingPlan(updatedProfile);
  const completedById = new Map<string, ScheduledWorkout['loggedData']>();
  const completedByIso = new Map<string, ScheduledWorkout['loggedData']>();

  for (const wk of oldWeeks) {
    for (const wo of wk.workouts) {
      if (wo.completed && wo.type !== 'Rest') {
        if (wo.isoDate) {
          completedByIso.set(`${wo.isoDate}::${wo.type}`, wo.loggedData);
        }
        completedById.set(`${wo.id}::${wo.type}`, wo.loggedData);
      }
    }
  }

  return freshPlan.map((wk) => ({
    ...wk,
    workouts: wk.workouts.map((wo) => {
      const matchedLog =
        (wo.isoDate && completedByIso.get(`${wo.isoDate}::${wo.type}`)) ||
        completedById.get(`${wo.id}::${wo.type}`);
      if (matchedLog) {
        return {
          ...wo,
          completed: true,
          loggedData: matchedLog,
        };
      }
      return wo;
    }),
  }));
}

export function createDefaultProfileForToday(): UserProfile {
  const todayIso = getLocalTodayIso();
  return {
    name: 'Alex Rivera',
    goal: '10K',
    intent: 'improve',
    goalLabel: 'Improve 10K Time',
    current5kMinutes: 23.5, // 23:30 5K (4:42/km base)
    daysPerWeek: 4,
    startDate: todayIso,
    customStartDate: undefined,
    targetRaceDate: addDaysIso(todayIso, 8 * 7 - 1),
    planWeeks: 8,
    currentWeek: 1,
    createdAt: new Date().toISOString(),
    unit: 'km',
  };
}

export const DEFAULT_DEMO_PROFILE: UserProfile = createDefaultProfileForToday();

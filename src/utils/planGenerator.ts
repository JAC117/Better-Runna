import type {
  FitnessTier,
  PaceZones,
  RacePrediction,
  RampRate,
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

export function getFitnessTier(current5kMinutes: number): FitnessTier {
  if (current5kMinutes >= 29.5) return 'Beginner';
  if (current5kMinutes >= 24.5) return 'Intermediate';
  if (current5kMinutes >= 20.5) return 'Competitive';
  return 'Advanced';
}

export const RAMP_CONFIGS: Record<
  RampRate,
  {
    id: RampRate;
    label: string;
    shortLabel: string;
    weeklyPctIncrease: number;
    startVolumeFactor: number;
    deloadDropFactor: number;
    peakCapFactor: number;
    description: string;
  }
> = {
  low: {
    id: 'low',
    label: 'Low Ramping (~6%/wk)',
    shortLabel: 'Low (~6%)',
    weeklyPctIncrease: 0.06,
    startVolumeFactor: 0.92,
    deloadDropFactor: 0.82,
    peakCapFactor: 0.9,
    description:
      'Gentle ~6% weekly progression with deeper recovery stepbacks. Best for beginners or injury-cautious builds.',
  },
  standard: {
    id: 'standard',
    label: 'Standard 10% Rule (~10%/wk)',
    shortLabel: 'Standard (10%)',
    weeklyPctIncrease: 0.095,
    startVolumeFactor: 1.0,
    deloadDropFactor: 0.85,
    peakCapFactor: 1.0,
    description:
      'Classic ~10% weekly progression with 4th-week adaptation stepbacks and structured taper.',
  },
  high: {
    id: 'high',
    label: 'High Ramping (~13%/wk)',
    shortLabel: 'High (~13%)',
    weeklyPctIncrease: 0.13,
    startVolumeFactor: 1.06,
    deloadDropFactor: 0.88,
    peakCapFactor: 1.1,
    description:
      'Ambitious ~13% weekly build for durable runners seeking higher peak aerobic volume.',
  },
};

interface VolumeCalibration {
  week1BaseKmFor4Days: number;
  minSessionKm: number;
  maxLongRunKm: number;
  maxWeekdayRunKm: number;
}

function getGoalVolumeCalibration(profile: UserProfile): VolumeCalibration {
  const tier = getFitnessTier(profile.current5kMinutes);
  const ramp: RampRate = profile.rampRate || 'standard';
  const rampCfg = RAMP_CONFIGS[ramp];
  const isCompleteIntent = profile.intent === 'complete';

  // Table of realistic 4-day Week 1 starting volume (km) and standard peak Long Run ceiling (km)
  const calibrationTable: Record<
    UserProfile['goal'],
    Record<FitnessTier, { w1Km: number; minKm: number; maxLongKm: number }>
  > = {
    '5K': {
      Beginner: { w1Km: 8.8, minKm: 1.8, maxLongKm: 5.0 },
      Intermediate: {
        w1Km: isCompleteIntent ? 11.2 : 14.5,
        minKm: 2.5,
        maxLongKm: isCompleteIntent ? 5.2 : 6.8,
      },
      Competitive: { w1Km: 20.0, minKm: 3.5, maxLongKm: 9.5 },
      Advanced: { w1Km: 26.0, minKm: 4.5, maxLongKm: 12.0 },
    },
    '10K': {
      Beginner: { w1Km: 13.0, minKm: 2.4, maxLongKm: 9.5 },
      Intermediate: {
        w1Km: isCompleteIntent ? 17.0 : 20.0,
        minKm: 3.2,
        maxLongKm: isCompleteIntent ? 10.2 : 11.5,
      },
      Competitive: { w1Km: 27.0, minKm: 4.5, maxLongKm: 14.0 },
      Advanced: { w1Km: 34.0, minKm: 5.5, maxLongKm: 16.5 },
    },
    'Half Marathon': {
      Beginner: { w1Km: 19.5, minKm: 3.2, maxLongKm: 18.5 },
      Intermediate: { w1Km: 26.5, minKm: 4.0, maxLongKm: 20.5 },
      Competitive: { w1Km: 35.0, minKm: 5.0, maxLongKm: 22.5 },
      Advanced: { w1Km: 44.0, minKm: 6.0, maxLongKm: 24.5 },
    },
    Marathon: {
      Beginner: { w1Km: 27.5, minKm: 4.0, maxLongKm: 31.0 },
      Intermediate: { w1Km: 36.0, minKm: 5.0, maxLongKm: 33.0 },
      Competitive: { w1Km: 45.0, minKm: 6.0, maxLongKm: 35.0 },
      Advanced: { w1Km: 55.0, minKm: 7.0, maxLongKm: 37.0 },
    },
    'General Fitness': {
      Beginner: { w1Km: 9.5, minKm: 2.0, maxLongKm: 5.5 },
      Intermediate: { w1Km: 16.0, minKm: 3.0, maxLongKm: 8.5 },
      Competitive: { w1Km: 24.0, minKm: 4.0, maxLongKm: 12.0 },
      Advanced: { w1Km: 31.0, minKm: 5.0, maxLongKm: 14.5 },
    },
  };

  const entry = calibrationTable[profile.goal][tier];
  const scaledMaxLong = Number(
    (entry.maxLongKm * rampCfg.peakCapFactor).toFixed(1)
  );

  // Strict beginner physiological safety cap so a 5K Beginner never exceeds 5.5 km even on High ramp
  const safeMaxLong =
    profile.goal === '5K' && tier === 'Beginner'
      ? Math.min(5.5, scaledMaxLong)
      : scaledMaxLong;

  return {
    week1BaseKmFor4Days: entry.w1Km * rampCfg.startVolumeFactor,
    minSessionKm: entry.minKm,
    maxLongRunKm: safeMaxLong,
    maxWeekdayRunKm: Number((safeMaxLong * 0.78).toFixed(1)),
  };
}

function buildSegmentsForWorkout(
  type: WorkoutType,
  distanceKm: number,
  weekNum: number,
  zones: PaceZones,
  fitnessTier: FitnessTier
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
      coachTip:
        'Adaptation happens while you recover. Prioritize 8 hours of sleep, hydration, and 10 minutes of light calf/hip mobility.',
      targetPaceSummary: 'Recovery Day',
      segments: [],
    };
  }

  if (type === 'Easy Run') {
    const isBeginnerShort = fitnessTier === 'Beginner' && distanceKm <= 3.6;
    return {
      title: isBeginnerShort
        ? `Beginner Aerobic ${distanceKm}km`
        : `Conversational Easy ${distanceKm}km`,
      subtitle: `${distanceKm}km @ ${zones.easy.label}`,
      keyFocus: 'Aerobic Base & Capillary Density',
      coachTip: isBeginnerShort
        ? 'Keep effort strictly conversational. Feel free to alternate 4 min easy jog with 1 min brisk walk while your tendons & aerobic base adapt.'
        : 'Keep your heart rate firmly in Zone 2. You should be able to speak full sentences without gasping for air.',
      targetPaceSummary: zones.easy.label,
      segments: [
        {
          id: 'seg-easy-1',
          type: 'Steady',
          title: `${distanceKm}km Easy Aerobic Run`,
          distanceKm,
          targetPaceMinPerKm: zones.easy.label,
          targetPaceSecPerKm: easyPaceMid,
          description: isBeginnerShort
            ? 'Relax your shoulders, keep strides light and short, and walk briskly for 60s anytime your breathing gets heavy.'
            : 'Relax your shoulders, maintain a quick 170+ spm cadence, and resist the urge to push the pace.',
        },
      ],
    };
  }

  if (type === 'Intervals') {
    const targetPaceSingle = `${formatSecondsToPace(intervalPaceMid)}/km`;

    // Scale warmup/cooldown and repeat length proportionally to distanceKm & fitnessTier
    if (distanceKm <= 3.4) {
      const wu = 0.5;
      const cd = 0.5;
      const workKm = Math.max(0.8, Number((distanceKm - wu - cd).toFixed(1)));
      const repDistKm = weekNum % 2 === 1 ? 0.2 : 0.3;
      const repLabel = repDistKm === 0.2 ? '200m' : '300m';
      const reps = Math.max(3, Math.round(workKm / repDistKm));
      const actualWorkKm = Number((reps * repDistKm).toFixed(1));
      const adjustedCd = Number(
        Math.max(0.4, distanceKm - wu - actualWorkKm).toFixed(1)
      );

      return {
        title: `${reps} x ${repLabel} Controlled Intervals`,
        subtitle: `${wu}km Warmup • ${reps}x${repLabel} @ ${targetPaceSingle} • ${adjustedCd}km Cool`,
        keyFocus: 'Neuromuscular Turnover & Pacing Control',
        coachTip: `Smooth, controlled pickups at ${targetPaceSingle}—never an all-out sprint. Walk briskly for 90s between reps to recover fully.`,
        targetPaceSummary: zones.interval.label,
        segments: [
          {
            id: 'seg-int-wu',
            type: 'Warmup',
            title: `${wu}km Brisk Walk to Easy Jog Warmup`,
            distanceKm: wu,
            targetPaceMinPerKm: zones.easy.label,
            targetPaceSecPerKm: easyPaceMid,
            description: 'Ease gently into a light jog to warm muscles and joints.',
          },
          {
            id: 'seg-int-work',
            type: 'Work',
            title: `${reps} x ${repLabel} @ ${targetPaceSingle} (90s walk recovery)`,
            distanceKm: actualWorkKm,
            repeats: reps,
            restDurationSeconds: 90,
            targetPaceMinPerKm: zones.interval.label,
            targetPaceSecPerKm: intervalPaceMid,
            description: `Run tall and relaxed at ${targetPaceSingle}, taking 90s easy walk rest between each effort.`,
          },
          {
            id: 'seg-int-cd',
            type: 'Cooldown',
            title: `${adjustedCd}km Easy Cooldown Jog/Walk`,
            distanceKm: adjustedCd,
            targetPaceMinPerKm: zones.easy.label,
            targetPaceSecPerKm: easyPaceMid,
            description: 'Gradually bring your heart rate down.',
          },
        ],
      };
    }

    const wu = distanceKm <= 5.2 ? 0.8 : 1.2;
    const cd = wu;
    const workBudget = Math.max(1.2, distanceKm - wu - cd);

    const variants =
      distanceKm <= 5.2
        ? [
            { repDistKm: 0.4, repLabel: '400m', restSec: 75 },
            { repDistKm: 0.6, repLabel: '600m', restSec: 90 },
          ]
        : [
            { repDistKm: 0.8, repLabel: '800m', restSec: 90 },
            { repDistKm: 0.4, repLabel: '400m', restSec: 60 },
            { repDistKm: 1.0, repLabel: '1km', restSec: 90 },
          ];

    const v = variants[(weekNum - 1) % variants.length];
    const reps = Math.max(3, Math.min(12, Math.round(workBudget / v.repDistKm)));
    const actualWorkKm = Number((reps * v.repDistKm).toFixed(1));
    const adjustedCd = Number(
      Math.max(0.6, distanceKm - wu - actualWorkKm).toFixed(1)
    );

    return {
      title: `${reps} x ${v.repLabel} Speed Intervals`,
      subtitle: `${wu}km Warmup • ${reps}x${v.repLabel} @ ${targetPaceSingle} • ${adjustedCd}km Cool`,
      keyFocus: 'VO2 Max & Running Economy',
      coachTip: `Run the first repeat controlled at ${targetPaceSingle}—don't empty the tank early. Goal is even splits from rep 1 to rep ${reps}.`,
      targetPaceSummary: zones.interval.label,
      segments: [
        {
          id: 'seg-int-wu',
          type: 'Warmup',
          title: `${wu}km Progressive Warmup + Strides`,
          distanceKm: wu,
          targetPaceMinPerKm: zones.easy.label,
          targetPaceSecPerKm: easyPaceMid,
          description:
            'Start gentle and finish with 3x15s light strides to prime neuromuscular recruitment.',
        },
        {
          id: 'seg-int-work',
          type: 'Work',
          title: `${reps} x ${v.repLabel} @ ${targetPaceSingle} (${v.restSec}s jog/walk rest)`,
          distanceKm: actualWorkKm,
          repeats: reps,
          restDurationSeconds: v.restSec,
          targetPaceMinPerKm: zones.interval.label,
          targetPaceSecPerKm: intervalPaceMid,
          description: `Hit ${targetPaceSingle} with tall posture and strong arm drive. Recover for ${v.restSec}s between each interval.`,
        },
        {
          id: 'seg-int-cd',
          type: 'Cooldown',
          title: `${adjustedCd}km Flush Cooldown Jog`,
          distanceKm: adjustedCd,
          targetPaceMinPerKm: zones.easy.label,
          targetPaceSecPerKm: easyPaceMid,
          description: 'Bring heart rate down gradually and clear lactate buildup.',
        },
      ],
    };
  }

  if (type === 'Tempo') {
    const wuCd = distanceKm <= 3.4 ? 0.5 : distanceKm <= 5.0 ? 0.8 : 1.2;
    const tempoDist = Number(Math.max(0.8, distanceKm - wuCd * 2).toFixed(1));
    const tempoSingle = `${formatSecondsToPace(tempoPaceMid)}/km`;

    return {
      title: `${tempoDist}km Controlled Threshold Tempo`,
      subtitle: `${wuCd}km Warmup • ${tempoDist}km @ ${tempoSingle} • ${wuCd}km Cool`,
      keyFocus: 'Lactate Clearance & Stamina',
      coachTip:
        'Tempo pace should feel "comfortably steady"—controlled rhythmic breathing without straining.',
      targetPaceSummary: zones.tempo.label,
      segments: [
        {
          id: 'seg-tmp-wu',
          type: 'Warmup',
          title: `${wuCd}km Easy Warmup`,
          distanceKm: wuCd,
          targetPaceMinPerKm: zones.easy.label,
          targetPaceSecPerKm: easyPaceMid,
          description: 'Ease into your stride and settle your breathing rhythm.',
        },
        {
          id: 'seg-tmp-work',
          type: 'Work',
          title: `${tempoDist}km Continuous Steady Tempo`,
          distanceKm: tempoDist,
          targetPaceMinPerKm: zones.tempo.label,
          targetPaceSecPerKm: tempoPaceMid,
          description: `Hold ${tempoSingle} evenly. Avoid surging early; maintain relaxed shoulders.`,
        },
        {
          id: 'seg-tmp-cd',
          type: 'Cooldown',
          title: `${wuCd}km Easy Cooldown`,
          distanceKm: wuCd,
          targetPaceMinPerKm: zones.easy.label,
          targetPaceSecPerKm: easyPaceMid,
          description: 'Gentle jog or walk to kickstart recovery.',
        },
      ],
    };
  }

  // Long Run: Pure conversational endurance for beginners / shorter distances, progressive finish for longer distances
  if (fitnessTier === 'Beginner' && distanceKm <= 4.6) {
    return {
      title: `${distanceKm}km Endurance Builder`,
      subtitle: `${distanceKm}km Conversational Pace (${zones.easy.label})`,
      keyFocus: 'Continuous Time on Feet & Aerobic Confidence',
      coachTip:
        'Focus solely on covering the distance comfortably—slow down on hills and take brief 30s walk breaks if needed.',
      targetPaceSummary: zones.easy.label,
      segments: [
        {
          id: 'seg-lr-steady',
          type: 'Steady',
          title: `${distanceKm}km Relaxed Endurance Run`,
          distanceKm,
          targetPaceMinPerKm: zones.easy.label,
          targetPaceSecPerKm: easyPaceMid,
          description: 'Maintain an unhurried, conversational rhythm from start to finish.',
        },
      ],
    };
  }

  const easyPortion = Number((distanceKm * 0.72).toFixed(1));
  const fastFinishPortion = Number((distanceKm - easyPortion).toFixed(1));

  return {
    title: `${distanceKm}km Progressive Long Run`,
    subtitle: `${easyPortion}km Easy → ${fastFinishPortion}km @ Steady Finish`,
    keyFocus: 'Endurance, Fat Oxidation & Late-Race Resilience',
    coachTip:
      'Keep the first 72% strictly conversational before smoothly picking up cadence over the final stretch.',
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
        title: `${fastFinishPortion}km Smooth Progression Finish`,
        distanceKm: fastFinishPortion,
        targetPaceMinPerKm: zones.marathon.label,
        targetPaceSecPerKm: marathonPaceMid,
        description: 'Gently lift cadence to steady race-rhythm over the closing stretch.',
      },
    ],
  };
}

export function generateTrainingPlan(profile: UserProfile): TrainingWeek[] {
  const zones = calculatePaceZones(profile.current5kMinutes);
  const fitnessTier = getFitnessTier(profile.current5kMinutes);
  const rampRate: RampRate = profile.rampRate || 'standard';
  const rampCfg = RAMP_CONFIGS[rampRate];
  const calibration = getGoalVolumeCalibration(profile);
  const schedule = getActiveDaysSchedule(profile.daysPerWeek);

  // Scale Week 1 starting volume gently for 3..6 days/week (sub-linear so adding days doesn't spike Beginner mileage)
  const dayScaleMap: Record<3 | 4 | 5 | 6, number> = {
    3: 0.82,
    4: 1.0,
    5: 1.15,
    6: 1.28,
  };
  const week1TargetKm =
    calibration.week1BaseKmFor4Days * dayScaleMap[profile.daysPerWeek];

  const totalWeeks = profile.planWeeks || 8;
  const weeks: TrainingWeek[] = [];

  const todayIso = getLocalTodayIso();
  const startIso =
    profile.customStartDate?.trim() || profile.startDate?.trim() || todayIso;

  // Weight distribution across active workout types
  const weights: Record<WorkoutType, number> = {
    Rest: 0,
    'Easy Run': 0.2,
    Intervals: 0.21,
    Tempo: 0.24,
    'Long Run': 0.35,
    'Race Day': 0.35,
  };

  let totalWeight = 0;
  for (let d = 0; d < 7; d++) {
    totalWeight += weights[schedule[d]];
  }

  // Track cumulative non-deload build steps so every 4th week is a genuine recovery stepback
  let buildStepsCompleted = 0;
  let lastBuildMultiplier = 1.0;

  for (let w = 1; w <= totalWeeks; w++) {
    let phaseName = 'Aerobic Foundation';
    let volumeMultiplier = 1.0;

    const isLastWeek = w === totalWeeks;
    const isSecondLastWeek = w === totalWeeks - 1 && totalWeeks >= 6;
    const isDeloadWeek = !isLastWeek && !isSecondLastWeek && w % 4 === 0;

    if (w === 1) {
      phaseName = 'Week 1 Baseline & Adaptation';
      volumeMultiplier = 1.0;
      lastBuildMultiplier = 1.0;
      buildStepsCompleted = 1;
    } else if (isDeloadWeek) {
      phaseName = 'Deload & Tissue Recovery Week';
      volumeMultiplier = lastBuildMultiplier * rampCfg.deloadDropFactor;
    } else if (isSecondLastWeek) {
      // For Beginner 5K/10K, second-to-last week hits peak confidence run before Race Week Taper
      if (fitnessTier === 'Beginner' && (profile.goal === '5K' || profile.goal === '10K')) {
        phaseName = 'Peak Endurance Confidence';
        volumeMultiplier = Math.pow(
          1 + rampCfg.weeklyPctIncrease,
          buildStepsCompleted
        );
        lastBuildMultiplier = volumeMultiplier;
      } else {
        phaseName = 'Sharpening & Pre-Race Taper';
        volumeMultiplier = lastBuildMultiplier * 0.84;
      }
    } else if (isLastWeek) {
      phaseName = 'Race Week Taper';
      volumeMultiplier = lastBuildMultiplier * 0.62;
    } else {
      phaseName =
        w <= Math.ceil(totalWeeks * 0.5)
          ? 'Progressive Aerobic Build'
          : 'Threshold & Race Specificity';
      volumeMultiplier = Math.pow(
        1 + rampCfg.weeklyPctIncrease,
        buildStepsCompleted
      );
      lastBuildMultiplier = volumeMultiplier;
      buildStepsCompleted += 1;
    }

    const rawWeeklyTargetKm = week1TargetKm * volumeMultiplier;
    const workouts: ScheduledWorkout[] = [];
    let accumulatedKm = 0;

    for (let d = 0; d < 7; d++) {
      const workoutIso = addDaysIso(startIso, (w - 1) * 7 + d);
      const weekdayIdx = getMondayWeekdayIndex(workoutIso);
      const dateStr = formatIsoShort(workoutIso);
      const wType = schedule[weekdayIdx];

      let rawDist = 0;
      if (wType !== 'Rest') {
        const proportionalKm = rawWeeklyTargetKm * (weights[wType] / totalWeight);
        const capKm =
          wType === 'Long Run'
            ? calibration.maxLongRunKm
            : calibration.maxWeekdayRunKm;
        const clampedKm = Math.max(
          calibration.minSessionKm,
          Math.min(capKm, proportionalKm)
        );
        // Round to 0.1 km for smooth, accurate weekly ramping
        rawDist = Number(clampedKm.toFixed(1));
      }

      accumulatedKm += rawDist;

      const built = buildSegmentsForWorkout(
        wType,
        rawDist,
        w,
        zones,
        fitnessTier
      );
      const avgPaceMin = (profile.current5kMinutes / 5) * 1.2;
      const estimatedDurationMin =
        wType === 'Rest' ? 0 : Math.max(12, Math.round(rawDist * avgPaceMin));

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
        completed: false,
        loggedData: undefined,
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

export function previewPlanProgression(profile: UserProfile): {
  fitnessTier: FitnessTier;
  week1TotalKm: number;
  peakWeekTotalKm: number;
  week1LongRunKm: number;
  peakLongRunKm: number;
} {
  const weeks = generateTrainingPlan(profile);
  const week1 = weeks[0];
  const week1Long =
    week1?.workouts.find((w) => w.type === 'Long Run')?.plannedDistanceKm || 0;
  const peakWeekTotalKm = Math.max(...weeks.map((w) => w.totalPlannedKm), 0);
  const peakLongRunKm = Math.max(
    ...weeks.flatMap((w) =>
      w.workouts
        .filter((wo) => wo.type === 'Long Run')
        .map((wo) => wo.plannedDistanceKm)
    ),
    0
  );

  return {
    fitnessTier: getFitnessTier(profile.current5kMinutes),
    week1TotalKm: week1?.totalPlannedKm || 0,
    peakWeekTotalKm,
    week1LongRunKm: week1Long,
    peakLongRunKm,
  };
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
    current5kMinutes: 23.5, // 23:30 5K (Competitive tier)
    daysPerWeek: 4,
    rampRate: 'standard',
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

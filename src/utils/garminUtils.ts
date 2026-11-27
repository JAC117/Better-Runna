import type {
  GarminIntegrationState,
  ScheduledWorkout,
  TrainingWeek,
  UserProfile,
} from '../types';
import { formatSecondsToPace } from './planGenerator';

export function createEmptyGarminState(
  athleteName: string = 'Runner'
): GarminIntegrationState {
  return {
    connected: false,
    watchModel: 'Forerunner 265',
    athleteAccount: `${athleteName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '.')}@garmin.connect`,
    batteryPct: 100,
    firmwareVersion: 'v21.19 Multi-Band GNSS',
    autoPushWorkouts: true,
    autoImportActivities: true,
    paceTargetAlerts: true,
    hrZoneGuidance: true,
    lastSyncedAt: new Date().toISOString(),
    pushedWorkoutIds: [],
    biometrics: {
      garminVo2Max: 0,
      trainingStatus: 'Maintaining',
      hrvStatusMs: 0,
      restingHrBpm: 0,
      trainingReadinessScore: 0,
      sleepScore: 0,
      recoveryTimeHours: 0,
    },
    recentActivities: [],
  };
}

export function createInitialGarminState(
  profile: UserProfile,
  weeks: TrainingWeek[]
): GarminIntegrationState {
  const week1 = weeks[0];
  const uncompletedRuns =
    week1?.workouts.filter((w) => w.type !== 'Rest' && !w.completed) || [];
  const firstCompleted = week1?.workouts.find((w) => w.completed);

  const basePaceSec = (profile.current5kMinutes * 60) / 5;
  const tempoPaceSec = Math.round(basePaceSec * 1.05);
  const longPaceSec = Math.round(basePaceSec * 1.24);
  const easyPaceSec = Math.round(basePaceSec * 1.28);

  const firstUncompleted = uncompletedRuns[0];
  const secondUncompleted = uncompletedRuns[1];

  return {
    connected: true,
    watchModel: 'Forerunner 965',
    athleteAccount: `${profile.name.toLowerCase().replace(/\s+/g, '.')}@garmin.connect`,
    batteryPct: 86,
    firmwareVersion: 'v21.19 Multi-Band GNSS',
    autoPushWorkouts: true,
    autoImportActivities: true,
    paceTargetAlerts: true,
    hrZoneGuidance: true,
    lastSyncedAt: new Date().toISOString(),
    pushedWorkoutIds: week1
      ? week1.workouts.filter((w) => w.type !== 'Rest').map((w) => w.id)
      : [],
    biometrics: {
      garminVo2Max: Math.round(
        Math.max(42, Math.min(72, 82 - profile.current5kMinutes * 1.15))
      ),
      trainingStatus: 'Productive',
      hrvStatusMs: 68,
      restingHrBpm: 49,
      trainingReadinessScore: 84,
      sleepScore: 88,
      recoveryTimeHours: 14,
    },
    recentActivities: [
      {
        id: 'garmin-act-101',
        activityName: firstUncompleted
          ? `Garmin GPS: ${firstUncompleted.title}`
          : 'Garmin GPS: Threshold Tempo Block',
        recordedAt: 'Today • 06:42 AM',
        distanceKm: firstUncompleted ? firstUncompleted.plannedDistanceKm : 7.0,
        durationSeconds: Math.round(
          (firstUncompleted ? firstUncompleted.plannedDistanceKm : 7.0) *
            tempoPaceSec
        ),
        avgPaceStr: `${formatSecondsToPace(tempoPaceSec)}/km`,
        avgHeartRate: 166,
        maxHeartRate: 179,
        avgCadenceSpm: 178,
        elevationGainM: 54,
        trainingEffectAerobic: 4.1,
        calories: 448,
        matchedWorkoutId: firstUncompleted?.id,
        imported: false,
      },
      {
        id: 'garmin-act-102',
        activityName: secondUncompleted
          ? `Garmin GPS: ${secondUncompleted.title}`
          : 'Garmin GPS: Progressive Long Endurance',
        recordedAt: 'Yesterday • 07:15 AM',
        distanceKm: secondUncompleted
          ? secondUncompleted.plannedDistanceKm
          : 11.5,
        durationSeconds: Math.round(
          (secondUncompleted ? secondUncompleted.plannedDistanceKm : 11.5) *
            longPaceSec
        ),
        avgPaceStr: `${formatSecondsToPace(longPaceSec)}/km`,
        avgHeartRate: 151,
        maxHeartRate: 168,
        avgCadenceSpm: 174,
        elevationGainM: 112,
        trainingEffectAerobic: 3.8,
        calories: 710,
        matchedWorkoutId: secondUncompleted?.id,
        imported: false,
      },
      {
        id: 'garmin-act-103',
        activityName: firstCompleted
          ? `Garmin GPS: ${firstCompleted.title}`
          : 'Garmin GPS: 800m VO2 Max Track Intervals',
        recordedAt: '2 days ago • 05:50 PM',
        distanceKm: firstCompleted ? firstCompleted.plannedDistanceKm : 6.0,
        durationSeconds: Math.round(
          (firstCompleted ? firstCompleted.plannedDistanceKm : 6.0) * easyPaceSec
        ),
        avgPaceStr: `${formatSecondsToPace(easyPaceSec)}/km`,
        avgHeartRate: 169,
        maxHeartRate: 186,
        avgCadenceSpm: 182,
        elevationGainM: 28,
        trainingEffectAerobic: 4.3,
        calories: 392,
        matchedWorkoutId: firstCompleted?.id,
        imported: true,
      },
    ],
  };
}

export function generateGarminTCXWorkout(
  workout: ScheduledWorkout,
  watchModel: string
): string {
  const nowIso = new Date().toISOString();
  const stepsXml = workout.segments
    .map(
      (seg, idx) => `      <Step xsi:type="Regular_t">
        <StepId>${idx + 1}</StepId>
        <Name>${seg.title.replace(/&/g, 'and')}</Name>
        <Duration xsi:type="Distance_t">
          <Meters>${Math.round((seg.distanceKm || 1) * 1000)}</Meters>
        </Duration>
        <Intensity>${
          seg.type === 'Warmup'
            ? 'Warmup'
            : seg.type === 'Cooldown'
            ? 'Cooldown'
            : 'Active'
        }</Intensity>
        <Target xsi:type="Speed_t">
          <SpeedZone xsi:type="CustomSpeedZone_t">
            <ViewAs>Pace</ViewAs>
            <LowInMetersPerSecond>${(
              1000 /
              ((seg.targetPaceSecPerKm || 300) + 8)
            ).toFixed(3)}</LowInMetersPerSecond>
            <HighInMetersPerSecond>${(
              1000 /
              Math.max(150, (seg.targetPaceSecPerKm || 300) - 8)
            ).toFixed(3)}</HighInMetersPerSecond>
          </SpeedZone>
        </Target>
      </Step>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Workouts>
    <Workout Sport="Running">
      <Name>RUNNA W${workout.weekNumber} ${workout.dayName}: ${workout.title.replace(
    /&/g,
    'and'
  )}</Name>
${stepsXml}
      <ScheduledOn>${nowIso.split('T')[0]}</ScheduledOn>
      <Notes>${workout.coachTip.replace(/&/g, 'and')}</Notes>
      <Creator xsi:type="Device_t">
        <Name>Runna Coach -> Garmin ${watchModel}</Name>
      </Creator>
    </Workout>
  </Workouts>
</TrainingCenterDatabase>`;
}

export function downloadGarminWorkoutFile(
  workout: ScheduledWorkout,
  watchModel: string
) {
  const xml = generateGarminTCXWorkout(workout, watchModel);
  const blob = new Blob([xml], { type: 'application/vnd.garmin.tcx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Runna_W${workout.weekNumber}_${workout.dayName}_${workout.type.replace(
    /\s+/g,
    '_'
  )}.tcx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

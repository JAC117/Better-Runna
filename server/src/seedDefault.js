// Self-contained initial database seed for fresh PostgreSQL volumes

function fmtPace(sec) {
  const r = Math.round(sec);
  return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`;
}

function toIsoLocal(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function buildInitialSeedPayload() {
  const startDt = new Date();
  startDt.setHours(12, 0, 0, 0);
  const startIso = toIsoLocal(startDt);

  const raceDt = new Date(startDt);
  raceDt.setDate(startDt.getDate() + 8 * 7 - 1);

  const profile = {
    name: 'Alex Rivera',
    goal: '10K',
    intent: 'improve',
    goalLabel: 'Improve 10K Time',
    current5kMinutes: 23.5,
    daysPerWeek: 4,
    startDate: startIso,
    customStartDate: undefined,
    targetRaceDate: toIsoLocal(raceDt),
    planWeeks: 8,
    currentWeek: 1,
    createdAt: new Date().toISOString(),
    unit: 'km',
  };

  const baseSec = (profile.current5kMinutes * 60) / 5;
  const easyLabel = `${fmtPace(baseSec * 1.24)}–${fmtPace(baseSec * 1.34)}/km`;
  const tempoLabel = `${fmtPace(baseSec * 1.04)}–${fmtPace(baseSec * 1.07)}/km`;
  const intervalLabel = `${fmtPace(baseSec * 0.96)}–${fmtPace(baseSec * 0.99)}/km`;
  const marathonLabel = `${fmtPace(baseSec * 1.11)}–${fmtPace(baseSec * 1.15)}/km`;

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const schedule = {
    0: 'Rest',
    1: 'Intervals',
    2: 'Rest',
    3: 'Tempo',
    4: 'Easy Run',
    5: 'Rest',
    6: 'Long Run',
  };

  const weeks = [];
  for (let w = 1; w <= 8; w++) {
    const phaseName =
      w <= 3
        ? 'Aerobic Foundation'
        : w === 4
        ? 'Deload & Adaptation Week'
        : w <= 6
        ? 'Speed & Threshold Peak'
        : w === 7
        ? 'Sharpening & Taper'
        : 'Race Week Taper';

    const mult = w === 4 ? 0.85 : w === 7 ? 0.82 : w === 8 ? 0.6 : 1 + (w - 1) * 0.07;
    const targetKm = Math.round(30 * mult);
    const weights = {
      Rest: 0,
      'Easy Run': 0.18,
      Intervals: 0.2,
      Tempo: 0.22,
      'Long Run': 0.34,
    };
    const totalWeight = 0.94;

    const workouts = [];
    let accKm = 0;

    for (let d = 0; d < 7; d++) {
      const dObj = new Date(startDt);
      dObj.setDate(startDt.getDate() + (w - 1) * 7 + d);
      const isoDate = toIsoLocal(dObj);
      const jsDay = dObj.getDay();
      const weekdayIdx = jsDay === 0 ? 6 : jsDay - 1;
      const dateStr = dObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const type = schedule[weekdayIdx];
      const dist =
        type === 'Rest'
          ? 0
          : Math.max(3.5, Math.round((targetKm * (weights[type] / totalWeight)) * 2) / 2);
      accKm += dist;

      const isPreDone = false;
      const actualPaceSec = Math.round(baseSec * (type === 'Intervals' ? 0.97 : 1.25));

      let title = 'Rest & Mobility';
      let subtitle = 'Active recovery & tissue adaptation';
      let keyFocus = 'Recovery & Glycogen Replenishment';
      let coachTip = 'Prioritize 8 hours of sleep and light calf/hip mobility.';
      let targetPaceSummary = 'Recovery Day';
      let segments = [];

      if (type === 'Easy Run') {
        title = `Conversational Easy ${dist}km`;
        subtitle = `${dist}km @ ${easyLabel}`;
        keyFocus = 'Aerobic Base & Capillary Density';
        coachTip = 'Keep heart rate firmly in Zone 2 conversational effort.';
        targetPaceSummary = easyLabel;
        segments = [
          {
            id: 'seg-easy-1',
            type: 'Steady',
            title: `${dist}km Easy Aerobic Run`,
            distanceKm: dist,
            targetPaceMinPerKm: easyLabel,
            targetPaceSecPerKm: Math.round(baseSec * 1.29),
            description: 'Maintain relaxed shoulders and quick 172+ spm cadence.',
          },
        ];
      } else if (type === 'Intervals') {
        const reps = Math.max(4, Math.min(8, Math.round((dist - 2.4) / 0.8)));
        const iPace = `${fmtPace(baseSec * 0.975)}/km`;
        title = `${reps} x 800m Speed Intervals`;
        subtitle = `1.2km Warmup • ${reps}x800m @ ${iPace} • 1.2km Cool`;
        keyFocus = 'VO2 Max & Running Economy';
        coachTip = `Run the first repeat controlled at ${iPace} and aim for even splits.`;
        targetPaceSummary = intervalLabel;
        segments = [
          {
            id: 'seg-int-wu',
            type: 'Warmup',
            title: '1.2km Progressive Warmup + Strides',
            distanceKm: 1.2,
            targetPaceMinPerKm: easyLabel,
            targetPaceSecPerKm: Math.round(baseSec * 1.28),
            description: 'Ease into stride and finish with 3x15s high-cadence strides.',
          },
          {
            id: 'seg-int-work',
            type: 'Work',
            title: `${reps} x 800m @ ${iPace} (90s jog rest)`,
            distanceKm: Number((reps * 0.8).toFixed(1)),
            repeats: reps,
            restDurationSeconds: 90,
            targetPaceMinPerKm: intervalLabel,
            targetPaceSecPerKm: Math.round(baseSec * 0.975),
            description: `Hit ${iPace} with tall posture and strong arm drive.`,
          },
          {
            id: 'seg-int-cd',
            type: 'Cooldown',
            title: '1.2km Flush Cooldown Jog',
            distanceKm: 1.2,
            targetPaceMinPerKm: easyLabel,
            targetPaceSecPerKm: Math.round(baseSec * 1.29),
            description: 'Bring heart rate down gradually.',
          },
        ];
      } else if (type === 'Tempo') {
        const tDist = Math.max(2, Number((dist - 3).toFixed(1)));
        const tPace = `${fmtPace(baseSec * 1.055)}/km`;
        title = `${tDist}km Lactate Threshold Tempo`;
        subtitle = `1.5km Warmup • ${tDist}km @ ${tPace} • 1.5km Cool`;
        keyFocus = 'Lactate Clearance & Threshold Stamina';
        coachTip = 'Comfortably hard rhythmic effort—avoid surging early.';
        targetPaceSummary = tempoLabel;
        segments = [
          {
            id: 'seg-tmp-wu',
            type: 'Warmup',
            title: '1.5km Easy Warmup',
            distanceKm: 1.5,
            targetPaceMinPerKm: easyLabel,
            targetPaceSecPerKm: Math.round(baseSec * 1.28),
            description: 'Ease into your breathing rhythm.',
          },
          {
            id: 'seg-tmp-work',
            type: 'Work',
            title: `${tDist}km Continuous Threshold Block`,
            distanceKm: tDist,
            targetPaceMinPerKm: tempoLabel,
            targetPaceSecPerKm: Math.round(baseSec * 1.055),
            description: `Lock into ${tPace} steady threshold effort.`,
          },
          {
            id: 'seg-tmp-cd',
            type: 'Cooldown',
            title: '1.5km Easy Cooldown',
            distanceKm: 1.5,
            targetPaceMinPerKm: easyLabel,
            targetPaceSecPerKm: Math.round(baseSec * 1.29),
            description: 'Gentle jog to kickstart recovery.',
          },
        ];
      } else if (type === 'Long Run') {
        const easyP = Number((dist * 0.7).toFixed(1));
        const fastP = Number((dist - easyP).toFixed(1));
        title = `${dist}km Progressive Long Run`;
        subtitle = `${easyP}km Easy → ${fastP}km @ Marathon Pace`;
        keyFocus = 'Endurance & Late-Race Resilience';
        coachTip = 'Keep the first 70% conversational before picking up the final stretch.';
        targetPaceSummary = `${easyLabel} → ${marathonLabel}`;
        segments = [
          {
            id: 'seg-lr-1',
            type: 'Steady',
            title: `${easyP}km Conversational Endurance Block`,
            distanceKm: easyP,
            targetPaceMinPerKm: easyLabel,
            targetPaceSecPerKm: Math.round(baseSec * 1.28),
            description: 'Settle into a sustainable aerobic rhythm.',
          },
          {
            id: 'seg-lr-2',
            type: 'Work',
            title: `${fastP}km Fast-Finish Progression`,
            distanceKm: fastP,
            targetPaceMinPerKm: marathonLabel,
            targetPaceSecPerKm: Math.round(baseSec * 1.13),
            description: 'Smoothly increase cadence on tired legs.',
          },
        ];
      }

      workouts.push({
        id: `w${w}-d${d}`,
        weekNumber: w,
        dayOfWeek: d,
        dayName: dayNames[weekdayIdx],
        dateStr,
        isoDate,
        type,
        title,
        subtitle,
        plannedDistanceKm: dist,
        estimatedDurationMin: type === 'Rest' ? 0 : Math.round(dist * (profile.current5kMinutes / 5) * 1.18),
        keyFocus,
        coachTip,
        targetPaceSummary,
        segments,
        completed: isPreDone,
        loggedData: isPreDone
          ? {
              actualDistanceKm: dist,
              actualDurationSeconds: Math.round(dist * actualPaceSec),
              actualPaceStr: `${fmtPace(actualPaceSec)}/km`,
              rpe: type === 'Intervals' ? 8 : 5,
              source: 'Garmin Connect',
              notes:
                type === 'Intervals'
                  ? 'Hit all 800m splits within 2s of target pace on Kezar Oval!'
                  : 'Smooth Zone 2 aerobic cruise around Marina Green.',
              completedAt: dObj.toISOString(),
              garminMetrics: {
                deviceName: 'Garmin Forerunner 965',
                avgHeartRate: type === 'Intervals' ? 171 : 146,
                maxHeartRate: type === 'Intervals' ? 186 : 158,
                avgCadenceSpm: type === 'Intervals' ? 183 : 173,
                elevationGainM: type === 'Intervals' ? 18 : 34,
                trainingEffectAerobic: type === 'Intervals' ? 4.2 : 3.1,
                calories: Math.round(dist * 64),
              },
            }
          : undefined,
      });
    }

    weeks.push({
      weekNumber: w,
      phaseName,
      totalPlannedKm: Number(accKm.toFixed(1)),
      workouts,
    });
  }

  const garmin = {
    connected: true,
    watchModel: 'Forerunner 965',
    athleteAccount: 'alex.rivera@garmin.connect',
    batteryPct: 86,
    firmwareVersion: 'v21.19 Multi-Band GNSS',
    autoPushWorkouts: true,
    autoImportActivities: true,
    paceTargetAlerts: true,
    hrZoneGuidance: true,
    lastSyncedAt: new Date().toISOString(),
    pushedWorkoutIds: weeks[0].workouts.filter((w) => w.type !== 'Rest').map((w) => w.id),
    biometrics: {
      garminVo2Max: 55,
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
        activityName: 'Garmin GPS: Lactate Threshold Tempo Block',
        recordedAt: 'Today • 06:42 AM',
        distanceKm: 7.0,
        durationSeconds: Math.round(7.0 * baseSec * 1.05),
        avgPaceStr: `${fmtPace(baseSec * 1.05)}/km`,
        avgHeartRate: 166,
        maxHeartRate: 179,
        avgCadenceSpm: 178,
        elevationGainM: 54,
        trainingEffectAerobic: 4.1,
        calories: 448,
        matchedWorkoutId: 'w1-d3',
        imported: false,
      },
      {
        id: 'garmin-act-102',
        activityName: 'Garmin GPS: Progressive Long Endurance',
        recordedAt: 'Yesterday • 07:15 AM',
        distanceKm: 11.0,
        durationSeconds: Math.round(11.0 * baseSec * 1.24),
        avgPaceStr: `${fmtPace(baseSec * 1.24)}/km`,
        avgHeartRate: 151,
        maxHeartRate: 168,
        avgCadenceSpm: 174,
        elevationGainM: 112,
        trainingEffectAerobic: 3.8,
        calories: 710,
        matchedWorkoutId: 'w1-d6',
        imported: false,
      },
    ],
  };

  return { profile, weeks, garmin };
}

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Flame,
  Calendar,
  Play,
  Sparkles,
  SlidersHorizontal,
  Coffee,
  ArrowUpRight,
  Watch,
  Send,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import type {
  GarminIntegrationState,
  RampRate,
  ScheduledWorkout,
  TrainingWeek,
  UserProfile,
} from '../types';
import {
  formatDuration,
  formatIsoFull,
  getFitnessTier,
  getLocalTodayIso,
  RAMP_CONFIGS,
} from '../utils/planGenerator';

interface PlanDashboardViewProps {
  profile: UserProfile;
  weeks: TrainingWeek[];
  garmin: GarminIntegrationState;
  selectedWeekNumber: number;
  onSelectWeek: (weekNum: number) => void;
  onSelectWorkout: (workout: ScheduledWorkout) => void;
  onLaunchLiveTracker: (workout: ScheduledWorkout) => void;
  onOpenOnboarding: () => void;
  onOpenGarminModal: () => void;
  onPushWeekToGarmin: (weekNum: number) => void;
  onUpdateStartDate: (customStartIso?: string) => void;
  onUpdateRampRate: (rate: RampRate) => void;
}

export const PlanDashboardView: React.FC<PlanDashboardViewProps> = ({
  profile,
  weeks,
  garmin,
  selectedWeekNumber,
  onSelectWeek,
  onSelectWorkout,
  onLaunchLiveTracker,
  onOpenOnboarding,
  onOpenGarminModal,
  onPushWeekToGarmin,
  onUpdateStartDate,
  onUpdateRampRate,
}) => {
  const todayIso = getLocalTodayIso();
  const fitnessTier = getFitnessTier(profile.current5kMinutes);
  const activeRamp: RampRate = profile.rampRate || 'standard';

  if (weeks.length === 0) {
    return (
      <div className="p-10 sm:p-14 rounded-3xl bg-[#12151F] border border-white/10 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#CCFF00]/15 border border-[#CCFF00]/30 flex items-center justify-center text-[#CCFF00] mx-auto">
          <Calendar className="w-7 h-7" />
        </div>
        <div className="space-y-1.5 max-w-lg mx-auto">
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            No Active Training Plan Yet
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Set your race goal, current 5K benchmark, distance ramping level (Low, Standard, or High), and start date to generate a fitness-calibrated training plan.
          </p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={onOpenOnboarding}
            className="px-6 py-3.5 rounded-xl bg-[#CCFF00] hover:bg-[#b8e600] text-black font-black text-xs uppercase tracking-wider inline-flex items-center gap-2 transition cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Create My Training Plan
          </button>
        </div>
      </div>
    );
  }

  const effectiveStartIso =
    profile.customStartDate ||
    profile.startDate ||
    weeks[0]?.workouts[0]?.isoDate ||
    todayIso;
  const isSyncedToToday = !profile.customStartDate && effectiveStartIso === todayIso;

  const currentWeekObj =
    weeks.find((w) => w.weekNumber === selectedWeekNumber) || weeks[0];

  const allScheduledRuns = weeks
    .flatMap((w) => w.workouts)
    .filter((w) => w.type !== 'Rest');
  const totalCompletedRuns = allScheduledRuns.filter((w) => w.completed).length;
  const overallPlanPct =
    allScheduledRuns.length > 0
      ? Math.round((totalCompletedRuns / allScheduledRuns.length) * 100)
      : 0;

  const weekRuns = currentWeekObj.workouts.filter((w) => w.type !== 'Rest');
  const weekCompletedRuns = weekRuns.filter((w) => w.completed);
  const weekLoggedKm = weekCompletedRuns.reduce(
    (sum, w) => sum + (w.loggedData?.actualDistanceKm || w.plannedDistanceKm),
    0
  );
  const weekProgressPct =
    currentWeekObj.totalPlannedKm > 0
      ? Math.min(
          100,
          Math.round((weekLoggedKm / currentWeekObj.totalPlannedKm) * 100)
        )
      : 0;

  const pushedInWeekCount = weekRuns.filter((w) =>
    garmin.pushedWorkoutIds.includes(w.id)
  ).length;

  // Prefer today's workout if uncompleted, otherwise next uncompleted workout in current week
  const nextUpWorkout =
    currentWeekObj.workouts.find(
      (w) => w.isoDate === todayIso && w.type !== 'Rest' && !w.completed
    ) ||
    currentWeekObj.workouts.find((w) => w.type !== 'Rest' && !w.completed) ||
    weekRuns[0];

  const getTypeColors = (type: ScheduledWorkout['type']) => {
    switch (type) {
      case 'Intervals':
        return {
          badge: 'bg-[#FF4D4D]/15 text-[#FF4D4D] border-[#FF4D4D]/30',
          accent: 'bg-[#FF4D4D]',
          text: 'text-[#FF4D4D]',
        };
      case 'Tempo':
        return {
          badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          accent: 'bg-amber-400',
          text: 'text-amber-400',
        };
      case 'Long Run':
        return {
          badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
          accent: 'bg-sky-400',
          text: 'text-sky-400',
        };
      case 'Easy Run':
        return {
          badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          accent: 'bg-emerald-400',
          text: 'text-emerald-400',
        };
      default:
        return {
          badge: 'bg-zinc-800/80 text-zinc-400 border-zinc-700/60',
          accent: 'bg-zinc-700',
          text: 'text-zinc-400',
        };
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Plan Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex flex-wrap items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#CCFF00]">
            <Flame className="w-3.5 h-3.5 fill-[#CCFF00]" />
            <span>
              {profile.goalLabel} • {profile.planWeeks}-Week {fitnessTier} Plan
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">
            Week {currentWeekObj.weekNumber}: {currentWeekObj.phaseName}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenGarminModal}
            className="px-3.5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#16223D] border border-[#38BDF8]/40 text-xs font-extrabold text-[#38BDF8] flex items-center gap-2 transition cursor-pointer"
          >
            <Watch className="w-3.5 h-3.5" />
            <span>
              Garmin {garmin.watchModel.split(' ')[0]} ({pushedInWeekCount}/
              {weekRuns.length} Synced)
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenOnboarding}
            className="px-4 py-2.5 rounded-xl bg-[#161923] hover:bg-[#1E2230] border border-white/10 text-xs font-bold text-white flex items-center gap-2 transition cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#CCFF00]" />
            Customize Plan
          </button>
        </div>
      </div>

      {/* Plan Start Date, Fitness Calibration & Live Distance Ramping Bar */}
      <div className="p-4 rounded-2xl bg-[#131722] border border-white/10 space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#CCFF00]/15 border border-[#CCFF00]/30 flex items-center justify-center text-[#CCFF00] shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-extrabold uppercase tracking-wider text-white">
                  Plan Start: {formatIsoFull(effectiveStartIso)}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    isSyncedToToday
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                  }`}
                >
                  {isSyncedToToday ? 'Synced to Current Date' : 'Custom Start Date'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Today is <strong className="text-zinc-200">{formatIsoFull(todayIso)}</strong> • Race Target: <strong className="text-zinc-200 font-mono-tabular">{profile.targetRaceDate}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-zinc-400 bg-[#0B0E15] px-3 py-1.5 rounded-xl border border-white/10">
              <span className="font-bold uppercase text-[10px] tracking-wider text-zinc-400">
                Optional Start Date:
              </span>
              <input
                id="plan-optional-start-date"
                type="date"
                value={effectiveStartIso}
                onChange={(e) => {
                  if (e.target.value) {
                    onUpdateStartDate(
                      e.target.value === todayIso ? undefined : e.target.value
                    );
                  }
                }}
                className="bg-transparent text-white font-mono-tabular text-xs font-bold focus:outline-none cursor-pointer"
              />
            </label>

            {!isSyncedToToday && (
              <button
                type="button"
                onClick={() => onUpdateStartDate(undefined)}
                className="px-3.5 py-2 rounded-xl bg-[#CCFF00] hover:bg-[#b8e600] text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Sync to Today
              </button>
            )}
          </div>
        </div>

        {/* Fitness Level & Distance Ramping Switcher */}
        <div className="pt-3 border-t border-white/8 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-extrabold uppercase tracking-wider text-zinc-300">
              <TrendingUp className="w-3.5 h-3.5 text-[#CCFF00]" />
              Distance Ramping:
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] font-mono-tabular font-semibold text-zinc-200">
              {fitnessTier} Fitness ({Math.floor(profile.current5kMinutes)}:
              {Math.round((profile.current5kMinutes % 1) * 60)
                .toString()
                .padStart(2, '0')}{' '}
              5K)
            </span>
            <span className="text-[11px] text-zinc-400">
              {RAMP_CONFIGS[activeRamp].description}
            </span>
          </div>

          <div
            role="group"
            aria-label="Distance Ramping Rate"
            className="inline-flex items-center p-1 rounded-xl bg-[#0B0E15] border border-white/10 self-start lg:self-auto shrink-0"
          >
            {(['low', 'standard', 'high'] as const).map((rateKey) => {
              const selected = activeRamp === rateKey;
              const label =
                rateKey === 'low'
                  ? 'Low (~6%)'
                  : rateKey === 'standard'
                  ? 'Standard (10%)'
                  : 'High (~13%)';
              return (
                <button
                  key={rateKey}
                  type="button"
                  onClick={() => onUpdateRampRate(rateKey)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition cursor-pointer ${
                    selected
                      ? 'bg-[#CCFF00] text-black shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dual Progress Summary Banner: Overall Plan & Weekly Mileage Targets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Weekly Mileage Target Progress Card */}
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#171B26] to-[#11131B] border border-white/10 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                Week {currentWeekObj.weekNumber} Mileage Target
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-black font-mono-tabular text-white">
                  {weekLoggedKm.toFixed(1)}
                </span>
                <span className="text-base font-mono-tabular text-zinc-400">
                  / {currentWeekObj.totalPlannedKm.toFixed(1)} km
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#CCFF00]">
                {weekCompletedRuns.length} of {weekRuns.length} Runs Done
              </span>
              <div className="text-2xl font-black font-mono-tabular text-[#CCFF00] mt-0.5">
                {weekProgressPct}%
              </div>
            </div>
          </div>

          <div className="w-full h-3 rounded-full bg-black/50 overflow-hidden p-0.5 border border-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#CCFF00] to-emerald-400 transition-all duration-500"
              style={{ width: `${Math.max(4, weekProgressPct)}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400 pt-1">
            <span>
              Overall Plan Progress:{' '}
              <strong className="text-white font-mono-tabular">
                {totalCompletedRuns}/{allScheduledRuns.length} workouts (
                {overallPlanPct}%)
              </strong>
            </span>
            <button
              type="button"
              onClick={() => onPushWeekToGarmin(currentWeekObj.weekNumber)}
              className="text-xs font-bold text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Send className="w-3 h-3" />
              {pushedInWeekCount === weekRuns.length
                ? `All Week ${currentWeekObj.weekNumber} Runs on Garmin Watch`
                : `Push Week ${currentWeekObj.weekNumber} to Garmin Watch`}
            </button>
          </div>
        </div>

        {/* Next Featured Session Spotlight Card */}
        {nextUpWorkout && (
          <div className="lg:col-span-5 p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#1C212F] via-[#151822] to-[#11131B] border border-[#CCFF00]/35 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#CCFF00] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Next Key Workout ({nextUpWorkout.dayName},{' '}
                  {nextUpWorkout.dateStr})
                </span>
                <span className="text-xs font-mono-tabular font-bold text-white bg-black/40 px-2.5 py-0.5 rounded-full">
                  {nextUpWorkout.plannedDistanceKm} km
                </span>
              </div>
              <h3 className="text-lg font-black text-white mt-2">
                {nextUpWorkout.title}
              </h3>
              <p className="text-xs text-zinc-300 mt-1 line-clamp-2">
                {nextUpWorkout.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => onSelectWorkout(nextUpWorkout)}
                className="flex-1 py-2.5 px-3.5 rounded-xl bg-[#CCFF00] hover:bg-[#b8e600] text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                Workout Breakdown
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={() => onLaunchLiveTracker(nextUpWorkout)}
                className="py-2.5 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-[#CCFF00] fill-[#CCFF00]" />
                Track
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Week Selector Strip */}
      <div className="flex items-center justify-between gap-2 bg-[#12151E] p-2 rounded-2xl border border-white/5 overflow-x-auto">
        <button
          type="button"
          disabled={selectedWeekNumber <= 1}
          onClick={() => onSelectWeek(Math.max(1, selectedWeekNumber - 1))}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white transition shrink-0 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          {weeks.map((wk) => {
            const active = wk.weekNumber === selectedWeekNumber;
            const wkDoneCount = wk.workouts.filter(
              (w) => w.type !== 'Rest' && w.completed
            ).length;
            const wkTotalRuns = wk.workouts.filter(
              (w) => w.type !== 'Rest'
            ).length;

            return (
              <button
                key={wk.weekNumber}
                type="button"
                onClick={() => onSelectWeek(wk.weekNumber)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? 'bg-[#CCFF00] text-black shadow'
                    : 'bg-[#181C26] text-zinc-400 hover:text-white'
                }`}
              >
                <span>Week {wk.weekNumber}</span>
                <span
                  className={`text-[10px] font-mono-tabular px-1.5 py-0.2 rounded-full ${
                    active
                      ? 'bg-black/20 text-black'
                      : 'bg-black/40 text-zinc-400'
                  }`}
                >
                  {wkDoneCount}/{wkTotalRuns}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={selectedWeekNumber >= weeks.length}
          onClick={() =>
            onSelectWeek(Math.min(weeks.length, selectedWeekNumber + 1))
          }
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white transition shrink-0 cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekly Calendar Schedule Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#CCFF00]" />
            7-Day Structured Schedule • Click any workout for pace breakdown, Garmin sync & logging
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
          {currentWeekObj.workouts.map((workout) => {
            const isRest = workout.type === 'Rest';
            const isToday = workout.isoDate === todayIso;
            const colors = getTypeColors(workout.type);
            const isOnWatch = garmin.pushedWorkoutIds.includes(workout.id);

            return (
              <div
                key={workout.id}
                onClick={() => onSelectWorkout(workout)}
                className={`group relative rounded-2xl p-4 border transition-all flex flex-col justify-between cursor-pointer ${
                  workout.completed
                    ? 'bg-[#141A1D] border-[#CCFF00]/45 hover:border-[#CCFF00]'
                    : isToday
                    ? 'bg-[#191F2E] border-[#CCFF00] shadow-lg'
                    : isRest
                    ? 'bg-[#11131A]/70 border-white/5 hover:border-white/15 opacity-80'
                    : 'bg-[#151822] border-white/10 hover:border-white/25 hover:-translate-y-0.5 shadow-lg'
                }`}
              >
                {/* Top Day & Status Header */}
                <div>
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-black uppercase text-white">
                        {workout.dayName}
                      </span>
                      <span className="text-[11px] font-mono-tabular text-zinc-400">
                        {workout.dateStr}
                      </span>
                      {isToday && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#CCFF00] text-black">
                          Today
                        </span>
                      )}
                    </div>

                    {workout.completed ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#CCFF00] text-black">
                        <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                        Done
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${colors.badge}`}
                      >
                        {workout.type}
                      </span>
                    )}
                  </div>

                  {/* Workout Title & Structured Summary */}
                  <div className="mt-3">
                    {isRest ? (
                      <div className="py-3 flex flex-col items-center text-center text-zinc-500">
                        <Coffee className="w-5 h-5 mb-1.5 text-zinc-600" />
                        <span className="text-xs font-bold text-zinc-400">
                          Rest & Recovery
                        </span>
                        <span className="text-[11px] text-zinc-500 mt-0.5">
                          Mobility & Stretch
                        </span>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-sm font-extrabold text-white group-hover:text-[#CCFF00] transition leading-snug">
                          {workout.title}
                        </h3>
                        <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                          {workout.subtitle}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Bottom Metrics Footer */}
                {!isRest && (
                  <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-[10px] uppercase text-zinc-500 block">
                          {workout.completed ? 'Logged' : 'Target'}
                        </span>
                        <span className="text-lg font-black font-mono-tabular text-white">
                          {workout.completed && workout.loggedData
                            ? workout.loggedData.actualDistanceKm
                            : workout.plannedDistanceKm}{' '}
                          <span className="text-xs font-normal text-zinc-400">
                            km
                          </span>
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase text-zinc-500 block">
                          {workout.completed ? 'Avg Pace' : 'Duration'}
                        </span>
                        <span className="text-xs font-bold font-mono-tabular text-[#CCFF00]">
                          {workout.completed && workout.loggedData
                            ? workout.loggedData.actualPaceStr
                            : `~${workout.estimatedDurationMin}m`}
                        </span>
                      </div>
                    </div>

                    {workout.completed && workout.loggedData ? (
                      <div className="text-[10px] font-mono-tabular text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg flex items-center justify-between">
                        <span>
                          {formatDuration(
                            workout.loggedData.actualDurationSeconds
                          )}
                        </span>
                        <span>
                          {workout.loggedData.source === 'Garmin Connect'
                            ? `♥ ${workout.loggedData.garminMetrics?.avgHeartRate}bpm`
                            : `RPE ${workout.loggedData.rpe}/10`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-1 text-[10px] font-mono-tabular text-zinc-400 bg-black/30 px-2 py-1 rounded-lg">
                        <span className="truncate">
                          {workout.targetPaceSummary}
                        </span>
                        {garmin.connected && isOnWatch && (
                          <span
                            className="text-[#38BDF8] shrink-0 flex items-center gap-0.5 font-bold"
                            title={`Synced to Garmin ${garmin.watchModel}`}
                          >
                            <Watch className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

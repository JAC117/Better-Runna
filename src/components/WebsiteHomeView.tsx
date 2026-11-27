import React from 'react';
import {
  ArrowRight,
  Calendar,
  MapPin,
  CheckCircle2,
  Play,
  SlidersHorizontal,
  Watch,
  Heart,
  Mountain,
  Award,
  Coffee,
} from 'lucide-react';
import type {
  GarminIntegrationState,
  PastWorkoutRecord,
  ScheduledWorkout,
  TrainingWeek,
  UserProfile,
} from '../types';
import {
  calculatePaceZones,
  calculateRacePredictions,
  findActiveWeekForToday,
  formatDuration,
  formatIsoShort,
  formatSecondsToPace,
  getLocalTodayIso,
} from '../utils/planGenerator';
import { WorkoutRouteMap } from './WorkoutRouteMap';

interface WebsiteHomeViewProps {
  profile: UserProfile;
  weeks: TrainingWeek[];
  garmin: GarminIntegrationState;
  pastWorkouts: PastWorkoutRecord[];
  onNavigate: (
    page: 'overview' | 'plan' | 'history' | 'track' | 'progress' | 'profile'
  ) => void;
  onSelectWorkout: (workout: ScheduledWorkout) => void;
  onLaunchLiveTracker: (workout: ScheduledWorkout) => void;
  onOpenOnboarding: () => void;
  onOpenGarminModal: () => void;
}

export const WebsiteHomeView: React.FC<WebsiteHomeViewProps> = ({
  profile,
  weeks,
  garmin,
  pastWorkouts,
  onNavigate,
  onSelectWorkout,
  onLaunchLiveTracker,
  onOpenOnboarding,
  onOpenGarminModal,
}) => {
  const todayIso = getLocalTodayIso();

  if (weeks.length === 0) {
    return (
      <div className="space-y-12 pb-12">
        <section className="pt-4 lg:pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#CCFF00]">
              New Athlete Account • Clean Slate
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-[1.06]">
              Welcome, {profile.name}. Let's build your training plan.
            </h1>
            <p className="text-base text-zinc-400 leading-relaxed max-w-xl">
              Your account starts completely empty with zero pre-loaded workouts or wearable logs. Answer our 4-step calibration quiz to generate a personalized training plan synced to today's date (or your optional custom start date).
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                id="btn-empty-create-plan"
                type="button"
                onClick={onOpenOnboarding}
                className="px-6 py-4 rounded-xl bg-[#CCFF00] hover:bg-[#b8e600] text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 transition cursor-pointer"
              >
                Create My Training Plan
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>

              <button
                type="button"
                onClick={onOpenGarminModal}
                className="px-5 py-4 rounded-xl bg-[#151925] hover:bg-[#1C2232] border border-white/12 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition cursor-pointer"
              >
                <Watch className="w-4 h-4 text-sky-400" />
                Connect Garmin Watch
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-[#12151F] border border-white/10 space-y-5">
            <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
              Account Summary
            </div>
            <div className="grid grid-cols-2 gap-3 font-mono-tabular">
              <div className="p-4 rounded-2xl bg-[#0B0E15] border border-white/5">
                <span className="text-[10px] uppercase text-zinc-500 block">
                  Active Plan
                </span>
                <span className="text-lg font-black text-zinc-400 mt-1 block">
                  None Yet
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-[#0B0E15] border border-white/5">
                <span className="text-[10px] uppercase text-zinc-500 block">
                  Logged Mileage
                </span>
                <span className="text-lg font-black text-white mt-1 block">
                  0.0 km
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-[#0B0E15] border border-white/5">
                <span className="text-[10px] uppercase text-zinc-500 block">
                  Past Workouts
                </span>
                <span className="text-lg font-black text-white mt-1 block">
                  0 Runs
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-[#0B0E15] border border-white/5">
                <span className="text-[10px] uppercase text-zinc-500 block">
                  Garmin Status
                </span>
                <span className="text-sm font-bold text-zinc-400 mt-1.5 block">
                  {garmin.connected ? garmin.watchModel : 'Not Paired'}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const activeWeekNum = findActiveWeekForToday(weeks, todayIso);
  const currentWeek =
    weeks.find((w) => w.weekNumber === activeWeekNum) || weeks[0];
  const effectiveStartIso =
    profile.customStartDate ||
    profile.startDate ||
    weeks[0]?.workouts[0]?.isoDate ||
    todayIso;

  const weekRuns = currentWeek.workouts.filter((w) => w.type !== 'Rest');
  const completedInWeek = weekRuns.filter((w) => w.completed);
  const weekLoggedKm = completedInWeek.reduce(
    (s, w) => s + (w.loggedData?.actualDistanceKm || w.plannedDistanceKm),
    0
  );
  const weekPct =
    currentWeek.totalPlannedKm > 0
      ? Math.min(
          100,
          Math.round((weekLoggedKm / currentWeek.totalPlannedKm) * 100)
        )
      : 0;

  const nextWorkout =
    currentWeek.workouts.find(
      (w) => w.isoDate === todayIso && w.type !== 'Rest' && !w.completed
    ) ||
    currentWeek.workouts.find((w) => w.type !== 'Rest' && !w.completed) ||
    weekRuns[0];

  const latestMappedRun = pastWorkouts[0];
  const fiveKPaceStr = formatSecondsToPace((profile.current5kMinutes * 60) / 5);
  const zones = calculatePaceZones(profile.current5kMinutes);
  const predictions = calculateRacePredictions(profile.current5kMinutes);

  return (
    <div className="space-y-16 pb-12">
      {/* WEBSITE HERO SECTION */}
      <section className="pt-2 lg:pt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        {/* Left Editorial Column */}
        <div className="lg:col-span-6 space-y-6">
          <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#CCFF00]">
            {profile.goalLabel} • Starts {formatIsoShort(effectiveStartIso)} (
            {profile.customStartDate ? 'Custom Date' : 'Today'})
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[3.35rem] font-black tracking-tight text-white leading-[1.06]">
            Adaptive running plans built around your pace.
          </h1>

          <p className="text-base text-zinc-400 leading-relaxed max-w-xl">
            Every interval, threshold block, and long-run progression is calibrated from your{' '}
            <span className="text-white font-semibold font-mono-tabular">
              {fiveKPaceStr}/km
            </span>{' '}
            5K benchmark, synced two-way with{' '}
            <span className="text-sky-400 font-semibold">
              Garmin {garmin.watchModel}
            </span>
            , and mapped with full post-workout GPS telemetry.
          </p>

          {/* Primary Website Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onNavigate('plan')}
              className="px-6 py-3.5 rounded-xl bg-[#CCFF00] hover:bg-[#b8e600] text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 transition cursor-pointer"
            >
              Open Training Plan
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="px-5 py-3.5 rounded-xl bg-[#151925] hover:bg-[#1C2232] border border-white/12 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-[#CCFF00]" />
              Review Past Workouts & Maps
            </button>

            <button
              type="button"
              onClick={onOpenOnboarding}
              className="px-4 py-3.5 rounded-xl text-zinc-400 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#CCFF00]" />
              Recalibrate Quiz
            </button>
          </div>

          {/* Athlete Live Status Strip */}
          <div className="pt-4 border-t border-white/10 grid grid-cols-3 gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
                Week 1 Mileage
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono-tabular text-white mt-0.5 block">
                {weekLoggedKm.toFixed(1)}{' '}
                <span className="text-xs font-normal text-zinc-400">
                  / {currentWeek.totalPlannedKm} km ({weekPct}%)
                </span>
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
                Past Runs Mapped
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono-tabular text-[#CCFF00] mt-0.5 block">
                {pastWorkouts.length}{' '}
                <span className="text-xs font-normal text-zinc-400">
                  GPS routes
                </span>
              </span>
            </div>

            <div
              onClick={onOpenGarminModal}
              className="cursor-pointer group"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 group-hover:text-sky-400 transition flex items-center gap-1">
                <Watch className="w-3 h-3 text-sky-400" />
                Garmin Readiness
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono-tabular text-white mt-0.5 block">
                {garmin.connected ? (
                  <>
                    {garmin.biometrics.trainingReadinessScore}
                    <span className="text-xs font-normal text-emerald-400">
                      /100 • VO2 {garmin.biometrics.garminVo2Max}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-bold text-zinc-400">
                    Connect Watch
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Right Hero Column: Latest Workout GPS Map OR Next Session Spotlight */}
        <div className="lg:col-span-6 space-y-3">
          {latestMappedRun ? (
            <>
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-extrabold uppercase tracking-wider text-zinc-300">
                    Latest Completed GPS Session
                  </span>
                  <span className="text-zinc-500">•</span>
                  <span className="font-mono-tabular text-[#CCFF00] font-bold">
                    {latestMappedRun.distanceKm} km @ {latestMappedRun.avgPaceStr}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('history')}
                  className="text-xs font-extrabold text-[#CCFF00] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Full Map & Splits
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <WorkoutRouteMap workout={latestMappedRun} compact />
            </>
          ) : (
            <div className="p-7 rounded-3xl bg-[#12151F] border border-white/10 space-y-4">
              <div className="w-11 h-11 rounded-2xl bg-[#CCFF00]/15 border border-[#CCFF00]/30 flex items-center justify-center text-[#CCFF00]">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#CCFF00]">
                  Ready for Workout #1
                </span>
                <h3 className="text-xl font-black text-white">
                  {nextWorkout ? nextWorkout.title : 'Your plan is calibrated'}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Complete your first scheduled run or log a session in Run Studio to unlock interactive GPS route maps, pace heatmaps, and split breakdowns here.
                </p>
              </div>
              {nextWorkout && (
                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => onSelectWorkout(nextWorkout)}
                    className="px-4 py-2.5 rounded-xl bg-[#CCFF00] hover:bg-[#b8e600] text-black font-extrabold text-xs uppercase tracking-wider transition cursor-pointer"
                  >
                    Inspect Session Breakdown
                  </button>
                  <button
                    type="button"
                    onClick={() => onLaunchLiveTracker(nextWorkout)}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                  >
                    Open Live Tracker
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: THIS WEEK'S SCHEDULE & NEXT UP SESSION */}
      <section className="space-y-5 pt-4 border-t border-white/8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#CCFF00]">
              Current Training Block • Week {currentWeek.weekNumber}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">
              {currentWeek.phaseName} Schedule
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {nextWorkout && (
              <button
                type="button"
                onClick={() => onLaunchLiveTracker(nextWorkout)}
                className="px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/14 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-[#CCFF00] fill-[#CCFF00]" />
                Track Next Session
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('plan')}
              className="px-4 py-2.5 rounded-xl bg-[#151925] hover:bg-[#1C2232] border border-white/10 text-xs font-extrabold uppercase tracking-wider text-[#CCFF00] flex items-center gap-1.5 transition cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              All {profile.planWeeks} Weeks
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {currentWeek.workouts.map((wo) => {
            const isRest = wo.type === 'Rest';
            const isToday = wo.isoDate === todayIso;
            return (
              <div
                key={wo.id}
                onClick={() => onSelectWorkout(wo)}
                className={`p-4 rounded-2xl border transition flex flex-col justify-between cursor-pointer ${
                  wo.completed
                    ? 'bg-[#13191D] border-[#CCFF00]/45 hover:border-[#CCFF00]'
                    : isToday
                    ? 'bg-[#181E2C] border-[#CCFF00] shadow-md'
                    : isRest
                    ? 'bg-[#101219] border-white/5 opacity-75 hover:opacity-100'
                    : 'bg-[#131722] border-white/10 hover:border-white/25'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5 gap-1">
                    <span className="font-black uppercase text-white flex items-center gap-1 flex-wrap">
                      <span>{wo.dayName}</span>
                      <span className="font-mono-tabular font-normal text-zinc-400">
                        {wo.dateStr}
                      </span>
                      {isToday && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#CCFF00] text-black">
                          Today
                        </span>
                      )}
                    </span>
                    {wo.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-[#CCFF00]" />
                    ) : (
                      <span className="text-[10px] font-bold uppercase text-zinc-400">
                        {wo.type}
                      </span>
                    )}
                  </div>

                  {isRest ? (
                    <div className="py-4 text-center text-zinc-500">
                      <Coffee className="w-4 h-4 mx-auto mb-1" />
                      <span className="text-xs font-semibold">Rest Day</span>
                    </div>
                  ) : (
                    <div className="mt-2.5">
                      <div className="text-sm font-extrabold text-white leading-snug">
                        {wo.title}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                        {wo.subtitle}
                      </div>
                    </div>
                  )}
                </div>

                {!isRest && (
                  <div className="mt-3 pt-2.5 border-t border-white/5 flex items-baseline justify-between font-mono-tabular">
                    <span className="text-base font-black text-white">
                      {wo.plannedDistanceKm} km
                    </span>
                    <span className="text-[11px] font-bold text-[#CCFF00]">
                      {wo.completed && wo.loggedData
                        ? wo.loggedData.actualPaceStr
                        : `~${wo.estimatedDurationMin}m`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: PAST WORKOUTS & ROUTE REVIEW SPOTLIGHT */}
      <section className="space-y-5 pt-4 border-t border-white/8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#CCFF00]">
              Recent Route History & Telemetry
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">
              Review Past Workouts
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('history')}
            className="self-start sm:self-auto px-5 py-2.5 rounded-xl bg-[#CCFF00] hover:bg-[#b8e600] text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition cursor-pointer"
          >
            Explore Past Workouts ({pastWorkouts.length})
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {pastWorkouts.length === 0 ? (
          <div className="p-8 rounded-3xl bg-[#12151F] border border-white/10 text-center space-y-2">
            <p className="text-sm font-bold text-white">
              No Completed Workouts Yet
            </p>
            <p className="text-xs text-zinc-400">
              Mark any scheduled workout as completed to generate its interactive GPS route map and split telemetry.
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {pastWorkouts.slice(0, 3).map((run) => {
            const pts = run.gpsTrack;
            const xs = pts.map((p) => p.x);
            const ys = pts.map((p) => p.y);
            const minX = Math.min(...xs) - 35;
            const maxX = Math.max(...xs) + 35;
            const minY = Math.min(...ys) - 35;
            const maxY = Math.max(...ys) + 35;
            const routePath = pts
              .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`)
              .join(' ');

            return (
              <div
                key={run.id}
                onClick={() => onNavigate('history')}
                className="group rounded-3xl bg-[#12151F] border border-white/10 hover:border-[#CCFF00]/60 transition overflow-hidden flex flex-col justify-between cursor-pointer"
              >
                {/* Mini Route Map Preview Header */}
                <div className="relative h-36 bg-[#0B0E15] border-b border-white/8 overflow-hidden">
                  <svg
                    viewBox={`${minX} ${minY} ${Math.max(
                      120,
                      maxX - minX
                    )} ${Math.max(90, maxY - minY)}`}
                    className="w-full h-full p-3"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <path
                      d={routePath}
                      fill="none"
                      stroke="#CCFF00"
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-[#0B0E16]/90 border border-white/10 text-[10px] font-extrabold uppercase text-white">
                    {run.type}
                  </div>
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-zinc-300 font-mono-tabular">
                    <span className="truncate flex items-center gap-1 bg-[#0B0E16]/85 px-2 py-0.5 rounded-md">
                      <MapPin className="w-3 h-3 text-[#CCFF00] shrink-0" />
                      {run.locationName}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div>
                    <span className="text-[11px] font-mono-tabular text-zinc-400">
                      {run.dateLabel}
                    </span>
                    <h3 className="text-base font-black text-white group-hover:text-[#CCFF00] transition mt-0.5">
                      {run.title}
                    </h3>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 font-mono-tabular">
                    <div>
                      <span className="text-[10px] uppercase text-zinc-500 block">
                        Distance
                      </span>
                      <span className="text-sm font-black text-white">
                        {run.distanceKm.toFixed(1)} km
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-zinc-500 block">
                        Pace / Time
                      </span>
                      <span className="text-sm font-black text-[#CCFF00]">
                        {run.avgPaceStr}
                      </span>
                      <span className="text-[10px] text-zinc-500 block">
                        {formatDuration(run.durationSeconds)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-zinc-500 block">
                        HR / Climb
                      </span>
                      <span className="text-xs font-bold text-[#FF4D4D] flex items-center justify-end gap-0.5">
                        <Heart className="w-3 h-3" />
                        {run.avgHeartRate}
                      </span>
                      <span className="text-[10px] text-emerald-400 flex items-center justify-end gap-0.5">
                        <Mountain className="w-2.5 h-2.5" />+{run.elevationGainM}m
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </section>

      {/* SECTION 4: RACE PREDICTIONS & PERSONALIZED TRAINING ZONES */}
      <section className="pt-4 border-t border-white/8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 p-6 rounded-3xl bg-[#12151F] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-[#CCFF00]" />
                Projected Race Equivalents
              </h3>
              <p className="text-xs text-zinc-400">
                Current fitness equivalence from your {fiveKPaceStr}/km 5K benchmark.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('progress')}
              className="text-xs font-bold text-[#CCFF00] hover:underline cursor-pointer"
            >
              Full Analytics →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {predictions.map((pred) => (
              <div
                key={pred.distance}
                className={`p-3.5 rounded-2xl border ${
                  pred.distance === profile.goal
                    ? 'bg-[#CCFF00]/10 border-[#CCFF00]'
                    : 'bg-[#0C0F17] border-white/5'
                }`}
              >
                <div className="text-[11px] font-extrabold uppercase text-zinc-300">
                  {pred.distance}
                </div>
                <div className="text-xl font-black font-mono-tabular text-white mt-1">
                  {pred.formattedTime}
                </div>
                <div className="text-[11px] font-mono-tabular text-[#CCFF00] mt-0.5">
                  {pred.pacePerKm}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 p-6 rounded-3xl bg-[#12151F] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-white">
              Target Training Pace Zones
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
            >
              Adjust 5K →
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="px-3.5 py-2.5 rounded-xl bg-[#0C0F17] flex items-center justify-between">
              <span className="font-bold text-emerald-400">
                Zone 2 • Easy & Long Aerobic
              </span>
              <span className="font-mono-tabular font-bold text-white">
                {zones.easy.label}
              </span>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-[#0C0F17] flex items-center justify-between">
              <span className="font-bold text-amber-400">
                Zone 4 • Lactate Threshold Tempo
              </span>
              <span className="font-mono-tabular font-bold text-white">
                {zones.tempo.label}
              </span>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-[#0C0F17] flex items-center justify-between">
              <span className="font-bold text-[#FF4D4D]">
                Zone 5 • VO2 Max Speed Intervals
              </span>
              <span className="font-mono-tabular font-bold text-white">
                {zones.interval.label}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

import React from 'react';
import {
  Flame,
  Trophy,
  Calendar,
  Settings,
  RotateCcw,
  Award,
  Activity,
  Sparkles,
  Watch,
  Heart,
  BatteryCharging,
  ArrowUpRight,
} from 'lucide-react';
import type {
  GarminIntegrationState,
  TrainingWeek,
  UserProfile,
} from '../types';
import {
  calculatePaceZones,
  calculateRacePredictions,
  formatSecondsToPace,
} from '../utils/planGenerator';

interface ProfileViewProps {
  profile: UserProfile;
  weeks: TrainingWeek[];
  garmin: GarminIntegrationState;
  onOpenOnboarding: () => void;
  onOpenGarminModal: () => void;
  onQuickRecalibrate5k: (new5kMinutes: number) => void;
  onResetDefaultDemo: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  weeks,
  garmin,
  onOpenOnboarding,
  onOpenGarminModal,
  onQuickRecalibrate5k,
  onResetDefaultDemo,
}) => {
  const allWorkouts = weeks.flatMap((w) => w.workouts);
  const completedRuns = allWorkouts.filter((w) => w.completed);
  const totalLoggedKm = completedRuns.reduce(
    (s, w) => s + (w.loggedData?.actualDistanceKm || w.plannedDistanceKm),
    0
  );

  // Calculate active streak (0 for new accounts with no runs)
  const currentStreak = completedRuns.length;

  const zones = calculatePaceZones(profile.current5kMinutes);
  const predictions = calculateRacePredictions(profile.current5kMinutes);

  const fiveKMinFloor = Math.floor(profile.current5kMinutes);
  const fiveKSecRem = Math.round(
    (profile.current5kMinutes - fiveKMinFloor) * 60
  );
  const formatted5kTime = `${fiveKMinFloor}:${fiveKSecRem
    .toString()
    .padStart(2, '0')}`;
  const avg5kPace = formatSecondsToPace((profile.current5kMinutes * 60) / 5);

  return (
    <div className="space-y-6 pb-8">
      {/* Athlete Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#181C28] via-[#13161F] to-[#0E1017] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#CCFF00] text-black font-black text-2xl flex items-center justify-center shadow-lg shadow-[#CCFF00]/20">
            {profile.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-[#CCFF00]">
              <Sparkles className="w-3.5 h-3.5" />
              Runna Adaptive Athlete
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-0.5">
              {profile.name}
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              {weeks.length > 0 ? (
                <>
                  Goal:{' '}
                  <span className="text-white font-semibold">
                    {profile.goalLabel}
                  </span>{' '}
                  • {profile.daysPerWeek} runs/week • Target Date:{' '}
                  {profile.targetRaceDate}
                </>
              ) : (
                <span>No training plan created yet • Start the goal quiz to generate your plan</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenOnboarding}
            className="px-4 py-2.5 rounded-xl bg-[#CCFF00] hover:bg-[#b8e600] text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            {weeks.length > 0 ? 'Re-Run Onboarding Quiz' : 'Create Training Plan'}
          </button>

          {weeks.length > 0 && (
            <button
              type="button"
              onClick={onResetDefaultDemo}
              className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              title="Clear Plan & Workout Data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear Plan
            </button>
          )}
        </div>
      </div>

      {/* Garmin Connect™ Hardware & Biometrics Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#131C2E] via-[#13161F] to-[#11141D] border border-[#38BDF8]/35 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#007CC3]/25 border border-[#38BDF8]/40 flex items-center justify-center text-[#38BDF8] shrink-0">
              <Watch className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#38BDF8]">
                  Wearable Integration • Garmin Connect™
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    garmin.connected
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {garmin.connected ? 'Live Sync Active' : 'Not Connected'}
                </span>
              </div>
              <h2 className="text-lg font-black text-white mt-0.5">
                {garmin.connected
                  ? `Garmin ${garmin.watchModel}`
                  : 'No Garmin Watch Paired'}
              </h2>
              <p className="text-xs text-zinc-400 font-mono-tabular">
                {garmin.connected
                  ? `${garmin.pushedWorkoutIds.length} structured workouts pushed to watch • Battery ${garmin.batteryPct}%`
                  : 'Pair a Garmin watch to sync structured workouts & physiological biometrics'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenGarminModal}
            className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-[#38BDF8] hover:bg-[#0EA5E9] text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
          >
            {garmin.connected ? 'Manage Garmin Sync' : 'Connect Garmin Watch'}
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {garmin.connected && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-black/35 border border-white/5">
              <span className="text-[10px] font-bold uppercase text-zinc-400">
                Garmin VO2 Max
              </span>
              <div className="text-2xl font-black font-mono-tabular text-[#38BDF8] mt-1">
                {garmin.biometrics.garminVo2Max || '—'}
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold">
                Status: {garmin.biometrics.trainingStatus}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/35 border border-white/5">
              <span className="text-[10px] font-bold uppercase text-zinc-400">
                Training Readiness
              </span>
              <div className="text-2xl font-black font-mono-tabular text-[#CCFF00] mt-1">
                {garmin.biometrics.trainingReadinessScore}/100
              </div>
              <span className="text-[11px] text-zinc-400">
                Sleep Score: {garmin.biometrics.sleepScore}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/35 border border-white/5">
              <span className="text-[10px] font-bold uppercase text-zinc-400 flex items-center gap-1">
                <Heart className="w-3 h-3 text-[#FF4D4D]" />
                Overnight HRV
              </span>
              <div className="text-2xl font-black font-mono-tabular text-white mt-1">
                {garmin.biometrics.hrvStatusMs} ms
              </div>
              <span className="text-[11px] text-zinc-400">
                Resting HR: {garmin.biometrics.restingHrBpm} bpm
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/35 border border-white/5">
              <span className="text-[10px] font-bold uppercase text-zinc-400 flex items-center gap-1">
                <BatteryCharging className="w-3 h-3 text-emerald-400" />
                Recovery Advisor
              </span>
              <div className="text-2xl font-black font-mono-tabular text-white mt-1">
                {garmin.biometrics.recoveryTimeHours} hrs
              </div>
              <span className="text-[11px] text-emerald-400">
                Ready for key session
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Lifetime Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-[#13161F] border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#CCFF00]/15 border border-[#CCFF00]/30 flex items-center justify-center text-[#CCFF00]">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-zinc-400">
              Total Mileage Logged
            </span>
            <div className="text-2xl font-black font-mono-tabular text-white">
              {totalLoggedKm.toFixed(1)} km
            </div>
            <span className="text-[11px] text-zinc-500">
              {completedRuns.length} workouts completed
            </span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#13161F] border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FF4D4D]/15 border border-[#FF4D4D]/30 flex items-center justify-center text-[#FF4D4D]">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-zinc-400">
              Active Run Streak
            </span>
            <div className="text-2xl font-black font-mono-tabular text-white">
              {currentStreak} Sessions
            </div>
            <span className="text-[11px] text-emerald-400 font-semibold">
              100% on-track this week
            </span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#13161F] border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-zinc-400">
              Training Schedule
            </span>
            <div className="text-2xl font-black font-mono-tabular text-white">
              {profile.daysPerWeek} Days/Wk
            </div>
            <span className="text-[11px] text-zinc-500">
              {profile.planWeeks}-Week Periodized Block
            </span>
          </div>
        </div>
      </div>

      {/* Live Fitness & Pace Recalibration Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 p-6 rounded-3xl bg-[#13161F] border border-white/10 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#CCFF00]" />
                Adaptive Pace Calibration
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Adjust your 5K benchmark below to dynamically update all target
                paces across your training plan and Garmin watch.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#181C28] border border-white/10 space-y-4">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase text-zinc-400">
                  Current 5K Benchmark
                </div>
                <div className="text-3xl font-black font-mono-tabular text-[#CCFF00]">
                  {formatted5kTime}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase text-zinc-400">
                  Equivalent 5K Pace
                </div>
                <div className="text-lg font-bold font-mono-tabular text-white">
                  {avg5kPace}/km
                </div>
              </div>
            </div>

            <input
              type="range"
              min={15.0}
              max={40.0}
              step={0.25}
              value={profile.current5kMinutes}
              onChange={(e) => onQuickRecalibrate5k(parseFloat(e.target.value))}
              className="w-full accent-[#CCFF00] cursor-pointer"
            />

            <div className="grid grid-cols-3 gap-2 pt-2 text-center">
              <div className="p-2.5 rounded-xl bg-black/40">
                <div className="text-[10px] uppercase text-emerald-400 font-bold">
                  Easy Pace
                </div>
                <div className="text-xs font-mono-tabular font-bold text-white mt-0.5">
                  {zones.easy.label}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40">
                <div className="text-[10px] uppercase text-amber-400 font-bold">
                  Tempo Pace
                </div>
                <div className="text-xs font-mono-tabular font-bold text-white mt-0.5">
                  {zones.tempo.label}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40">
                <div className="text-[10px] uppercase text-[#FF4D4D] font-bold">
                  Interval Pace
                </div>
                <div className="text-xs font-mono-tabular font-bold text-white mt-0.5">
                  {zones.interval.label}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Race Pace Predictions Table */}
        <div className="lg:col-span-6 p-6 rounded-3xl bg-[#13161F] border border-white/10 space-y-4">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-[#CCFF00]" />
              Estimated Race Pace Predictions
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Calculated from your current VDOT / Riegel endurance curve.
            </p>
          </div>

          <div className="space-y-2.5">
            {predictions.map((pred) => (
              <div
                key={pred.distance}
                className="p-3.5 rounded-2xl bg-[#181C28] border border-white/5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-xs font-black font-mono-tabular text-[#CCFF00]">
                    {pred.distance === 'Half Marathon'
                      ? '21K'
                      : pred.distance === 'Marathon'
                      ? '42K'
                      : pred.distance}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      {pred.distance}
                    </div>
                    <div className="text-[11px] font-mono-tabular text-zinc-400">
                      Target Pace: {pred.pacePerKm}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black font-mono-tabular text-white">
                    {pred.formattedTime}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-emerald-400">
                    Predicted Finish
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

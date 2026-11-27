import React from 'react';
import {
  TrendingUp,
  Award,
  Flame,
  CheckCircle2,
  Activity,
  Clock,
  ChevronRight,
  Zap,
} from 'lucide-react';
import type { ScheduledWorkout, TrainingWeek, UserProfile } from '../types';
import {
  calculatePaceZones,
  calculateRacePredictions,
  formatDuration,
} from '../utils/planGenerator';

interface ProgressStatsViewProps {
  profile: UserProfile;
  weeks: TrainingWeek[];
  onOpenWorkout: (workout: ScheduledWorkout) => void;
}

export const ProgressStatsView: React.FC<ProgressStatsViewProps> = ({
  profile,
  weeks,
  onOpenWorkout,
}) => {
  const allWorkouts = weeks.flatMap((w) => w.workouts);
  const completedWorkouts = allWorkouts.filter((w) => w.completed && w.loggedData);
  const totalScheduledRuns = allWorkouts.filter((w) => w.type !== 'Rest').length;

  const totalLoggedKm = completedWorkouts.reduce(
    (sum, w) => sum + (w.loggedData?.actualDistanceKm || w.plannedDistanceKm),
    0
  );
  const totalLoggedSec = completedWorkouts.reduce(
    (sum, w) => sum + (w.loggedData?.actualDurationSeconds || 0),
    0
  );
  const avgRpe =
    completedWorkouts.length > 0
      ? (
          completedWorkouts.reduce((s, w) => s + (w.loggedData?.rpe || 6), 0) /
          completedWorkouts.length
        ).toFixed(1)
      : '—';

  const predictions = calculateRacePredictions(profile.current5kMinutes);
  const projectedEndOfPlanPredictions = calculateRacePredictions(
    Math.max(14.5, profile.current5kMinutes * 0.955)
  );
  const zones = calculatePaceZones(profile.current5kMinutes);

  // Max weekly km for chart scaling
  const maxWeekKm = Math.max(...weeks.map((w) => w.totalPlannedKm), 30);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <span className="text-xs font-extrabold uppercase tracking-widest text-[#CCFF00]">
          Performance Analytics & Projections
        </span>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          Training Progress & Race Readiness
        </h1>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-5 rounded-3xl bg-[#13161F] border border-white/10">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-zinc-400">
            <span>Total Distance</span>
            <TrendingUp className="w-4 h-4 text-[#CCFF00]" />
          </div>
          <div className="text-3xl font-black font-mono-tabular text-white mt-2">
            {totalLoggedKm.toFixed(1)}{' '}
            <span className="text-sm font-normal text-zinc-400">km</span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Across {completedWorkouts.length} completed sessions
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-[#13161F] border border-white/10">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-zinc-400">
            <span>Time on Feet</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-black font-mono-tabular text-white mt-2">
            {formatDuration(totalLoggedSec)}
          </div>
          <p className="text-xs text-zinc-400 mt-1">Cumulative logged duration</p>
        </div>

        <div className="p-5 rounded-3xl bg-[#13161F] border border-white/10">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-zinc-400">
            <span>Plan Adherence</span>
            <Flame className="w-4 h-4 text-[#FF4D4D]" />
          </div>
          <div className="text-3xl font-black font-mono-tabular text-[#CCFF00] mt-2">
            {completedWorkouts.length}{' '}
            <span className="text-sm font-normal text-zinc-400">
              / {totalScheduledRuns}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">Active training streak</p>
        </div>

        <div className="p-5 rounded-3xl bg-[#13161F] border border-white/10">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-zinc-400">
            <span>Avg Effort (RPE)</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black font-mono-tabular text-white mt-2">
            {avgRpe}{' '}
            <span className="text-sm font-normal text-zinc-400">/ 10</span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">Balanced load distribution</p>
        </div>
      </div>

      {/* Weekly Mileage Progression Chart */}
      <div className="p-6 rounded-3xl bg-[#13161F] border border-white/10 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-black text-white">
              Weekly Volume & Periodization Curve
            </h2>
            <p className="text-xs text-zinc-400">
              Completed mileage (neon lime) vs. scheduled weekly target across your {weeks.length}-week cycle.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <span className="w-3 h-3 rounded-sm bg-[#CCFF00] inline-block" />
              Logged KM
            </span>
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-3 h-3 rounded-sm bg-zinc-700 inline-block" />
              Planned Target
            </span>
          </div>
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-12 gap-3 items-end pt-4 h-52">
          {weeks.map((wk) => {
            const loggedInWeek = wk.workouts
              .filter((w) => w.completed)
              .reduce(
                (s, w) => s + (w.loggedData?.actualDistanceKm || w.plannedDistanceKm),
                0
              );
            const plannedPct = Math.max(
              15,
              Math.round((wk.totalPlannedKm / maxWeekKm) * 100)
            );
            const loggedPct =
              wk.totalPlannedKm > 0
                ? Math.min(100, Math.round((loggedInWeek / wk.totalPlannedKm) * 100))
                : 0;

            return (
              <div
                key={wk.weekNumber}
                className="flex flex-col items-center h-full justify-end group"
              >
                <div className="text-[10px] font-mono-tabular text-zinc-400 mb-1.5">
                  {loggedInWeek > 0 ? `${loggedInWeek.toFixed(0)}/` : ''}
                  {wk.totalPlannedKm.toFixed(0)}k
                </div>
                <div
                  className="w-full max-w-[38px] rounded-t-xl bg-zinc-800/90 relative overflow-hidden flex items-end transition-all"
                  style={{ height: `${plannedPct}%` }}
                >
                  <div
                    className="w-full bg-[#CCFF00] transition-all duration-500 rounded-t-xl"
                    style={{ height: `${loggedPct}%` }}
                  />
                </div>
                <div className="text-xs font-mono-tabular font-bold text-zinc-300 mt-2">
                  W{wk.weekNumber}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Race Time Predictions & Pace Zones Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Estimated Race Equivalence & Post-Plan Projection */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-[#13161F] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-[#CCFF00]" />
                Estimated Race Time Predictions
              </h2>
              <p className="text-xs text-zinc-400">
                Current fitness equivalence vs. projected finish after completing your {profile.planWeeks}-week plan.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {predictions.map((pred, idx) => {
              const projected = projectedEndOfPlanPredictions[idx];
              const isGoalRace = pred.distance === profile.goal;
              return (
                <div
                  key={pred.distance}
                  className={`p-4 rounded-2xl border transition ${
                    isGoalRace
                      ? 'bg-[#CCFF00]/10 border-[#CCFF00]'
                      : 'bg-[#181C28] border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                      {pred.distance}
                    </span>
                    {isGoalRace && (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#CCFF00] text-black">
                        Target Race
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <div className="text-[10px] uppercase text-zinc-400">
                        Current Fitness
                      </div>
                      <div className="text-xl font-black font-mono-tabular text-white">
                        {pred.formattedTime}
                      </div>
                      <div className="text-[11px] font-mono-tabular text-zinc-400">
                        {pred.pacePerKm}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase text-[#CCFF00] font-bold">
                        Post-Plan Peak
                      </div>
                      <div className="text-xl font-black font-mono-tabular text-[#CCFF00]">
                        {projected.formattedTime}
                      </div>
                      <div className="text-[11px] font-mono-tabular text-emerald-400">
                        {projected.pacePerKm}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Personalized Training Zones */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-[#13161F] border border-white/10 space-y-4">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#CCFF00]" />
              Your Personalized Pace Zones
            </h2>
            <p className="text-xs text-zinc-400">
              Automatically calibrated from your {profile.current5kMinutes.toFixed(1)}m 5K benchmark.
            </p>
          </div>

          <div className="space-y-2.5">
            {[
              {
                name: 'Easy & Long Aerobic',
                zone: 'Zone 2 (65–75% HR)',
                pace: zones.easy.label,
                color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
              },
              {
                name: 'Marathon Steady Pace',
                zone: 'Zone 3 (78–83% HR)',
                pace: zones.marathon.label,
                color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
              },
              {
                name: 'Lactate Threshold Tempo',
                zone: 'Zone 4 (85–90% HR)',
                pace: zones.tempo.label,
                color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
              },
              {
                name: 'VO2 Max Intervals (800m–1km)',
                zone: 'Zone 5 (93–98% HR)',
                pace: zones.interval.label,
                color: 'text-[#FF4D4D] bg-[#FF4D4D]/10 border-[#FF4D4D]/25',
              },
              {
                name: 'Anaerobic Track Reps (200m–400m)',
                zone: 'Zone 5+ (Neuromuscular)',
                pace: zones.repetition.label,
                color: 'text-[#CCFF00] bg-[#CCFF00]/10 border-[#CCFF00]/25',
              },
            ].map((item) => (
              <div
                key={item.name}
                className="p-3 rounded-2xl bg-[#181C28] border border-white/5 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-white">{item.name}</div>
                  <div className="text-[11px] text-zinc-400">{item.zone}</div>
                </div>
                <span
                  className={`text-xs font-mono-tabular font-bold px-2.5 py-1 rounded-xl border ${item.color}`}
                >
                  {item.pace}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Completed Workout History Log */}
      <div className="p-6 rounded-3xl bg-[#13161F] border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-white">Completed Run Logbook</h2>
            <p className="text-xs text-zinc-400">
              Click any logged workout to review splits, RPE, or edit details.
            </p>
          </div>
          <span className="text-xs font-mono-tabular text-zinc-400">
            {completedWorkouts.length} Logged
          </span>
        </div>

        {completedWorkouts.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            No workouts marked completed yet. Head to your Plan or Track tab to log your first session!
          </div>
        ) : (
          <div className="space-y-2.5">
            {completedWorkouts.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => onOpenWorkout(w)}
                className="w-full text-left p-4 rounded-2xl bg-[#181C28] hover:bg-[#1E2332] border border-white/5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#CCFF00]/15 border border-[#CCFF00]/30 flex items-center justify-center text-[#CCFF00] shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono-tabular text-zinc-400">
                        Week {w.weekNumber} • {w.dayName} ({w.dateStr})
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-white/5 text-zinc-300">
                        {w.type}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white mt-0.5">{w.title}</h4>
                    {w.loggedData?.notes && (
                      <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                        "{w.loggedData.notes}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <div className="text-right font-mono-tabular">
                    <div className="text-sm font-black text-white">
                      {w.loggedData?.actualDistanceKm} km •{' '}
                      <span className="text-[#CCFF00]">{w.loggedData?.actualPaceStr}</span>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Time: {formatDuration(w.loggedData?.actualDurationSeconds || 0)} • RPE{' '}
                      {w.loggedData?.rpe}/10
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

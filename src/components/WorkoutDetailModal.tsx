import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Play,
  Clock,
  MapPin,
  Gauge,
  Sparkles,
  RotateCcw,
  Watch,
  Send,
  Download,
  Heart,
  Activity,
} from 'lucide-react';
import type {
  GarminIntegrationState,
  LoggedRunData,
  ScheduledWorkout,
} from '../types';
import { formatDuration, formatSecondsToPace } from '../utils/planGenerator';
import { downloadGarminWorkoutFile } from '../utils/garminUtils';

interface WorkoutDetailModalProps {
  workout: ScheduledWorkout;
  garmin: GarminIntegrationState;
  onClose: () => void;
  onLogComplete: (workoutId: string, loggedData: LoggedRunData) => void;
  onUncomplete: (workoutId: string) => void;
  onLaunchLiveTracker: (workout: ScheduledWorkout) => void;
  onPushWorkoutToGarmin: (workoutId: string) => void;
}

export const WorkoutDetailModal: React.FC<WorkoutDetailModalProps> = ({
  workout,
  garmin,
  onClose,
  onLogComplete,
  onUncomplete,
  onLaunchLiveTracker,
  onPushWorkoutToGarmin,
}) => {
  const defaultDurMin =
    workout.loggedData
      ? Math.floor(workout.loggedData.actualDurationSeconds / 60)
      : workout.estimatedDurationMin || 30;
  const defaultDurSec =
    workout.loggedData ? workout.loggedData.actualDurationSeconds % 60 : 0;

  const [showLogForm, setShowLogForm] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number>(
    workout.loggedData?.actualDistanceKm ?? workout.plannedDistanceKm
  );
  const [durationMin, setDurationMin] = useState<number>(defaultDurMin);
  const [durationSec, setDurationSec] = useState<number>(defaultDurSec);
  const [rpe, setRpe] = useState<number>(workout.loggedData?.rpe ?? 6);
  const [notes, setNotes] = useState<string>(workout.loggedData?.notes ?? '');
  const [justPushed, setJustPushed] = useState(false);

  const isPushedToGarmin = garmin.pushedWorkoutIds.includes(workout.id);

  const totalSec = durationMin * 60 + durationSec;
  const calculatedPaceSec = distanceKm > 0 ? totalSec / distanceKm : 0;
  const calculatedPaceStr =
    distanceKm > 0 ? `${formatSecondsToPace(calculatedPaceSec)}/km` : '--:--/km';

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    onLogComplete(workout.id, {
      actualDistanceKm: Number(distanceKm),
      actualDurationSeconds: totalSec,
      actualPaceStr: calculatedPaceStr,
      rpe,
      notes: notes.trim() || undefined,
      completedAt: new Date().toISOString(),
      source: 'Manual',
    });
    setShowLogForm(false);
  };

  const handlePushWatch = () => {
    onPushWorkoutToGarmin(workout.id);
    setJustPushed(true);
    setTimeout(() => setJustPushed(false), 3000);
  };

  const getTypeBadgeStyle = () => {
    switch (workout.type) {
      case 'Intervals':
        return 'bg-[#FF4D4D]/15 text-[#FF4D4D] border-[#FF4D4D]/30';
      case 'Tempo':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'Long Run':
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      case 'Easy Run':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  const rpeLabels: Record<number, string> = {
    1: 'Very Light',
    2: 'Light & Easy',
    3: 'Conversational',
    4: 'Comfortable',
    5: 'Moderate',
    6: 'Steady Effort',
    7: 'Vigorous / Tempo',
    8: 'Hard / Threshold',
    9: 'Very Hard / VO2',
    10: 'Max All-Out Effort',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-t-3xl sm:rounded-3xl bg-[#12141C] border border-white/10 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header Bar */}
        <div className="px-6 pt-5 pb-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span
              className={`text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${getTypeBadgeStyle()}`}
            >
              {workout.type}
            </span>
            <span className="text-xs font-mono-tabular text-zinc-400">
              Week {workout.weekNumber} • {workout.dayName}, {workout.dateStr}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Title & Primary Metric Banner */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-2xl font-black tracking-tight text-white">
                {workout.title}
              </h2>
              {workout.completed && (
                <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-[#CCFF00] text-black">
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  Completed
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-400 mt-1">{workout.subtitle}</p>

            {workout.type !== 'Rest' && (
              <div className="grid grid-cols-3 gap-2.5 mt-4">
                <div className="p-3.5 rounded-2xl bg-[#181B26] border border-white/5">
                  <div className="flex items-center gap-1 text-[11px] font-bold uppercase text-zinc-400">
                    <MapPin className="w-3.5 h-3.5 text-[#CCFF00]" />
                    Planned Dist
                  </div>
                  <div className="text-xl font-black font-mono-tabular text-white mt-1">
                    {workout.plannedDistanceKm}{' '}
                    <span className="text-xs font-normal text-zinc-400">km</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#181B26] border border-white/5">
                  <div className="flex items-center gap-1 text-[11px] font-bold uppercase text-zinc-400">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    Est. Time
                  </div>
                  <div className="text-xl font-black font-mono-tabular text-white mt-1">
                    ~{workout.estimatedDurationMin}{' '}
                    <span className="text-xs font-normal text-zinc-400">min</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#181B26] border border-white/5">
                  <div className="flex items-center gap-1 text-[11px] font-bold uppercase text-zinc-400">
                    <Gauge className="w-3.5 h-3.5 text-[#FF4D4D]" />
                    Target Pace
                  </div>
                  <div className="text-sm font-black font-mono-tabular text-[#CCFF00] mt-1.5 truncate">
                    {workout.targetPaceSummary}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Garmin Connect Structured Workout Sync Strip */}
          {workout.type !== 'Rest' && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#131C2E] to-[#151824] border border-[#38BDF8]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#007CC3]/25 border border-[#38BDF8]/40 flex items-center justify-center text-[#38BDF8] shrink-0">
                  <Watch className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#38BDF8]">
                      Garmin {garmin.watchModel}
                    </span>
                    {isPushedToGarmin && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Synced to Watch
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {justPushed
                      ? 'Structured intervals & wrist pace alerts sent to Garmin Connect!'
                      : 'Send structured steps & target pace alerts or export .TCX file'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handlePushWatch}
                  className={`px-3 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
                    isPushedToGarmin
                      ? 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 hover:bg-[#38BDF8]/25'
                      : 'bg-[#38BDF8] text-black hover:bg-[#0EA5E9]'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  {isPushedToGarmin ? 'Re-Push Watch' : 'Send to Garmin'}
                </button>
                <button
                  type="button"
                  onClick={() => downloadGarminWorkoutFile(workout, garmin.watchModel)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition cursor-pointer"
                  title="Download Garmin .TCX Structured Workout File"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Logged Result Banner (if completed) */}
          {workout.completed && workout.loggedData && !showLogForm && (
            <div className="p-4 rounded-2xl bg-[#CCFF00]/10 border border-[#CCFF00]/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#CCFF00] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Logged Workout Performance
                  {workout.loggedData.source === 'Garmin Connect' && (
                    <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40">
                      Garmin GPS Synced
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowLogForm(true)}
                    className="text-xs font-semibold text-zinc-300 hover:text-white underline"
                  >
                    Edit Log
                  </button>
                  <button
                    onClick={() => onUncomplete(workout.id)}
                    className="text-xs font-semibold text-zinc-400 hover:text-red-400 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-black/40">
                  <div className="text-[10px] uppercase text-zinc-400">Actual Dist</div>
                  <div className="text-base font-black font-mono-tabular text-white">
                    {workout.loggedData.actualDistanceKm} km
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/40">
                  <div className="text-[10px] uppercase text-zinc-400">Time / Pace</div>
                  <div className="text-sm font-black font-mono-tabular text-[#CCFF00]">
                    {formatDuration(workout.loggedData.actualDurationSeconds)} (
                    {workout.loggedData.actualPaceStr})
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/40">
                  <div className="text-[10px] uppercase text-zinc-400">Effort (RPE)</div>
                  <div className="text-base font-black font-mono-tabular text-white">
                    {workout.loggedData.rpe}/10
                  </div>
                </div>
              </div>

              {/* Garmin Biometric Telemetry Breakdown (if synced from Garmin) */}
              {workout.loggedData.garminMetrics && (
                <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                  <div className="p-2 rounded-xl bg-[#0F172A]/80 border border-[#38BDF8]/20">
                    <div className="text-[9px] uppercase text-zinc-400 flex items-center justify-center gap-1">
                      <Heart className="w-2.5 h-2.5 text-[#FF4D4D]" />
                      Avg / Max HR
                    </div>
                    <div className="text-xs font-black font-mono-tabular text-white mt-0.5">
                      {workout.loggedData.garminMetrics.avgHeartRate} /{' '}
                      {workout.loggedData.garminMetrics.maxHeartRate} bpm
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#0F172A]/80 border border-[#38BDF8]/20">
                    <div className="text-[9px] uppercase text-zinc-400">Cadence</div>
                    <div className="text-xs font-black font-mono-tabular text-[#38BDF8] mt-0.5">
                      {workout.loggedData.garminMetrics.avgCadenceSpm} spm
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#0F172A]/80 border border-[#38BDF8]/20">
                    <div className="text-[9px] uppercase text-zinc-400 flex items-center justify-center gap-1">
                      <Activity className="w-2.5 h-2.5 text-emerald-400" />
                      Aerobic TE
                    </div>
                    <div className="text-xs font-black font-mono-tabular text-emerald-400 mt-0.5">
                      {workout.loggedData.garminMetrics.trainingEffectAerobic} / 5.0
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#0F172A]/80 border border-[#38BDF8]/20">
                    <div className="text-[9px] uppercase text-zinc-400">Elevation</div>
                    <div className="text-xs font-black font-mono-tabular text-white mt-0.5">
                      +{workout.loggedData.garminMetrics.elevationGainM}m
                    </div>
                  </div>
                </div>
              )}

              {workout.loggedData.notes && (
                <p className="text-xs text-zinc-300 italic bg-black/30 px-3 py-2 rounded-xl">
                  "{workout.loggedData.notes}"
                </p>
              )}
            </div>
          )}

          {/* Structured Workout Breakdown Timeline */}
          {workout.segments.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                  Structured Session Breakdown
                </h3>
                <span className="text-[11px] font-mono-tabular text-zinc-500">
                  {workout.segments.length} Phases
                </span>
              </div>

              <div className="space-y-2.5 relative">
                {workout.segments.map((seg, index) => {
                  const isWork = seg.type === 'Work';
                  const isWarmOrCool =
                    seg.type === 'Warmup' || seg.type === 'Cooldown';
                  return (
                    <div
                      key={seg.id}
                      className={`p-4 rounded-2xl border transition ${
                        isWork
                          ? 'bg-gradient-to-r from-[#1E2230] to-[#171A24] border-[#CCFF00]/40'
                          : 'bg-[#171A24] border-white/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-lg text-xs font-black font-mono-tabular flex items-center justify-center ${
                              isWork
                                ? 'bg-[#CCFF00] text-black'
                                : isWarmOrCool
                                ? 'bg-zinc-800 text-zinc-300'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {index + 1}
                          </span>
                          <div>
                            <span
                              className={`text-[10px] font-extrabold uppercase tracking-wider ${
                                isWork ? 'text-[#CCFF00]' : 'text-zinc-400'
                              }`}
                            >
                              {seg.type}{' '}
                              {seg.repeats ? `• ${seg.repeats} Repeats` : ''}
                            </span>
                            <h4 className="text-sm font-bold text-white">
                              {seg.title}
                            </h4>
                          </div>
                        </div>

                        {seg.targetPaceMinPerKm && (
                          <span
                            className={`shrink-0 text-xs font-mono-tabular font-bold px-2.5 py-1 rounded-lg ${
                              isWork
                                ? 'bg-[#CCFF00]/15 text-[#CCFF00] border border-[#CCFF00]/30'
                                : 'bg-black/40 text-zinc-300'
                            }`}
                          >
                            {seg.targetPaceMinPerKm}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-400 mt-2 pl-8 leading-relaxed">
                        {seg.description}
                      </p>

                      {seg.restDurationSeconds && (
                        <div className="mt-2.5 ml-8 inline-flex items-center gap-1.5 text-[11px] font-mono-tabular text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                          <Clock className="w-3 h-3" />
                          Recovery between intervals: {seg.restDurationSeconds}s
                          walking / light jog
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Coach Note Card */}
          <div className="p-4 rounded-2xl bg-[#171A24] border border-white/5 flex gap-3.5 items-start">
            <div className="w-9 h-9 rounded-xl bg-[#CCFF00]/15 border border-[#CCFF00]/30 flex items-center justify-center shrink-0 text-[#CCFF00]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#CCFF00]">
                Runna Coach Focus • {workout.keyFocus}
              </div>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                {workout.coachTip}
              </p>
            </div>
          </div>

          {/* Log Workout Form */}
          {showLogForm && (
            <form
              onSubmit={handleSaveLog}
              className="p-5 rounded-2xl bg-[#181C26] border border-[#CCFF00]/40 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold uppercase tracking-wider text-white">
                  Log Completed Workout
                </h4>
                <span className="text-xs font-mono-tabular text-[#CCFF00] font-bold">
                  Avg Pace: {calculatedPaceStr}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                    Distance (km)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white font-mono-tabular text-sm focus:outline-none focus:border-[#CCFF00]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                    Minutes
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={durationMin}
                    onChange={(e) =>
                      setDurationMin(parseInt(e.target.value, 10) || 0)
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white font-mono-tabular text-sm focus:outline-none focus:border-[#CCFF00]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                    Seconds
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    required
                    value={durationSec}
                    onChange={(e) =>
                      setDurationSec(parseInt(e.target.value, 10) || 0)
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white font-mono-tabular text-sm focus:outline-none focus:border-[#CCFF00]"
                  />
                </div>
              </div>

              {/* Perceived Effort RPE 1-10 */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-bold uppercase text-zinc-400">
                    Perceived Effort (RPE 1–10)
                  </span>
                  <span className="font-mono-tabular font-bold text-[#CCFF00]">
                    {rpe}/10 • {rpeLabels[rpe]}
                  </span>
                </div>
                <div className="grid grid-cols-10 gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRpe(val)}
                      className={`py-2 rounded-lg font-mono-tabular text-xs font-bold transition ${
                        rpe === val
                          ? val >= 8
                            ? 'bg-[#FF4D4D] text-white'
                            : 'bg-[#CCFF00] text-black'
                          : 'bg-black/40 text-zinc-400 hover:bg-white/10'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                  Post-Run Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How did the splits feel? Any weather or fueling notes?"
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-[#CCFF00]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowLogForm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-[#CCFF00] text-black hover:bg-[#b8e600] transition cursor-pointer"
                >
                  Save Completed Run
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Sticky Bottom Action Bar */}
        {workout.type !== 'Rest' && !showLogForm && (
          <div className="p-4 border-t border-white/5 bg-[#0E1017] flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onLaunchLiveTracker(workout)}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Play className="w-4 h-4 text-[#CCFF00] fill-[#CCFF00]" />
              Track Live Simulator
            </button>

            <button
              type="button"
              onClick={() => setShowLogForm(true)}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-[#CCFF00] hover:bg-[#b8e600] text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#CCFF00]/15 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              {workout.completed ? 'Update Run Log' : 'Mark Completed'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

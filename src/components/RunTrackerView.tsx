import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Flag,
  CheckCircle2,
  FastForward,
  Timer,
  Gauge,
  PlusCircle,
  Watch,
  ArrowUpRight,
  Download,
} from 'lucide-react';
import type {
  GarminActivityFeedItem,
  GarminIntegrationState,
  LoggedRunData,
  ScheduledWorkout,
  UserProfile,
} from '../types';
import {
  calculatePaceZones,
  formatDuration,
  formatSecondsToPace,
} from '../utils/planGenerator';
import { downloadGarminWorkoutFile } from '../utils/garminUtils';

interface RunTrackerViewProps {
  profile: UserProfile;
  garmin: GarminIntegrationState;
  activeWorkout: ScheduledWorkout | null;
  availableWorkouts: ScheduledWorkout[];
  onSelectWorkout: (workout: ScheduledWorkout) => void;
  onSaveTrackedRun: (workoutId: string, loggedData: LoggedRunData) => void;
  onImportGarminActivity: (
    activity: GarminActivityFeedItem,
    targetWorkoutId?: string
  ) => void;
}

export const RunTrackerView: React.FC<RunTrackerViewProps> = ({
  profile,
  garmin,
  activeWorkout,
  availableWorkouts,
  onSelectWorkout,
  onSaveTrackedRun,
  onImportGarminActivity,
}) => {
  const zones = calculatePaceZones(profile.current5kMinutes);
  const defaultTargetPaceSec = Math.round((zones.tempo.min + zones.tempo.max) / 2);

  const [mode, setMode] = useState<'live' | 'garmin' | 'manual'>('live');
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>(
    activeWorkout?.id || availableWorkouts[0]?.id || 'w1-d1'
  );

  // Live simulator states
  const [isRunning, setIsRunning] = useState(false);
  const [simSpeedMultiplier, setSimSpeedMultiplier] = useState<1 | 10 | 30>(10);
  const [currentPaceSecPerKm, setCurrentPaceSecPerKm] = useState<number>(
    activeWorkout?.segments.find((s) => s.type === 'Work')?.targetPaceSecPerKm ||
      defaultTargetPaceSec
  );
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [splits, setSplits] = useState<
    { km: number; timeSeconds: number; paceStr: string }[]
  >([]);
  const [liveRpe, setLiveRpe] = useState<number>(7);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  const lastKmSplitRef = useRef<number>(0);
  const lastSplitTimeRef = useRef<number>(0);

  // Sync selected workout
  useEffect(() => {
    if (activeWorkout) {
      setSelectedWorkoutId(activeWorkout.id);
      const workSeg =
        activeWorkout.segments.find((s) => s.type === 'Work') ||
        activeWorkout.segments[0];
      if (workSeg?.targetPaceSecPerKm) {
        setCurrentPaceSecPerKm(workSeg.targetPaceSecPerKm);
      }
    }
  }, [activeWorkout]);

  const currentWorkout =
    availableWorkouts.find((w) => w.id === selectedWorkoutId) ||
    activeWorkout ||
    availableWorkouts[0];

  // Live tick loop
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const deltaSec = 0.25 * simSpeedMultiplier;
      setElapsedSeconds((prev) => {
        const nextElapsed = prev + deltaSec;
        const deltaKm = deltaSec / currentPaceSecPerKm;

        setDistanceKm((prevDist) => {
          const nextDist = prevDist + deltaKm;
          const wholeKm = Math.floor(nextDist);
          if (wholeKm > lastKmSplitRef.current && wholeKm >= 1) {
            const splitDuration = Math.max(
              150,
              Math.round(nextElapsed - lastSplitTimeRef.current)
            );
            lastKmSplitRef.current = wholeKm;
            lastSplitTimeRef.current = nextElapsed;
            setSplits((oldSplits) => {
              if (oldSplits.some((s) => s.km === wholeKm)) return oldSplits;
              return [
                ...oldSplits,
                {
                  km: wholeKm,
                  timeSeconds: splitDuration,
                  paceStr: `${formatSecondsToPace(splitDuration)}/km`,
                },
              ];
            });
          }
          return nextDist;
        });

        return nextElapsed;
      });
    }, 250);

    return () => clearInterval(interval);
  }, [isRunning, simSpeedMultiplier, currentPaceSecPerKm]);

  const handleManualLapSplit = () => {
    const nextKmNum = splits.length + 1;
    const splitDur =
      elapsedSeconds - lastSplitTimeRef.current > 10
        ? Math.round(elapsedSeconds - lastSplitTimeRef.current)
        : currentPaceSecPerKm;
    lastSplitTimeRef.current = elapsedSeconds;
    lastKmSplitRef.current = nextKmNum;
    setSplits((prev) => [
      ...prev,
      {
        km: nextKmNum,
        timeSeconds: splitDur,
        paceStr: `${formatSecondsToPace(currentPaceSecPerKm)}/km`,
      },
    ]);
  };

  const handleResetLive = () => {
    setIsRunning(false);
    setElapsedSeconds(0);
    setDistanceKm(0);
    setSplits([]);
    lastKmSplitRef.current = 0;
    lastSplitTimeRef.current = 0;
  };

  const handleFinishAndSaveLive = () => {
    setIsRunning(false);
    const finalDist = Math.max(
      0.5,
      Number((distanceKm || currentWorkout?.plannedDistanceKm || 5).toFixed(2))
    );
    const finalDur =
      elapsedSeconds > 30
        ? Math.round(elapsedSeconds)
        : Math.round(finalDist * currentPaceSecPerKm);
    const avgPaceSec = Math.round(finalDur / finalDist);

    onSaveTrackedRun(selectedWorkoutId, {
      actualDistanceKm: finalDist,
      actualDurationSeconds: finalDur,
      actualPaceStr: `${formatSecondsToPace(avgPaceSec)}/km`,
      rpe: liveRpe,
      notes: `Tracked via Runna Live GPS Simulator (${splits.length} splits recorded).`,
      completedAt: new Date().toISOString(),
      splits,
    });

    setSavedBanner(
      `Logged ${finalDist}km in ${formatDuration(finalDur)} (${formatSecondsToPace(
        avgPaceSec
      )}/km)!`
    );
    setTimeout(() => setSavedBanner(null), 5000);
  };

  // Manual Entry States
  const [manualDist, setManualDist] = useState<number>(
    currentWorkout?.plannedDistanceKm || 5.0
  );
  const [manualMin, setManualMin] = useState<number>(
    currentWorkout?.estimatedDurationMin || 25
  );
  const [manualSec, setManualSec] = useState<number>(0);
  const [manualRpe, setManualRpe] = useState<number>(6);
  const [manualNotes, setManualNotes] = useState<string>('');

  const manualTotalSec = manualMin * 60 + manualSec;
  const manualPaceSec = manualDist > 0 ? manualTotalSec / manualDist : 0;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveTrackedRun(selectedWorkoutId, {
      actualDistanceKm: Number(manualDist),
      actualDurationSeconds: manualTotalSec,
      actualPaceStr: `${formatSecondsToPace(manualPaceSec)}/km`,
      rpe: manualRpe,
      notes: manualNotes.trim() || 'Manually logged training session.',
      completedAt: new Date().toISOString(),
    });
    setSavedBanner(
      `Saved ${manualDist}km @ ${formatSecondsToPace(manualPaceSec)}/km to your training plan!`
    );
    setTimeout(() => setSavedBanner(null), 5000);
  };

  const targetPlannedKm = currentWorkout?.plannedDistanceKm || 5.0;
  const progressPct = Math.min(100, (distanceKm / targetPlannedKm) * 100);

  return (
    <div className="space-y-6 pb-8">
      {/* Mode Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#CCFF00]">
            Runna Telemetry & Logger
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Track or Log Session
          </h1>
        </div>

        <div className="inline-flex p-1 rounded-2xl bg-[#141720] border border-white/10">
          <button
            type="button"
            onClick={() => setMode('live')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
              mode === 'live'
                ? 'bg-[#CCFF00] text-black shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Live Simulator
          </button>
          <button
            type="button"
            onClick={() => setMode('garmin')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer ${
              mode === 'garmin'
                ? 'bg-[#38BDF8] text-black shadow'
                : 'text-[#38BDF8] hover:text-white'
            }`}
          >
            <Watch className="w-3.5 h-3.5" />
            Garmin Sync
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
              mode === 'manual'
                ? 'bg-[#CCFF00] text-black shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Manual Logger
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {savedBanner && (
        <div className="p-4 rounded-2xl bg-[#CCFF00]/15 border border-[#CCFF00] text-[#CCFF00] flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{savedBanner}</span>
          </div>
        </div>
      )}

      {/* Target Scheduled Workout Selector */}
      <div className="p-4 rounded-2xl bg-[#13161F] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
            Linked Training Plan Session
          </label>
          <div className="text-sm font-bold text-white mt-0.5">
            {currentWorkout
              ? `Week ${currentWorkout.weekNumber} • ${currentWorkout.dayName}: ${currentWorkout.title}`
              : 'Unscheduled Run'}
          </div>
        </div>

        <select
          value={selectedWorkoutId}
          onChange={(e) => {
            setSelectedWorkoutId(e.target.value);
            const found = availableWorkouts.find((w) => w.id === e.target.value);
            if (found) {
              onSelectWorkout(found);
              setManualDist(found.plannedDistanceKm);
              setManualMin(found.estimatedDurationMin);
            }
          }}
          className="px-3.5 py-2.5 rounded-xl bg-[#1A1E2B] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-[#CCFF00]"
        >
          {availableWorkouts
            .filter((w) => w.type !== 'Rest')
            .map((w) => (
              <option key={w.id} value={w.id}>
                Wk {w.weekNumber} {w.dayName} — {w.title} ({w.plannedDistanceKm}km)
                {w.completed ? ' ✓' : ''}
              </option>
            ))}
        </select>
      </div>

      {mode === 'live' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Primary Live Telemetry Cockpit */}
          <div className="lg:col-span-7 p-6 rounded-3xl bg-gradient-to-b from-[#161924] to-[#10121A] border border-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isRunning
                      ? 'bg-[#CCFF00] animate-ping'
                      : 'bg-zinc-600'
                  }`}
                />
                <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                  {isRunning ? 'Audio Pace Cues Active' : 'Ready to Start Session'}
                </span>
              </div>

              {/* Sim Speed Multiplier */}
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                <FastForward className="w-3.5 h-3.5 text-zinc-400 ml-1.5 mr-1" />
                {([1, 10, 30] as const).map((mult) => (
                  <button
                    key={mult}
                    type="button"
                    onClick={() => setSimSpeedMultiplier(mult)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-mono-tabular font-bold transition cursor-pointer ${
                      simSpeedMultiplier === mult
                        ? 'bg-[#CCFF00] text-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {mult}x
                  </button>
                ))}
              </div>
            </div>

            {/* Big Hero Readouts */}
            <div className="grid grid-cols-3 gap-3 text-center py-4">
              <div className="p-4 rounded-2xl bg-black/35 border border-white/5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Distance
                </span>
                <div className="text-3xl sm:text-4xl font-black font-mono-tabular text-white mt-1">
                  {distanceKm.toFixed(2)}
                </div>
                <span className="text-[11px] text-zinc-500 font-mono-tabular">
                  / {targetPlannedKm} km
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-black/35 border border-[#CCFF00]/30">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#CCFF00]">
                  Current Pace
                </span>
                <div className="text-3xl sm:text-4xl font-black font-mono-tabular text-[#CCFF00] mt-1">
                  {formatSecondsToPace(currentPaceSecPerKm)}
                </div>
                <span className="text-[11px] text-zinc-400 font-mono-tabular">
                  min / km
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-black/35 border border-white/5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Elapsed
                </span>
                <div className="text-3xl sm:text-4xl font-black font-mono-tabular text-white mt-1">
                  {formatDuration(elapsedSeconds)}
                </div>
                <span className="text-[11px] text-zinc-500 font-mono-tabular">
                  hr:min:sec
                </span>
              </div>
            </div>

            {/* Workout Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono-tabular">
                <span className="text-zinc-400">Target Completion</span>
                <span className="text-[#CCFF00] font-bold">
                  {progressPct.toFixed(0)}% ({distanceKm.toFixed(2)} / {targetPlannedKm} km)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#CCFF00] to-emerald-400 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Live Pace Throttle Control */}
            <div className="p-4 rounded-2xl bg-[#181C28] border border-white/5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-[#CCFF00]" />
                  Simulate Running Pace Cadence
                </span>
                <span className="font-mono-tabular text-[#CCFF00] font-bold">
                  {formatSecondsToPace(currentPaceSecPerKm)}/km
                </span>
              </div>
              <input
                type="range"
                min={195}
                max={450}
                step={2}
                value={currentPaceSecPerKm}
                onChange={(e) => setCurrentPaceSecPerKm(Number(e.target.value))}
                className="w-full accent-[#CCFF00] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono-tabular text-zinc-500">
                <span>Fast Interval (3:15/km)</span>
                <span>Target Zone ({currentWorkout?.targetPaceSummary})</span>
                <span>Easy Jog (7:30/km)</span>
              </div>
            </div>

            {/* Primary Controls */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRunning(!isRunning)}
                className={`flex-1 py-4 px-5 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
                  isRunning
                    ? 'bg-amber-400 text-black hover:bg-amber-300'
                    : 'bg-[#CCFF00] text-black hover:bg-[#b8e600] shadow-lg shadow-[#CCFF00]/20'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4 fill-black" />
                    Pause Timer
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-black" />
                    {elapsedSeconds > 0 ? 'Resume Run' : 'Start Live Workout'}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleManualLapSplit}
                className="py-4 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
              >
                <Flag className="w-4 h-4 text-[#CCFF00]" />
                Lap Split
              </button>

              <button
                type="button"
                onClick={handleResetLive}
                className="py-4 px-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
                title="Reset Timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Complete & Log button */}
            <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-400">Effort (RPE):</span>
                <select
                  value={liveRpe}
                  onChange={(e) => setLiveRpe(Number(e.target.value))}
                  className="px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs font-mono-tabular text-[#CCFF00] font-bold"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      RPE {n}/10
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleFinishAndSaveLive}
                className="py-3 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                Finish & Log Workout to Plan
              </button>
            </div>
          </div>

          {/* Right Panel: Live Splits & Structured Cues */}
          <div className="lg:col-span-5 space-y-5">
            {/* Active Workout Intervals Guide */}
            {currentWorkout && currentWorkout.segments.length > 0 && (
              <div className="p-5 rounded-3xl bg-[#13161F] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#CCFF00]">
                    Structured Workout Cues
                  </span>
                  <span className="text-xs font-mono-tabular text-zinc-400">
                    {currentWorkout.type}
                  </span>
                </div>
                <div className="space-y-2">
                  {currentWorkout.segments.map((seg, idx) => (
                    <div
                      key={seg.id}
                      className="p-3 rounded-xl bg-[#191D29] border border-white/5 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-md bg-white/10 text-[11px] font-mono-tabular font-bold flex items-center justify-center text-white">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white">{seg.title}</div>
                          <div className="text-[10px] text-zinc-400">{seg.type}</div>
                        </div>
                      </div>
                      {seg.targetPaceMinPerKm && (
                        <span className="text-xs font-mono-tabular font-bold text-[#CCFF00]">
                          {seg.targetPaceMinPerKm}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Kilometer Splits Table */}
            <div className="p-5 rounded-3xl bg-[#13161F] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                  Recorded Kilometer Splits
                </h3>
                <span className="text-xs font-mono-tabular text-zinc-500">
                  {splits.length} Laps
                </span>
              </div>

              {splits.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500 space-y-1">
                  <Timer className="w-6 h-6 mx-auto text-zinc-600 mb-1" />
                  <p>Start the simulator or tap "Lap Split" to record kilometer splits.</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {splits.map((s) => (
                    <div
                      key={s.km}
                      className="px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs font-mono-tabular"
                    >
                      <span className="font-bold text-zinc-300">KM {s.km}</span>
                      <span className="text-zinc-400">
                        {formatDuration(s.timeSeconds)}
                      </span>
                      <span className="font-bold text-[#CCFF00]">{s.paceStr}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : mode === 'garmin' ? (
        <div className="space-y-5">
          {/* Garmin Active Workout TCX Exporter */}
          {currentWorkout && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-[#131C2E] to-[#13161F] border border-[#38BDF8]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#007CC3]/25 border border-[#38BDF8]/40 flex items-center justify-center text-[#38BDF8] shrink-0">
                  <Watch className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#38BDF8]">
                    Garmin {garmin.watchModel} • Structured Workout
                  </span>
                  <h3 className="text-base font-black text-white mt-0.5">
                    {currentWorkout.title} ({currentWorkout.plannedDistanceKm}km)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Export structured .TCX interval steps or import a completed GPS activity from Garmin Connect™ below.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  downloadGarminWorkoutFile(currentWorkout, garmin.watchModel)
                }
                className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-[#38BDF8] hover:bg-[#0EA5E9] text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
                Download Garmin .TCX
              </button>
            </div>
          )}

          {/* Recorded Garmin Watch Runs Ready to Match */}
          <div className="p-6 rounded-3xl bg-[#13161F] border border-white/10 space-y-4">
            <div>
              <h3 className="text-base font-black text-white">
                Recorded Garmin Connect™ GPS Activities
              </h3>
              <p className="text-xs text-zinc-400">
                Match any recent outdoor run recorded on your Garmin {garmin.watchModel} to the selected training plan workout above.
              </p>
            </div>

            <div className="space-y-3">
              {garmin.recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-4 rounded-2xl bg-[#181C28] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#007CC3]/25 text-[#38BDF8] border border-[#38BDF8]/30">
                        {garmin.watchModel}
                      </span>
                      <span className="text-xs font-mono-tabular text-zinc-400">
                        {act.recordedAt}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white">
                      {act.activityName}
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-mono-tabular text-zinc-300">
                      <span className="text-[#CCFF00] font-bold">
                        {act.distanceKm} km @ {act.avgPaceStr}
                      </span>
                      <span>•</span>
                      <span>{formatDuration(act.durationSeconds)}</span>
                      <span>•</span>
                      <span className="text-[#FF4D4D]">
                        ♥ {act.avgHeartRate} bpm (max {act.maxHeartRate})
                      </span>
                      <span>•</span>
                      <span className="text-sky-400">
                        {act.avgCadenceSpm} spm • Aerobic TE {act.trainingEffectAerobic}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onImportGarminActivity(act, selectedWorkoutId);
                      setSavedBanner(
                        `Imported Garmin ${garmin.watchModel} activity (${act.distanceKm}km @ ${act.avgPaceStr}) into plan!`
                      );
                      setTimeout(() => setSavedBanner(null), 5000);
                    }}
                    className="self-start sm:self-center px-4 py-2.5 rounded-xl bg-[#CCFF00] hover:bg-[#b8e600] text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    {act.imported ? 'Re-Sync to Selected Run' : 'Match & Import Run'}
                    <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Manual Run Logger Card */
        <form
          onSubmit={handleManualSubmit}
          className="max-w-2xl p-6 rounded-3xl bg-[#13161F] border border-white/10 space-y-6"
        >
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h3 className="text-lg font-black text-white">Manual Workout Entry</h3>
              <p className="text-xs text-zinc-400">
                Log your outdoor GPS watch or treadmill session directly into your adaptive plan.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-zinc-400">
                Calculated Pace
              </span>
              <div className="text-xl font-black font-mono-tabular text-[#CCFF00]">
                {formatSecondsToPace(manualPaceSec)}/km
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1.5">
                Distance (km)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                required
                value={manualDist}
                onChange={(e) => setManualDist(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-xl bg-[#191D28] border border-white/10 text-white font-mono-tabular text-base focus:outline-none focus:border-[#CCFF00]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1.5">
                Duration (Minutes)
              </label>
              <input
                type="number"
                min="1"
                required
                value={manualMin}
                onChange={(e) => setManualMin(parseInt(e.target.value, 10) || 0)}
                className="w-full px-4 py-3 rounded-xl bg-[#191D28] border border-white/10 text-white font-mono-tabular text-base focus:outline-none focus:border-[#CCFF00]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1.5">
                Seconds
              </label>
              <input
                type="number"
                min="0"
                max="59"
                required
                value={manualSec}
                onChange={(e) => setManualSec(parseInt(e.target.value, 10) || 0)}
                className="w-full px-4 py-3 rounded-xl bg-[#191D28] border border-white/10 text-white font-mono-tabular text-base focus:outline-none focus:border-[#CCFF00]"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="font-bold uppercase text-zinc-400">
                Perceived Effort (RPE 1–10)
              </span>
              <span className="font-mono-tabular font-bold text-[#CCFF00]">
                {manualRpe} / 10
              </span>
            </div>
            <div className="grid grid-cols-10 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setManualRpe(n)}
                  className={`py-2.5 rounded-xl font-mono-tabular text-xs font-bold transition cursor-pointer ${
                    manualRpe === n
                      ? n >= 8
                        ? 'bg-[#FF4D4D] text-white'
                        : 'bg-[#CCFF00] text-black'
                      : 'bg-[#191D28] text-zinc-400 hover:text-white'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-zinc-400 mb-1.5">
              Workout Notes & Splits Summary
            </label>
            <textarea
              rows={3}
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              placeholder="How did your legs feel? Any notes on terrain, heart rate, or nutrition?"
              className="w-full px-4 py-3 rounded-xl bg-[#191D28] border border-white/10 text-white text-sm focus:outline-none focus:border-[#CCFF00]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-2xl bg-[#CCFF00] hover:bg-[#b8e600] text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#CCFF00]/20 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            Log Completed Workout
          </button>
        </form>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  X,
  Watch,
  RefreshCw,
  CheckCircle2,
  Send,
  Download,
  Heart,
  Activity,
  BatteryCharging,
  Wifi,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import type {
  GarminActivityFeedItem,
  GarminIntegrationState,
  GarminWatchModel,
  TrainingWeek,
} from '../types';
import { formatDuration } from '../utils/planGenerator';
import { downloadGarminWorkoutFile } from '../utils/garminUtils';

interface GarminConnectModalProps {
  garmin: GarminIntegrationState;
  currentWeek: TrainingWeek;
  onClose: () => void;
  onUpdateGarmin: (updater: (prev: GarminIntegrationState) => GarminIntegrationState) => void;
  onPushWeekToGarmin: (weekNumber: number) => void;
  onImportGarminActivity: (activity: GarminActivityFeedItem) => void;
}

const WATCH_MODELS: GarminWatchModel[] = [
  'Forerunner 965',
  'Forerunner 265',
  'Fenix 8 AMOLED',
  'Enduro 3',
  'Forerunner 165 Music',
];

export const GarminConnectModal: React.FC<GarminConnectModalProps> = ({
  garmin,
  currentWeek,
  onClose,
  onUpdateGarmin,
  onPushWeekToGarmin,
  onImportGarminActivity,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const activeWeekWorkouts = currentWeek.workouts.filter((w) => w.type !== 'Rest');
  const pushedInCurrentWeek = activeWeekWorkouts.filter((w) =>
    garmin.pushedWorkoutIds.includes(w.id)
  ).length;

  const handleManualSync = () => {
    setIsSyncing(true);
    setSyncNotice(null);
    setTimeout(() => {
      setIsSyncing(false);
      onPushWeekToGarmin(currentWeek.weekNumber);
      setSyncNotice(
        `Synced ${activeWeekWorkouts.length} structured workouts & pace targets to Garmin ${garmin.watchModel}.`
      );
    }, 650);
  };

  const handleToggleConnection = () => {
    onUpdateGarmin((prev) => ({
      ...prev,
      connected: !prev.connected,
      lastSyncedAt: new Date().toISOString(),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-t-3xl sm:rounded-3xl bg-[#11141D] border border-white/10 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Top Modal Header */}
        <div className="px-6 pt-5 pb-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-gradient-to-r from-[#0F172A] via-[#11141D] to-[#11141D]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#007CC3]/20 border border-[#007CC3]/50 flex items-center justify-center text-[#38BDF8]">
              <Watch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-widest text-[#38BDF8]">
                  Garmin Connect™ Integration
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    garmin.connected
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      garmin.connected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                    }`}
                  />
                  {garmin.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <h2 className="text-lg font-black text-white">
                Two-Way Structured Workout & Biometric Sync
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Status Banner */}
          {syncNotice && (
            <div className="p-3.5 rounded-2xl bg-[#38BDF8]/15 border border-[#38BDF8]/40 text-[#38BDF8] text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{syncNotice}</span>
            </div>
          )}

          {/* Device Cockpit Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-[#161D2F] via-[#141824] to-[#10131C] border border-[#38BDF8]/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-black/50 border border-[#38BDF8]/40 flex flex-col items-center justify-center text-[#38BDF8] shrink-0">
                  <Watch className="w-6 h-6" />
                  <span className="text-[9px] font-mono-tabular font-bold text-[#CCFF00] mt-0.5">
                    GPS+
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <select
                      value={garmin.watchModel}
                      onChange={(e) =>
                        onUpdateGarmin((prev) => ({
                          ...prev,
                          watchModel: e.target.value as GarminWatchModel,
                        }))
                      }
                      className="bg-[#1B2234] text-white font-black text-base px-3 py-1 rounded-xl border border-white/10 focus:outline-none focus:border-[#38BDF8]"
                    >
                      {WATCH_MODELS.map((m) => (
                        <option key={m} value={m}>
                          Garmin {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-1.5">
                    <span className="flex items-center gap-1 text-emerald-400 font-mono-tabular">
                      <BatteryCharging className="w-3.5 h-3.5" />
                      {garmin.batteryPct}%
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono-tabular">
                      <Wifi className="w-3.5 h-3.5 text-[#38BDF8]" />
                      {garmin.firmwareVersion}
                    </span>
                    <span>•</span>
                    <span className="text-zinc-500 font-mono-tabular">
                      {garmin.athleteAccount}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!garmin.connected || isSyncing}
                  onClick={handleManualSync}
                  className="px-4 py-2.5 rounded-xl bg-[#38BDF8] hover:bg-[#0EA5E9] disabled:opacity-40 text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                  />
                  {isSyncing ? 'Syncing...' : 'Sync Watch Now'}
                </button>
                <button
                  type="button"
                  onClick={handleToggleConnection}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    garmin.connected
                      ? 'bg-white/5 border-white/10 text-zinc-300 hover:text-red-400'
                      : 'bg-[#CCFF00] border-[#CCFF00] text-black font-extrabold'
                  }`}
                >
                  {garmin.connected ? 'Disconnect' : 'Connect Garmin'}
                </button>
              </div>
            </div>

            {/* Biometrics Telemetry Strip from Garmin Watch */}
            {garmin.connected && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-white/10">
                <div className="p-3 rounded-2xl bg-black/35 border border-white/5">
                  <div className="text-[10px] font-bold uppercase text-zinc-400 flex items-center justify-between">
                    <span>Garmin VO2 Max</span>
                    <Zap className="w-3 h-3 text-[#38BDF8]" />
                  </div>
                  <div className="text-xl font-black font-mono-tabular text-white mt-1">
                    {garmin.biometrics.garminVo2Max}{' '}
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">
                      Superior
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-black/35 border border-white/5">
                  <div className="text-[10px] font-bold uppercase text-zinc-400 flex items-center justify-between">
                    <span>Training Readiness</span>
                    <Sparkles className="w-3 h-3 text-[#CCFF00]" />
                  </div>
                  <div className="text-xl font-black font-mono-tabular text-[#CCFF00] mt-1">
                    {garmin.biometrics.trainingReadinessScore}
                    <span className="text-xs text-zinc-400 font-normal">/100</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-black/35 border border-white/5">
                  <div className="text-[10px] font-bold uppercase text-zinc-400 flex items-center justify-between">
                    <span>HRV & Resting HR</span>
                    <Heart className="w-3 h-3 text-[#FF4D4D]" />
                  </div>
                  <div className="text-sm font-black font-mono-tabular text-white mt-1.5">
                    {garmin.biometrics.hrvStatusMs} ms • {garmin.biometrics.restingHrBpm} bpm
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-black/35 border border-white/5">
                  <div className="text-[10px] font-bold uppercase text-zinc-400 flex items-center justify-between">
                    <span>Training Status</span>
                    <Activity className="w-3 h-3 text-emerald-400" />
                  </div>
                  <div className="text-sm font-black text-emerald-400 mt-1.5">
                    {garmin.biometrics.trainingStatus}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Structured Workout Calendar Push Section */}
          <div className="p-5 rounded-3xl bg-[#161924] border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#CCFF00]" />
                  Week {currentWeek.weekNumber} Structured Workouts → Garmin Calendar
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Pushes lap splits, interval countdowns, and real-time audio/wrist pace alerts directly to your watch.
                </p>
              </div>
              <button
                type="button"
                onClick={handleManualSync}
                className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-[#CCFF00] hover:bg-[#b8e600] text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                Push All ({pushedInCurrentWeek}/{activeWeekWorkouts.length} Synced)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {activeWeekWorkouts.map((wo) => {
                const isPushed = garmin.pushedWorkoutIds.includes(wo.id);
                return (
                  <div
                    key={wo.id}
                    className="p-3.5 rounded-2xl bg-[#11141D] border border-white/5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono-tabular font-bold text-[#38BDF8]">
                          {wo.dayName} ({wo.dateStr})
                        </span>
                        <span className="text-[10px] font-mono-tabular text-zinc-400">
                          • {wo.plannedDistanceKm}km
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white truncate mt-0.5">
                        {wo.title}
                      </div>
                      <div className="text-[10px] font-mono-tabular text-zinc-400 truncate">
                        Target: {wo.targetPaceSummary}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => downloadGarminWorkoutFile(wo, garmin.watchModel)}
                        title="Export Garmin .TCX Structured Workout File"
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {isPushed ? (
                        <span className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-extrabold uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          On Watch
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateGarmin((prev) => ({
                              ...prev,
                              pushedWorkoutIds: [...prev.pushedWorkoutIds, wo.id],
                            }))
                          }
                          className="px-2.5 py-1.5 rounded-xl bg-[#38BDF8]/20 hover:bg-[#38BDF8]/30 text-[#38BDF8] text-[10px] font-extrabold uppercase transition cursor-pointer"
                        >
                          Send
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Recorded Garmin GPS Runs (1-Click Import into Runna Plan) */}
          <div className="p-5 rounded-3xl bg-[#161924] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#38BDF8]" />
                  Recent Garmin Connect™ GPS Activities
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Import completed outdoor watch activities with Heart Rate, Cadence, and Aerobic Training Effect.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {garmin.recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-4 rounded-2xl bg-[#11141D] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
                    <h4 className="text-sm font-bold text-white">{act.activityName}</h4>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-mono-tabular text-zinc-300 pt-0.5">
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
                        {act.avgCadenceSpm} spm
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {act.imported ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold uppercase">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Matched & Logged
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onImportGarminActivity(act)}
                        className="px-4 py-2.5 rounded-xl bg-[#CCFF00] hover:bg-[#b8e600] text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
                      >
                        Import to Plan
                        <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sync Preferences Toggles */}
          <div className="p-5 rounded-3xl bg-[#161924] border border-white/10 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#38BDF8]" />
              Garmin Connect™ Automation Preferences
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  key: 'autoPushWorkouts' as const,
                  title: 'Auto-Sync Weekly Plan',
                  desc: 'Automatically push structured intervals & pace targets to Garmin Calendar',
                },
                {
                  key: 'autoImportActivities' as const,
                  title: 'Auto-Match Completed Runs',
                  desc: 'Match recorded GPS runs from your watch to scheduled Runna workouts',
                },
                {
                  key: 'paceTargetAlerts' as const,
                  title: 'Wrist Pace Zone Alerts',
                  desc: 'Vibrate watch if pace drifts +/- 10s/km outside target segment zone',
                },
                {
                  key: 'hrZoneGuidance' as const,
                  title: 'HR & Cadence Telemetry',
                  desc: 'Import heart rate, spm cadence, and Training Effect metrics',
                },
              ].map((pref) => {
                const enabled = garmin[pref.key];
                return (
                  <button
                    key={pref.key}
                    type="button"
                    onClick={() =>
                      onUpdateGarmin((prev) => ({
                        ...prev,
                        [pref.key]: !prev[pref.key],
                      }))
                    }
                    className={`p-3.5 rounded-2xl border text-left transition flex items-start justify-between gap-3 cursor-pointer ${
                      enabled
                        ? 'bg-[#11141D] border-[#38BDF8]/40'
                        : 'bg-black/20 border-white/5 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{pref.title}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {pref.desc}
                      </div>
                    </div>
                    <div
                      className={`w-9 h-5 rounded-full p-0.5 transition shrink-0 mt-0.5 ${
                        enabled ? 'bg-[#38BDF8]' : 'bg-zinc-700'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-black transition-transform ${
                          enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

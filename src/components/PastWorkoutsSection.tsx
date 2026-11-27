import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Search,
  Trophy,
  Heart,
  Mountain,
  Clock,
  Flame,
  Watch,
  Sparkles,
  CloudSun,
  PlusCircle,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import type { PastWorkoutRecord, WorkoutType } from '../types';
import { formatDuration, formatSecondsToPace } from '../utils/planGenerator';
import { WorkoutRouteMap } from './WorkoutRouteMap';

interface PastWorkoutsSectionProps {
  pastWorkouts: PastWorkoutRecord[];
  onGoToLogger: () => void;
}

export const PastWorkoutsSection: React.FC<PastWorkoutsSectionProps> = ({
  pastWorkouts,
  onGoToLogger,
}) => {
  const [typeFilter, setTypeFilter] = useState<'ALL' | WorkoutType>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRunId, setSelectedRunId] = useState<string>(
    pastWorkouts[0]?.id || ''
  );
  const [selectedKmSplit, setSelectedKmSplit] = useState<number | null>(null);

  const filteredRuns = useMemo(() => {
    return pastWorkouts.filter((run) => {
      const matchesType = typeFilter === 'ALL' || run.type === typeFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        run.title.toLowerCase().includes(q) ||
        run.locationName.toLowerCase().includes(q) ||
        run.notes.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [pastWorkouts, typeFilter, searchQuery]);

  const activeRun =
    filteredRuns.find((r) => r.id === selectedRunId) ||
    filteredRuns[0] ||
    pastWorkouts[0];

  // Aggregate summary metrics across all past workouts
  const totalDistanceKm = pastWorkouts.reduce((s, r) => s + r.distanceKm, 0);
  const totalElevationM = pastWorkouts.reduce(
    (s, r) => s + r.elevationGainM,
    0
  );
  const fastestKmPaceSec = useMemo(() => {
    const allSplits = pastWorkouts.flatMap((r) =>
      r.splits.map((sp) => sp.paceSecPerKm)
    );
    return allSplits.length > 0 ? Math.min(...allSplits) : 265;
  }, [pastWorkouts]);

  const getTypeBadge = (type: WorkoutType) => {
    switch (type) {
      case 'Intervals':
        return 'bg-[#FF4D4D]/15 text-[#FF4D4D] border-[#FF4D4D]/30';
      case 'Tempo':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'Long Run':
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      case 'Easy Run':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  // Build mini route sparkline for list cards
  const renderMiniRouteSparkline = (run: PastWorkoutRecord, isSelected: boolean) => {
    const pts = run.gpsTrack;
    if (pts.length < 2) return null;
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs) - 25;
    const maxX = Math.max(...xs) + 25;
    const minY = Math.min(...ys) - 25;
    const maxY = Math.max(...ys) + 25;
    const d = pts
      .filter((_, idx) => idx % 2 === 0)
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`)
      .join(' ');

    return (
      <svg
        viewBox={`${minX} ${minY} ${Math.max(100, maxX - minX)} ${Math.max(
          80,
          maxY - minY
        )}`}
        className="w-14 h-14 rounded-xl bg-[#0A0D14] border border-white/10 p-1.5 shrink-0"
      >
        <path
          d={d}
          fill="none"
          stroke={isSelected ? '#CCFF00' : '#38BDF8'}
          strokeWidth="22"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  // Fastest & slowest split in active run for bar scaling
  const fastestSplitInActive = activeRun
    ? Math.min(...activeRun.splits.map((s) => s.paceSecPerKm))
    : 250;
  const slowestSplitInActive = activeRun
    ? Math.max(...activeRun.splits.map((s) => s.paceSecPerKm), fastestSplitInActive + 25)
    : 310;

  return (
    <section className="space-y-6 pb-12" id="past-workouts-section">
      {/* Top Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#CCFF00]">
            GPS Activity Logbook & Route Telemetry
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
            Past Workouts & Route Maps
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Inspect GPS traces, pace & heart-rate heatmaps, elevation profiles, and kilometer-by-kilometer splits across all completed sessions.
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToLogger}
          className="self-start md:self-auto px-5 py-3 rounded-xl bg-[#CCFF00] hover:bg-[#b8e600] text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          Log or Sync Another Run
        </button>
      </div>

      {/* Aggregate KPI Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 sm:p-5 rounded-2xl bg-[#12151F] border border-white/10">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-zinc-400">
            <span>Reviewed GPS Runs</span>
            <CheckCircle2 className="w-4 h-4 text-[#CCFF00]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono-tabular text-white mt-1.5">
            {pastWorkouts.length}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">
            Synced with full route telemetry
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#12151F] border border-white/10">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-zinc-400">
            <span>Logged Distance</span>
            <MapPin className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono-tabular text-white mt-1.5">
            {totalDistanceKm.toFixed(1)}{' '}
            <span className="text-sm font-normal text-zinc-400">km</span>
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">
            Outdoor road, park & track loops
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#12151F] border border-white/10">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-zinc-400">
            <span>Total Elevation Gain</span>
            <Mountain className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono-tabular text-white mt-1.5">
            +{totalElevationM}{' '}
            <span className="text-sm font-normal text-zinc-400">m</span>
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">
            Cumulative vertical climb
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#12151F] border border-white/10">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-zinc-400">
            <span>Fastest 1KM Split</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono-tabular text-[#CCFF00] mt-1.5">
            {formatSecondsToPace(fastestKmPaceSec)}
            <span className="text-sm font-normal text-zinc-400">/km</span>
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">
            Peak interval split benchmark
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3 rounded-2xl bg-[#12151F] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            ['ALL', 'Intervals', 'Tempo', 'Long Run', 'Easy Run'] as const
          ).map((f) => {
            const active = typeFilter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setTypeFilter(f);
                  setSelectedKmSplit(null);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
                  active
                    ? 'bg-[#CCFF00] text-black'
                    : 'bg-[#181C28] text-zinc-400 hover:text-white'
                }`}
              >
                {f === 'ALL' ? 'All Runs' : f}
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search route, park, or workout..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#0B0E15] border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#CCFF00]"
          />
        </div>
      </div>

      {/* Master-Detail Split Layout: Activity Feed (Left) + Map & Telemetry (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Past Workouts Activity List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
              Completed Sessions ({filteredRuns.length})
            </span>
            <span className="text-[11px] text-zinc-500">
              Select to inspect route
            </span>
          </div>

          <div className="space-y-2.5 max-h-[860px] overflow-y-auto pr-1">
            {filteredRuns.map((run) => {
              const isSelected = activeRun?.id === run.id;
              return (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => {
                    setSelectedRunId(run.id);
                    setSelectedKmSplit(null);
                  }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#171C28] border-[#CCFF00] shadow-lg'
                      : 'bg-[#12151F] border-white/8 hover:border-white/20 hover:bg-[#151925]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${getTypeBadge(
                            run.type
                          )}`}
                        >
                          {run.type}
                        </span>
                        <span className="text-[11px] font-mono-tabular text-zinc-400">
                          {run.dateLabel}
                        </span>
                      </div>

                      <h3 className="text-sm font-extrabold text-white leading-snug">
                        {run.title}
                      </h3>

                      <div className="text-[11px] text-zinc-400 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-[#CCFF00] shrink-0" />
                        <span className="truncate">{run.locationName}</span>
                      </div>
                    </div>

                    {renderMiniRouteSparkline(run, isSelected)}
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-white/5 grid grid-cols-3 gap-2 font-mono-tabular">
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
                        Avg Pace
                      </span>
                      <span className="text-sm font-black text-[#CCFF00]">
                        {run.avgPaceStr}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-zinc-500 block">
                        Avg HR
                      </span>
                      <span className="text-sm font-bold text-[#FF4D4D]">
                        ♥ {run.avgHeartRate}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive GPS Route Map + Split Table + Debrief */}
        {activeRun && (
          <div className="lg:col-span-8 space-y-6">
            {/* Selected Workout Summary Header Card */}
            <div className="p-6 rounded-3xl bg-[#12151F] border border-white/10 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-lg border ${getTypeBadge(
                        activeRun.type
                      )}`}
                    >
                      {activeRun.type}
                    </span>
                    <span className="text-xs font-mono-tabular text-zinc-400">
                      {activeRun.dateLabel}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-[#0F172A] text-sky-400 border border-sky-400/30">
                      <Watch className="w-3 h-3" />
                      {activeRun.deviceName}
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-2">
                    {activeRun.title}
                  </h2>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-1.5">
                    <span className="flex items-center gap-1">
                      <CloudSun className="w-3.5 h-3.5 text-amber-400" />
                      {activeRun.weatherSummary}
                    </span>
                    <span>•</span>
                    <span>Effort: RPE {activeRun.rpe}/10</span>
                  </div>
                </div>
              </div>

              {/* 6-Metric Telemetry Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5">
                <div className="p-3 rounded-2xl bg-[#0B0E15] border border-white/5">
                  <div className="text-[10px] font-bold uppercase text-zinc-400">
                    Distance
                  </div>
                  <div className="text-lg font-black font-mono-tabular text-white mt-0.5">
                    {activeRun.distanceKm.toFixed(2)} km
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#0B0E15] border border-white/5">
                  <div className="text-[10px] font-bold uppercase text-zinc-400">
                    Moving Time
                  </div>
                  <div className="text-lg font-black font-mono-tabular text-white mt-0.5">
                    {formatDuration(activeRun.durationSeconds)}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#0B0E15] border border-[#CCFF00]/30">
                  <div className="text-[10px] font-bold uppercase text-[#CCFF00]">
                    Avg Pace
                  </div>
                  <div className="text-lg font-black font-mono-tabular text-[#CCFF00] mt-0.5">
                    {activeRun.avgPaceStr}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#0B0E15] border border-white/5">
                  <div className="text-[10px] font-bold uppercase text-zinc-400 flex items-center gap-1">
                    <Heart className="w-3 h-3 text-[#FF4D4D]" />
                    Avg / Max HR
                  </div>
                  <div className="text-base font-black font-mono-tabular text-white mt-0.5">
                    {activeRun.avgHeartRate} / {activeRun.maxHeartRate}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#0B0E15] border border-white/5">
                  <div className="text-[10px] font-bold uppercase text-zinc-400">
                    Cadence
                  </div>
                  <div className="text-lg font-black font-mono-tabular text-sky-400 mt-0.5">
                    {activeRun.avgCadenceSpm} spm
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#0B0E15] border border-white/5">
                  <div className="text-[10px] font-bold uppercase text-zinc-400">
                    Elev / Cal
                  </div>
                  <div className="text-base font-black font-mono-tabular text-emerald-400 mt-0.5">
                    +{activeRun.elevationGainM}m • {activeRun.calories}
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive GPS Route Map & Synchronized Telemetry Scrubber */}
            <WorkoutRouteMap
              workout={activeRun}
              selectedKmSplit={selectedKmSplit}
              onSelectKmSplit={setSelectedKmSplit}
            />

            {/* Kilometer Splits Table & Coach Debrief Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Kilometer Splits Table */}
              <div className="xl:col-span-7 p-6 rounded-3xl bg-[#12151F] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#CCFF00]" />
                      Kilometer Splits Breakdown
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Click any kilometer row to highlight its marker on the GPS map above.
                    </p>
                  </div>
                  {selectedKmSplit && (
                    <button
                      type="button"
                      onClick={() => setSelectedKmSplit(null)}
                      className="text-xs font-bold text-[#CCFF00] hover:underline cursor-pointer"
                    >
                      Clear Pin #{selectedKmSplit}
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {activeRun.splits.map((sp) => {
                    const isFastest = sp.paceSecPerKm === fastestSplitInActive;
                    const isSelected = selectedKmSplit === sp.km;
                    // Faster pace -> wider bar (70%..100%)
                    const barWidthPct = Math.round(
                      100 -
                        ((sp.paceSecPerKm - fastestSplitInActive) /
                          Math.max(15, slowestSplitInActive - fastestSplitInActive)) *
                          34
                    );

                    return (
                      <button
                        key={sp.km}
                        type="button"
                        onClick={() =>
                          setSelectedKmSplit(isSelected ? null : sp.km)
                        }
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition flex items-center gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-[#CCFF00]/15 border-[#CCFF00]'
                            : 'bg-[#0C0F17] border-white/5 hover:border-white/15'
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg font-mono-tabular text-xs font-black flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-[#CCFF00] text-black'
                              : 'bg-[#171C28] text-zinc-300'
                          }`}
                        >
                          {sp.km}
                        </span>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono-tabular">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-white">
                                {sp.paceStr}
                              </span>
                              {isFastest && (
                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#CCFF00] text-black">
                                  Fastest
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-[11px]">
                              <span className="text-[#FF4D4D]">
                                ♥ {sp.avgHrBpm}
                              </span>
                              <span
                                className={
                                  sp.elevationDeltaM > 0
                                    ? 'text-amber-400 w-10 text-right'
                                    : 'text-emerald-400 w-10 text-right'
                                }
                              >
                                {sp.elevationDeltaM > 0
                                  ? `+${sp.elevationDeltaM}m`
                                  : `${sp.elevationDeltaM}m`}
                              </span>
                            </div>
                          </div>

                          <div className="w-full h-1.5 rounded-full bg-zinc-800/80 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isFastest ? 'bg-[#CCFF00]' : 'bg-sky-400'
                              }`}
                              style={{ width: `${barWidthPct}%` }}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Post-Run Notes, Aerobic Training Effect & Coach Analysis */}
              <div className="xl:col-span-5 space-y-4">
                <div className="p-5 rounded-3xl bg-[#12151F] border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#CCFF00]">
                    <Sparkles className="w-4 h-4" />
                    Runna Coach Telemetry Debrief
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {activeRun.coachAnalysis}
                  </p>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      Garmin Aerobic Training Effect
                    </span>
                    <span className="font-mono-tabular font-black text-emerald-400">
                      {activeRun.trainingEffectAerobic.toFixed(1)} / 5.0
                    </span>
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-[#12151F] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-[#FF4D4D]" />
                      Athlete Logbook Notes
                    </span>
                    <span className="font-mono-tabular font-bold text-white">
                      RPE {activeRun.rpe}/10
                    </span>
                  </div>
                  <blockquote className="text-xs text-zinc-300 italic bg-[#0B0E15] p-3.5 rounded-2xl border border-white/5 leading-relaxed">
                    "{activeRun.notes}"
                  </blockquote>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

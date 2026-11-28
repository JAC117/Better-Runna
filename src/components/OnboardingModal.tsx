import React, { useState, useMemo } from 'react';
import {
  Flame,
  Trophy,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Zap,
  Sparkles,
  Activity,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import type { GoalIntent, RaceGoal, RampRate, UserProfile } from '../types';
import {
  addDaysIso,
  calculatePaceZones,
  formatIsoFull,
  formatIsoShort,
  formatSecondsToPace,
  getLocalTodayIso,
  getMondayWeekdayIndex,
  previewPlanProgression,
  RAMP_CONFIGS,
} from '../utils/planGenerator';

interface OnboardingModalProps {
  initialProfile: UserProfile;
  onComplete: (newProfile: UserProfile) => void;
  onCancel?: () => void;
}

const GOAL_OPTIONS: {
  id: RaceGoal;
  title: string;
  subtitle: string;
  badge: string;
  defaultIntent: GoalIntent;
}[] = [
  {
    id: '5K',
    title: 'Improve 5K Speed',
    subtitle: 'Fitness-scaled aerobic base, controlled intervals & 5K pacing',
    badge: '5.0 KM',
    defaultIntent: 'improve',
  },
  {
    id: '10K',
    title: 'Run or PR a 10K',
    subtitle: 'Progressive weekly build of threshold stamina & endurance',
    badge: '10.0 KM',
    defaultIntent: 'improve',
  },
  {
    id: 'Half Marathon',
    title: 'Conquer a Half Marathon',
    subtitle: 'Gradual aerobic volume ramping & race-pace endurance blocks',
    badge: '21.1 KM',
    defaultIntent: 'complete',
  },
  {
    id: 'Marathon',
    title: 'Master the Full Marathon',
    subtitle: 'Structured long-run progressions, deload weeks & race taper',
    badge: '42.2 KM',
    defaultIntent: 'complete',
  },
  {
    id: 'General Fitness',
    title: 'General Conditioning & Base',
    subtitle: 'Sustainable weekly progression matched to your fitness level',
    badge: 'ALL LEVELS',
    defaultIntent: 'improve',
  },
];

const ABILITY_PRESETS = [
  { label: 'Beginner', sub: '5K in ~32:00', mins: 32.0 },
  { label: 'Intermediate', sub: '5K in ~26:30', mins: 26.5 },
  { label: 'Competitive', sub: '5K in ~22:30', mins: 22.5 },
  { label: 'Advanced', sub: '5K in ~19:00', mins: 19.0 },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  initialProfile,
  onComplete,
  onCancel,
}) => {
  const todayIso = getLocalTodayIso();
  const nextMondayDelta = ((7 - getMondayWeekdayIndex(todayIso)) % 7) || 7;
  const nextMondayIso = addDaysIso(todayIso, nextMondayDelta);

  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState(initialProfile.name || 'Alex Rivera');
  const [goal, setGoal] = useState<RaceGoal>(initialProfile.goal);
  const [intent, setIntent] = useState<GoalIntent>(initialProfile.intent);
  const [current5kMinutes, setCurrent5kMinutes] = useState<number>(
    initialProfile.current5kMinutes
  );
  const [daysPerWeek, setDaysPerWeek] = useState<3 | 4 | 5 | 6>(
    initialProfile.daysPerWeek
  );
  const [rampRate, setRampRate] = useState<RampRate>(
    initialProfile.rampRate || 'standard'
  );
  const [useCustomStart, setUseCustomStart] = useState<boolean>(
    Boolean(initialProfile.customStartDate)
  );
  const [customStartDate, setCustomStartDate] = useState<string>(
    initialProfile.customStartDate || nextMondayIso
  );
  const [planWeeks, setPlanWeeks] = useState<number>(
    initialProfile.planWeeks || 8
  );

  const effectiveStartDate = useCustomStart ? customStartDate : todayIso;
  const [targetRaceDate, setTargetRaceDate] = useState<string>(
    initialProfile.targetRaceDate ||
      addDaysIso(effectiveStartDate, (initialProfile.planWeeks || 8) * 7 - 1)
  );

  const handleChangeStartMode = (customMode: boolean, overrideIso?: string) => {
    setUseCustomStart(customMode);
    const nextStart = customMode
      ? overrideIso || customStartDate
      : todayIso;
    if (overrideIso) setCustomStartDate(overrideIso);
    setTargetRaceDate(addDaysIso(nextStart, planWeeks * 7 - 1));
  };

  const handleChangePlanWeeks = (weeksVal: number) => {
    setPlanWeeks(weeksVal);
    setTargetRaceDate(addDaysIso(effectiveStartDate, weeksVal * 7 - 1));
  };

  const liveZones = calculatePaceZones(current5kMinutes);
  const fiveKMinFloor = Math.floor(current5kMinutes);
  const fiveKSecRem = Math.round((current5kMinutes - fiveKMinFloor) * 60);
  const formatted5kTime = `${fiveKMinFloor}:${fiveKSecRem.toString().padStart(2, '0')}`;
  const current5kPace = formatSecondsToPace((current5kMinutes * 60) / 5);

  const progressionPreview = useMemo(
    () =>
      previewPlanProgression({
        name,
        goal,
        intent,
        goalLabel: goal,
        current5kMinutes,
        daysPerWeek,
        rampRate,
        startDate: effectiveStartDate,
        customStartDate: useCustomStart ? customStartDate : undefined,
        targetRaceDate,
        planWeeks,
        currentWeek: 1,
        createdAt: '',
        unit: 'km',
      }),
    [
      name,
      goal,
      intent,
      current5kMinutes,
      daysPerWeek,
      rampRate,
      effectiveStartDate,
      useCustomStart,
      customStartDate,
      targetRaceDate,
      planWeeks,
    ]
  );

  const handleFinish = () => {
    const goalLabel =
      goal === 'General Fitness'
        ? 'Build Aerobic Fitness'
        : intent === 'improve'
        ? `Improve ${goal} Time`
        : `Run a ${goal}`;

    onComplete({
      name: name.trim() || 'Runner',
      goal,
      intent,
      goalLabel,
      current5kMinutes,
      daysPerWeek,
      rampRate,
      startDate: effectiveStartDate,
      customStartDate: useCustomStart ? customStartDate : undefined,
      targetRaceDate,
      planWeeks,
      currentWeek: 1,
      createdAt: new Date().toISOString(),
      unit: 'km',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-3xl bg-[#11131A] border border-white/10 shadow-2xl overflow-hidden my-auto">
        {/* Top Progress Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#CCFF00] flex items-center justify-center text-black font-black text-sm">
              R
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#CCFF00]">
                Runna Coach Engine
              </span>
              <p className="text-xs text-zinc-400">Step {step} of 4 • Adaptive Plan Calibration</p>
            </div>
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              className="text-xs font-medium text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition"
            >
              Close
            </button>
          )}
        </div>

        {/* Step progress bar */}
        <div className="w-full h-1 bg-zinc-800">
          <div
            className="h-full bg-[#CCFF00] transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Step Body */}
        <div className="p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  What are we training for?
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Select your primary distance and whether you want to finish strong or set a personal record.
                </p>
              </div>

              {/* Intent Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-zinc-900/90 border border-white/5">
                <button
                  type="button"
                  onClick={() => setIntent('improve')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
                    intent === 'improve'
                      ? 'bg-[#CCFF00] text-black shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Chase a New PR
                </button>
                <button
                  type="button"
                  onClick={() => setIntent('complete')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
                    intent === 'complete'
                      ? 'bg-[#CCFF00] text-black shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  Complete Distance
                </button>
              </div>

              <div className="space-y-2.5">
                {GOAL_OPTIONS.map((item) => {
                  const selected = goal === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setGoal(item.id)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
                        selected
                          ? 'bg-[#CCFF00]/10 border-[#CCFF00] shadow-lg shadow-[#CCFF00]/5'
                          : 'bg-[#171A23] border-white/5 hover:border-white/15'
                      }`}
                    >
                      <div className="pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-base">
                            {item.id === 'General Fitness'
                              ? item.title
                              : intent === 'improve'
                              ? `Improve ${item.id} Time`
                              : `Run a ${item.id}`}
                          </span>
                          <span
                            className={`text-[10px] font-mono-tabular font-bold px-2 py-0.5 rounded-full ${
                              selected
                                ? 'bg-[#CCFF00] text-black'
                                : 'bg-white/5 text-zinc-400'
                            }`}
                          >
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">{item.subtitle}</p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                          selected
                            ? 'border-[#CCFF00] bg-[#CCFF00] text-black'
                            : 'border-zinc-600'
                        }`}
                      >
                        {selected && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  Calibrate your current ability
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Enter a recent 5K effort (or estimated 5K time). Runna calculates every interval, tempo, and easy pace automatically.
                </p>
              </div>

              {/* Quick Ability Presets */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ABILITY_PRESETS.map((preset) => {
                  const active = Math.abs(current5kMinutes - preset.mins) < 0.8;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setCurrent5kMinutes(preset.mins)}
                      className={`p-3 rounded-xl border text-left transition ${
                        active
                          ? 'bg-[#CCFF00]/15 border-[#CCFF00] text-white'
                          : 'bg-[#171A23] border-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold text-white">{preset.label}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5 font-mono-tabular">
                        {preset.sub}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Precision Slider Card */}
              <div className="p-5 rounded-2xl bg-[#171A23] border border-white/10 space-y-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-bold text-zinc-400">
                      Current 5K Benchmark
                    </span>
                    <div className="text-3xl font-black font-mono-tabular text-[#CCFF00] mt-0.5">
                      {formatted5kTime}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs uppercase tracking-wider font-bold text-zinc-400">
                      Avg 5K Pace
                    </span>
                    <div className="text-lg font-bold font-mono-tabular text-white mt-0.5">
                      {current5kPace}/km
                    </div>
                  </div>
                </div>

                <input
                  type="range"
                  min={15.0}
                  max={40.0}
                  step={0.25}
                  value={current5kMinutes}
                  onChange={(e) => setCurrent5kMinutes(parseFloat(e.target.value))}
                  className="w-full accent-[#CCFF00] cursor-pointer h-2 bg-zinc-800 rounded-lg"
                />
                <div className="flex justify-between text-[11px] font-mono-tabular text-zinc-500">
                  <span>15:00 (Elite)</span>
                  <span>25:00 (Club)</span>
                  <span>40:00 (Starter)</span>
                </div>
              </div>

              {/* Live Calculated Pace & Fitness Volume Calibration Preview */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300">
                    <Activity className="w-3.5 h-3.5 text-[#CCFF00]" />
                    Coach Calibration: Paces & Safe Starting Volume
                  </div>
                  <span className="text-[11px] font-mono-tabular font-extrabold px-2.5 py-0.5 rounded-full bg-[#CCFF00]/15 border border-[#CCFF00]/40 text-[#CCFF00]">
                    {progressionPreview.fitnessTier} Tier
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-0.5">
                  <div className="p-2.5 rounded-xl bg-[#171A23]">
                    <div className="text-[10px] font-bold uppercase text-emerald-400">
                      Easy / Long
                    </div>
                    <div className="text-xs font-mono-tabular font-bold text-white mt-0.5">
                      {liveZones.easy.label}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#171A23]">
                    <div className="text-[10px] font-bold uppercase text-amber-400">
                      Tempo
                    </div>
                    <div className="text-xs font-mono-tabular font-bold text-white mt-0.5">
                      {liveZones.tempo.label}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#171A23]">
                    <div className="text-[10px] font-bold uppercase text-[#FF4D4D]">
                      Intervals
                    </div>
                    <div className="text-xs font-mono-tabular font-bold text-white mt-0.5">
                      {liveZones.interval.label}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                  <span>
                    Week 1 Long Run:{' '}
                    <strong className="text-white font-mono-tabular">
                      {progressionPreview.week1LongRunKm.toFixed(1)} km
                    </strong>
                  </span>
                  <span>
                    Safe Peak Long Run ({goal}):{' '}
                    <strong className="text-[#CCFF00] font-mono-tabular">
                      {progressionPreview.peakLongRunKm.toFixed(1)} km
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  Schedule & distance ramping
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Choose your weekly run days and how conservatively or ambitiously your mileage builds each week.
                </p>
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Runs Per Week
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {([3, 4, 5, 6] as const).map((days) => {
                    const active = daysPerWeek === days;
                    const shortDesc: Record<number, string> = {
                      3: 'High recovery',
                      4: 'Balanced (Ideal)',
                      5: 'Aerobic build',
                      6: 'High frequency',
                    };
                    return (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setDaysPerWeek(days)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-[#CCFF00]/12 border-[#CCFF00] shadow-lg'
                            : 'bg-[#171A23] border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className="text-xl font-black font-mono-tabular text-white">
                          {days} Days
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1">
                          {shortDesc[days]}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Distance Ramping Level Selector (Low / Standard / High) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[#CCFF00]" />
                    Distance Ramping Rate
                  </span>
                  <span className="text-[11px] font-mono-tabular text-zinc-400">
                    Every 4th week includes a recovery stepback
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(['low', 'standard', 'high'] as const).map((rateKey) => {
                    const cfg = RAMP_CONFIGS[rateKey];
                    const selected = rampRate === rateKey;
                    const badgeLabel =
                      rateKey === 'low'
                        ? '~6% / wk'
                        : rateKey === 'standard'
                        ? '10% Rule'
                        : '~13% / wk';
                    const titleLabel =
                      rateKey === 'low'
                        ? 'Low'
                        : rateKey === 'standard'
                        ? 'Standard'
                        : 'High';

                    return (
                      <button
                        key={rateKey}
                        type="button"
                        onClick={() => setRampRate(rateKey)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          selected
                            ? 'bg-[#CCFF00]/12 border-[#CCFF00] shadow-lg'
                            : 'bg-[#171A23] border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-sm font-black text-white uppercase tracking-wide">
                              {titleLabel}
                            </span>
                            <span
                              className={`text-[10px] font-mono-tabular font-bold px-2 py-0.5 rounded-full ${
                                selected
                                  ? 'bg-[#CCFF00] text-black'
                                  : 'bg-white/5 text-zinc-400'
                              }`}
                            >
                              {badgeLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                            {cfg.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Distance Progression Readout */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Week 1 Starting Volume ({progressionPreview.fitnessTier})
                  </span>
                  <span className="text-base font-black font-mono-tabular text-white mt-0.5 block">
                    {progressionPreview.week1TotalKm.toFixed(1)} km/wk
                  </span>
                  <span className="text-[11px] font-mono-tabular text-zinc-400">
                    Long Run: {progressionPreview.week1LongRunKm.toFixed(1)} km
                  </span>
                </div>
                <div className="border-l border-white/10 pl-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#CCFF00] block">
                    Peak Week Target ({goal})
                  </span>
                  <span className="text-base font-black font-mono-tabular text-[#CCFF00] mt-0.5 block">
                    {progressionPreview.peakWeekTotalKm.toFixed(1)} km/wk
                  </span>
                  <span className="text-[11px] font-mono-tabular text-zinc-300">
                    Peak Long Run: {progressionPreview.peakLongRunKm.toFixed(1)} km
                  </span>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  Finalize your timeline & start date
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Plans automatically sync to today's date, or you can set an optional custom start date.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Athlete Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full px-4 py-3 rounded-xl bg-[#171A23] border border-white/10 text-white text-sm focus:outline-none focus:border-[#CCFF00]"
                  />
                </div>

                {/* Plan Start Date Selector: Sync to Today vs Optional Custom Start Date */}
                <div className="p-4 rounded-2xl bg-[#171A23] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#CCFF00]" />
                      Plan Start Date
                    </span>
                    <span className="text-[11px] font-mono-tabular text-[#CCFF00] font-bold">
                      Day 1: {formatIsoFull(effectiveStartDate)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-black/40 border border-white/5">
                    <button
                      type="button"
                      onClick={() => handleChangeStartMode(false)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                        !useCustomStart
                          ? 'bg-[#CCFF00] text-black shadow'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Start Today ({formatIsoShort(todayIso)})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeStartMode(true)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                        useCustomStart
                          ? 'bg-[#CCFF00] text-black shadow'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Optional Custom Date
                    </button>
                  </div>

                  {useCustomStart && (
                    <div className="pt-1 space-y-2">
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleChangeStartMode(true, e.target.value);
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm font-mono-tabular focus:outline-none focus:border-[#CCFF00]"
                      />
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="text-zinc-500 mr-1">Quick pick:</span>
                        {[
                          { label: 'Tomorrow', iso: addDaysIso(todayIso, 1) },
                          { label: 'Next Monday', iso: nextMondayIso },
                          { label: 'In 2 Weeks', iso: addDaysIso(todayIso, 14) },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => handleChangeStartMode(true, preset.iso)}
                            className={`px-2.5 py-1 rounded-lg font-mono-tabular font-semibold border transition cursor-pointer ${
                              customStartDate === preset.iso
                                ? 'bg-[#CCFF00]/15 border-[#CCFF00] text-[#CCFF00]'
                                : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white'
                            }`}
                          >
                            {preset.label} ({formatIsoShort(preset.iso)})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Plan Duration
                    </label>
                    <select
                      value={planWeeks}
                      onChange={(e) => handleChangePlanWeeks(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl bg-[#171A23] border border-white/10 text-white text-sm focus:outline-none focus:border-[#CCFF00]"
                    >
                      <option value={6}>6 Weeks (Sharpening Block)</option>
                      <option value={8}>8 Weeks (Standard Cycle)</option>
                      <option value={12}>12 Weeks (Full Build)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Target Race Date
                    </label>
                    <input
                      type="date"
                      value={targetRaceDate}
                      onChange={(e) => setTargetRaceDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#171A23] border border-white/10 text-white text-sm font-mono-tabular focus:outline-none focus:border-[#CCFF00]"
                    />
                  </div>
                </div>

                {/* Plan Blueprint Summary Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1A1E29] to-[#12151E] border border-[#CCFF00]/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#CCFF00] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Your Adaptive Plan Blueprint
                    </span>
                    <span className="text-xs font-mono-tabular text-zinc-400">
                      Starts {formatIsoShort(effectiveStartDate)} • {planWeeks} Wks
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-black/30">
                      <div className="text-[10px] text-zinc-400 uppercase">Goal</div>
                      <div className="text-xs sm:text-sm font-bold text-white mt-0.5 truncate">
                        {goal}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/30">
                      <div className="text-[10px] text-zinc-400 uppercase">
                        {progressionPreview.fitnessTier}
                      </div>
                      <div className="text-xs sm:text-sm font-bold font-mono-tabular text-[#CCFF00] mt-0.5">
                        {formatted5kTime}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/30">
                      <div className="text-[10px] text-zinc-400 uppercase">Ramping</div>
                      <div className="text-xs sm:text-sm font-bold text-white mt-0.5 capitalize">
                        {rampRate}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/30">
                      <div className="text-[10px] text-zinc-400 uppercase">Long Run</div>
                      <div className="text-xs sm:text-sm font-bold font-mono-tabular text-white mt-0.5">
                        {progressionPreview.week1LongRunKm.toFixed(1)}→{progressionPreview.peakLongRunKm.toFixed(1)}k
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Footer */}
          <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1.5 text-sm font-semibold text-zinc-300 hover:text-white px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-2 text-sm font-extrabold text-black bg-[#CCFF00] hover:bg-[#b8e600] px-6 py-3 rounded-xl shadow-lg shadow-[#CCFF00]/15 transition cursor-pointer"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="flex items-center gap-2 text-sm font-extrabold text-black bg-[#CCFF00] hover:bg-[#b8e600] px-6 py-3 rounded-xl shadow-lg shadow-[#CCFF00]/20 transition cursor-pointer"
              >
                Build My Training Plan
                <Flame className="w-4 h-4 fill-black" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

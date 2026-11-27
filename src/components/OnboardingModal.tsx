import React, { useState } from 'react';
import {
  Flame,
  Trophy,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Zap,
  Sparkles,
  Activity,
} from 'lucide-react';
import type { GoalIntent, RaceGoal, UserProfile } from '../types';
import { calculatePaceZones, formatSecondsToPace } from '../utils/planGenerator';

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
    subtitle: 'High-velocity VO2 max intervals & threshold power',
    badge: '5.0 KM',
    defaultIntent: 'improve',
  },
  {
    id: '10K',
    title: 'Run or PR a 10K',
    subtitle: 'Ideal balance of lactate threshold stamina & speed endurance',
    badge: '10.0 KM',
    defaultIntent: 'improve',
  },
  {
    id: 'Half Marathon',
    title: 'Conquer a Half Marathon',
    subtitle: 'Progressive aerobic volume & race-pace endurance blocks',
    badge: '21.1 KM',
    defaultIntent: 'complete',
  },
  {
    id: 'Marathon',
    title: 'Master the Full Marathon',
    subtitle: 'Structured long-run progressions & late-race fatigue resistance',
    badge: '42.2 KM',
    defaultIntent: 'complete',
  },
  {
    id: 'General Fitness',
    title: 'General Conditioning & Base',
    subtitle: 'Consistent weekly structure to build lifelong running fitness',
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
  const [targetRaceDate, setTargetRaceDate] = useState<string>(
    initialProfile.targetRaceDate || '2027-01-17'
  );
  const [planWeeks, setPlanWeeks] = useState<number>(initialProfile.planWeeks || 8);

  const liveZones = calculatePaceZones(current5kMinutes);
  const fiveKMinFloor = Math.floor(current5kMinutes);
  const fiveKSecRem = Math.round((current5kMinutes - fiveKMinFloor) * 60);
  const formatted5kTime = `${fiveKMinFloor}:${fiveKSecRem.toString().padStart(2, '0')}`;
  const current5kPace = formatSecondsToPace((current5kMinutes * 60) / 5);

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

              {/* Live Calculated Pace Preview */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300">
                  <Activity className="w-3.5 h-3.5 text-[#CCFF00]" />
                  Calculated Training Pace Zones
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
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
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  Weekly training commitment
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  How many days per week can you commit to running? We structure rest days around your key speed and long sessions.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {([3, 4, 5, 6] as const).map((days) => {
                  const active = daysPerWeek === days;
                  const descriptions: Record<number, string> = {
                    3: '1 Speed • 1 Tempo • 1 Long Run (High recovery)',
                    4: '1 Easy • 1 Intervals • 1 Tempo • 1 Long Run (Most Popular)',
                    5: '2 Easy • 1 Intervals • 1 Tempo • 1 Long Run (Performance)',
                    6: '3 Easy • 1 Intervals • 1 Tempo • 1 Long Run (High Volume)',
                  };
                  return (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setDaysPerWeek(days)}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        active
                          ? 'bg-[#CCFF00]/12 border-[#CCFF00] shadow-lg'
                          : 'bg-[#171A23] border-white/5 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-black font-mono-tabular text-white">
                          {days} Days
                        </span>
                        {days === 4 && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#CCFF00] text-black">
                            Ideal
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                        {descriptions[days]}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  Finalize your race timeline
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Personalize your athlete profile and target race date so we can peak and taper you right on schedule.
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Plan Duration
                    </label>
                    <select
                      value={planWeeks}
                      onChange={(e) => setPlanWeeks(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl bg-[#171A23] border border-white/10 text-white text-sm focus:outline-none focus:border-[#CCFF00]"
                    >
                      <option value={6}>6 Weeks (Sharpening Block)</option>
                      <option value={8}>8 Weeks (Standard Cycle)</option>
                      <option value={12}>12 Weeks (Full Build)</option>
                    </select>
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
                      {planWeeks} Weeks • {daysPerWeek}x/wk
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-black/30">
                      <div className="text-[10px] text-zinc-400 uppercase">Primary Goal</div>
                      <div className="text-sm font-bold text-white mt-0.5">{goal}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/30">
                      <div className="text-[10px] text-zinc-400 uppercase">5K Fitness</div>
                      <div className="text-sm font-bold font-mono-tabular text-[#CCFF00] mt-0.5">
                        {formatted5kTime}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/30">
                      <div className="text-[10px] text-zinc-400 uppercase">Interval Pace</div>
                      <div className="text-sm font-bold font-mono-tabular text-white mt-0.5">
                        {liveZones.interval.label.split('–')[0]}/km
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

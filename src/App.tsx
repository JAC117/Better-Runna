import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  Timer,
  TrendingUp,
  User,
  SlidersHorizontal,
  Watch,
  MapPin,
  LayoutGrid,
  Menu,
  X,
  Database,
} from 'lucide-react';
import type {
  GarminActivityFeedItem,
  GarminIntegrationState,
  LoggedRunData,
  ScheduledWorkout,
  TrainingWeek,
  UserProfile,
} from './types';
import {
  DEFAULT_DEMO_PROFILE,
  formatSecondsToPace,
  generateTrainingPlan,
} from './utils/planGenerator';
import { createInitialGarminState } from './utils/garminUtils';
import { buildPastWorkoutsList } from './utils/gpsRouteGenerator';
import {
  fetchBootstrapState,
  fetchDbHealth,
  saveFullStateToDb,
} from './utils/apiClient';
import { WebsiteHomeView } from './components/WebsiteHomeView';
import { PlanDashboardView } from './components/PlanDashboardView';
import { PastWorkoutsSection } from './components/PastWorkoutsSection';
import { RunTrackerView } from './components/RunTrackerView';
import { ProgressStatsView } from './components/ProgressStatsView';
import { ProfileView } from './components/ProfileView';
import { OnboardingModal } from './components/OnboardingModal';
import { WorkoutDetailModal } from './components/WorkoutDetailModal';
import { GarminConnectModal } from './components/GarminConnectModal';
import { DatabaseStatusModal } from './components/DatabaseStatusModal';

const STORAGE_KEY_PROFILE = 'runna_coach_user_profile_v1';
const STORAGE_KEY_PLAN = 'runna_coach_training_plan_v1';
const STORAGE_KEY_GARMIN = 'runna_coach_garmin_state_v1';

export type WebsitePage =
  | 'overview'
  | 'plan'
  | 'history'
  | 'track'
  | 'progress'
  | 'profile';

export function App() {
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
      return saved ? JSON.parse(saved) : DEFAULT_DEMO_PROFILE;
    } catch {
      return DEFAULT_DEMO_PROFILE;
    }
  });

  const [weeks, setWeeks] = useState<TrainingWeek[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PLAN);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return generateTrainingPlan(DEFAULT_DEMO_PROFILE);
    } catch {
      return generateTrainingPlan(DEFAULT_DEMO_PROFILE);
    }
  });

  const [garmin, setGarmin] = useState<GarminIntegrationState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GARMIN);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.watchModel) return parsed;
      }
      return createInitialGarminState(profile, weeks);
    } catch {
      return createInitialGarminState(profile, weeks);
    }
  });

  const [activePage, setActivePage] = useState<WebsitePage>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(1);
  const [selectedWorkout, setSelectedWorkout] =
    useState<ScheduledWorkout | null>(null);
  const [trackerTargetWorkout, setTrackerTargetWorkout] =
    useState<ScheduledWorkout | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isGarminModalOpen, setIsGarminModalOpen] = useState<boolean>(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState<boolean>(false);

  // PostgreSQL Backend Sync State
  const [dbStatus, setDbStatus] = useState<
    'connecting' | 'synced' | 'saving' | 'offline'
  >('connecting');
  const [dbLatencyMs, setDbLatencyMs] = useState<number | null>(null);
  const hydratedFromBackendRef = useRef<boolean>(false);
  const skipNextAutoSaveRef = useRef<boolean>(false);

  // Hydrate from PostgreSQL Backend on mount (or seed PostgreSQL if empty)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [bootstrap, health] = await Promise.all([
        fetchBootstrapState(),
        fetchDbHealth(),
      ]);
      if (cancelled) return;

      if (health?.status === 'ok') {
        setDbLatencyMs(health.latencyMs ?? null);
      }

      if (!bootstrap) {
        setDbStatus('offline');
        hydratedFromBackendRef.current = true;
        return;
      }

      if (bootstrap.initialized && bootstrap.profile && bootstrap.weeks?.length) {
        skipNextAutoSaveRef.current = true;
        setProfile(bootstrap.profile);
        setWeeks(bootstrap.weeks);
        if (bootstrap.garmin) {
          setGarmin(bootstrap.garmin);
        }
        setDbStatus('synced');
      } else {
        // First boot on fresh PostgreSQL volume: seed current state into PostgreSQL
        const seeded = await saveFullStateToDb({ profile, weeks, garmin });
        setDbStatus(seeded ? 'synced' : 'offline');
      }

      hydratedFromBackendRef.current = true;
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist changes to both PostgreSQL backend and local cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
      localStorage.setItem(STORAGE_KEY_PLAN, JSON.stringify(weeks));
      localStorage.setItem(STORAGE_KEY_GARMIN, JSON.stringify(garmin));
    } catch {
      // ignore local storage errors
    }

    if (!hydratedFromBackendRef.current) return;
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }

    setDbStatus('saving');
    const timer = setTimeout(async () => {
      const ok = await saveFullStateToDb({ profile, weeks, garmin });
      if (ok) {
        const health = await fetchDbHealth();
        if (health?.latencyMs !== undefined) {
          setDbLatencyMs(health.latencyMs);
        }
        setDbStatus('synced');
      } else {
        setDbStatus('offline');
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [profile, weeks, garmin]);

  const navigateTo = (page: WebsitePage) => {
    setActivePage(page);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Build unified Past Workouts + GPS Routes list
  const pastWorkouts = useMemo(
    () => buildPastWorkoutsList(weeks, profile, garmin.watchModel),
    [weeks, profile, garmin.watchModel]
  );

  const handleCompleteOnboarding = (newProfile: UserProfile) => {
    setProfile(newProfile);
    const freshPlan = generateTrainingPlan(newProfile);
    setWeeks(freshPlan);
    setGarmin(createInitialGarminState(newProfile, freshPlan));
    setSelectedWeekNumber(1);
    setIsOnboardingOpen(false);
    navigateTo('plan');
  };

  const handleLogWorkoutComplete = (
    workoutId: string,
    loggedData: LoggedRunData
  ) => {
    setWeeks((prevWeeks) =>
      prevWeeks.map((wk) => ({
        ...wk,
        workouts: wk.workouts.map((w) =>
          w.id === workoutId
            ? {
                ...w,
                completed: true,
                loggedData,
              }
            : w
        ),
      }))
    );

    if (selectedWorkout && selectedWorkout.id === workoutId) {
      setSelectedWorkout((prev) =>
        prev ? { ...prev, completed: true, loggedData } : null
      );
    }
  };

  const handleUncompleteWorkout = (workoutId: string) => {
    setWeeks((prevWeeks) =>
      prevWeeks.map((wk) => ({
        ...wk,
        workouts: wk.workouts.map((w) =>
          w.id === workoutId
            ? {
                ...w,
                completed: false,
                loggedData: undefined,
              }
            : w
        ),
      }))
    );

    if (selectedWorkout && selectedWorkout.id === workoutId) {
      setSelectedWorkout((prev) =>
        prev ? { ...prev, completed: false, loggedData: undefined } : null
      );
    }
  };

  const handlePushWorkoutToGarmin = (workoutId: string) => {
    setGarmin((prev) => ({
      ...prev,
      lastSyncedAt: new Date().toISOString(),
      pushedWorkoutIds: prev.pushedWorkoutIds.includes(workoutId)
        ? prev.pushedWorkoutIds
        : [...prev.pushedWorkoutIds, workoutId],
    }));
  };

  const handlePushWeekToGarmin = (weekNum: number) => {
    const targetWeek = weeks.find((w) => w.weekNumber === weekNum);
    if (!targetWeek) return;
    const idsToPush = targetWeek.workouts
      .filter((w) => w.type !== 'Rest')
      .map((w) => w.id);

    setGarmin((prev) => ({
      ...prev,
      lastSyncedAt: new Date().toISOString(),
      pushedWorkoutIds: Array.from(
        new Set([...prev.pushedWorkoutIds, ...idsToPush])
      ),
    }));
  };

  const handleImportGarminActivity = (
    activity: GarminActivityFeedItem,
    explicitTargetWorkoutId?: string
  ) => {
    const currentWeekWorkouts =
      weeks[selectedWeekNumber - 1]?.workouts.filter(
        (w) => w.type !== 'Rest'
      ) || [];
    const fallbackUncompleted =
      currentWeekWorkouts.find((w) => !w.completed) || currentWeekWorkouts[0];

    const targetWorkoutId =
      explicitTargetWorkoutId ||
      activity.matchedWorkoutId ||
      fallbackUncompleted?.id;

    if (!targetWorkoutId) return;

    const loggedData: LoggedRunData = {
      actualDistanceKm: activity.distanceKm,
      actualDurationSeconds: activity.durationSeconds,
      actualPaceStr: activity.avgPaceStr,
      rpe: activity.trainingEffectAerobic >= 4.0 ? 8 : 6,
      notes: `Synced from Garmin ${garmin.watchModel} (${activity.avgHeartRate} bpm avg HR • ${activity.avgCadenceSpm} spm cadence • Aerobic TE ${activity.trainingEffectAerobic}).`,
      completedAt: new Date().toISOString(),
      source: 'Garmin Connect',
      garminMetrics: {
        deviceName: `Garmin ${garmin.watchModel}`,
        avgHeartRate: activity.avgHeartRate,
        maxHeartRate: activity.maxHeartRate,
        avgCadenceSpm: activity.avgCadenceSpm,
        elevationGainM: activity.elevationGainM,
        trainingEffectAerobic: activity.trainingEffectAerobic,
        calories: activity.calories,
      },
    };

    handleLogWorkoutComplete(targetWorkoutId, loggedData);

    setGarmin((prev) => ({
      ...prev,
      lastSyncedAt: new Date().toISOString(),
      recentActivities: prev.recentActivities.map((act) =>
        act.id === activity.id ? { ...act, imported: true } : act
      ),
    }));
  };

  const handleLaunchLiveTracker = (workout: ScheduledWorkout) => {
    setSelectedWorkout(null);
    setTrackerTargetWorkout(workout);
    navigateTo('track');
  };

  const handleQuickRecalibrate5k = (new5kMinutes: number) => {
    const updatedProfile = { ...profile, current5kMinutes: new5kMinutes };
    setProfile(updatedProfile);

    const freshPlan = generateTrainingPlan(updatedProfile);
    setWeeks((oldWeeks) =>
      freshPlan.map((newWk, wIdx) => {
        const oldWk = oldWeeks[wIdx];
        if (!oldWk) return newWk;
        return {
          ...newWk,
          workouts: newWk.workouts.map((newWo, dIdx) => {
            const oldWo = oldWk.workouts[dIdx];
            if (oldWo && oldWo.completed) {
              return {
                ...newWo,
                completed: true,
                loggedData: oldWo.loggedData,
              };
            }
            return newWo;
          }),
        };
      })
    );

    setGarmin((prev) => ({
      ...prev,
      biometrics: {
        ...prev.biometrics,
        garminVo2Max: Math.round(
          Math.max(42, Math.min(72, 82 - new5kMinutes * 1.15))
        ),
      },
    }));
  };

  const handleResetDefaultDemo = () => {
    const freshWeeks = generateTrainingPlan(DEFAULT_DEMO_PROFILE);
    setProfile(DEFAULT_DEMO_PROFILE);
    setWeeks(freshWeeks);
    setGarmin(createInitialGarminState(DEFAULT_DEMO_PROFILE, freshWeeks));
    setSelectedWeekNumber(1);
  };

  const allWorkouts = weeks.flatMap((w) => w.workouts);
  const fiveKPaceStr = formatSecondsToPace((profile.current5kMinutes * 60) / 5);
  const currentWeekObj =
    weeks.find((w) => w.weekNumber === selectedWeekNumber) || weeks[0];

  const navLinks: {
    id: WebsitePage;
    label: string;
    badge?: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'plan', label: 'Training Plan', icon: Calendar },
    {
      id: 'history',
      label: 'Past Workouts',
      badge: `${pastWorkouts.length}`,
      icon: MapPin,
    },
    { id: 'track', label: 'Run Studio', icon: Timer },
    { id: 'progress', label: 'Analytics', icon: TrendingUp },
    { id: 'profile', label: 'Athlete & Garmin', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#090A0D] text-white flex flex-col">
      {/* FULL WEBSITE STICKY NAVIGATION HEADER */}
      <header className="sticky top-0 z-40 bg-[#090A0D]/92 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => navigateTo('overview')}
            className="flex items-center gap-3 text-left cursor-pointer group shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-[#CCFF00] flex items-center justify-center text-black font-black text-lg tracking-tighter">
              R
            </div>
            <div>
              <span className="font-black tracking-tight text-lg text-white group-hover:text-[#CCFF00] transition block leading-none">
                RUNNA
              </span>
              <span className="text-[10px] font-mono-tabular font-bold uppercase tracking-widest text-zinc-400 block mt-0.5">
                Adaptive Web Platform
              </span>
            </div>
          </button>

          {/* Desktop Website Navigation Links */}
          <nav
            aria-label="Primary Website Navigation"
            className="hidden xl:flex items-center gap-1"
          >
            {navLinks.map((item) => {
              const Icon = item.icon;
              const active = activePage === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
                    active
                      ? 'bg-[#CCFF00] text-black'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono-tabular px-1.5 py-0.2 rounded-full ${
                        active
                          ? 'bg-black/20 text-black'
                          : 'bg-[#CCFF00]/15 text-[#CCFF00]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Header Actions: PostgreSQL Status + Garmin Status + Plan CTA */}
          <div className="flex items-center gap-2">
            {/* Live PostgreSQL Database Badge */}
            <button
              id="btn-header-db"
              type="button"
              onClick={() => setIsDbModalOpen(true)}
              className={`px-2.5 py-2 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                dbStatus === 'synced' || dbStatus === 'saving'
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                  : 'bg-[#141720] hover:bg-[#1D212F] border-white/10 text-zinc-400'
              }`}
              title="Inspect Docker & PostgreSQL Database Backend"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden md:inline font-mono-tabular">
                {dbStatus === 'saving'
                  ? 'Saving SQL...'
                  : dbStatus === 'synced'
                  ? `Postgres${dbLatencyMs != null ? ` ${Math.round(dbLatencyMs)}ms` : ''}`
                  : 'DB Local'}
              </span>
            </button>

            {/* Garmin Connect Status */}
            <button
              id="btn-header-garmin"
              type="button"
              onClick={() => setIsGarminModalOpen(true)}
              className={`px-2.5 py-2 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                garmin.connected
                  ? 'bg-[#0F172A] hover:bg-[#16223D] border-[#38BDF8]/40 text-[#38BDF8]'
                  : 'bg-[#141720] hover:bg-[#1D212F] border-white/10 text-zinc-400'
              }`}
              title="Garmin Connect™ Sync & Watch Settings"
            >
              <Watch className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {garmin.connected
                  ? garmin.watchModel.replace('Forerunner ', 'FR ')
                  : 'Garmin'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  garmin.connected ? 'bg-emerald-400' : 'bg-zinc-600'
                }`}
              />
            </button>

            <button
              id="btn-header-onboarding"
              type="button"
              onClick={() => setIsOnboardingOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#CCFF00] hover:bg-[#b8e600] text-black font-extrabold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Customize Plan</span>
            </button>

            {/* Responsive Drawer Toggle for smaller viewports */}
            <button
              id="btn-mobile-menu"
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="xl:hidden p-2.5 rounded-xl bg-[#141720] hover:bg-[#1C212E] border border-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
              aria-label="Toggle Website Menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Website Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-white/10 bg-[#0D1017] px-4 py-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const active = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.id)}
                    className={`p-3 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
                      active
                        ? 'bg-[#CCFF00] text-black'
                        : 'bg-[#151925] text-zinc-300 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setIsOnboardingOpen(true);
              }}
              className="w-full py-3 rounded-xl bg-white/10 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#CCFF00]" />
              Customize Goal & Onboarding Quiz
            </button>
          </div>
        )}
      </header>

      {/* MAIN WEBSITE STAGE */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {activePage === 'overview' && (
          <WebsiteHomeView
            profile={profile}
            weeks={weeks}
            garmin={garmin}
            pastWorkouts={pastWorkouts}
            onNavigate={navigateTo}
            onSelectWorkout={(wo) => setSelectedWorkout(wo)}
            onLaunchLiveTracker={handleLaunchLiveTracker}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
            onOpenGarminModal={() => setIsGarminModalOpen(true)}
          />
        )}

        {activePage === 'plan' && (
          <PlanDashboardView
            profile={profile}
            weeks={weeks}
            garmin={garmin}
            selectedWeekNumber={selectedWeekNumber}
            onSelectWeek={setSelectedWeekNumber}
            onSelectWorkout={(wo) => setSelectedWorkout(wo)}
            onLaunchLiveTracker={handleLaunchLiveTracker}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
            onOpenGarminModal={() => setIsGarminModalOpen(true)}
            onPushWeekToGarmin={handlePushWeekToGarmin}
          />
        )}

        {activePage === 'history' && (
          <PastWorkoutsSection
            pastWorkouts={pastWorkouts}
            onGoToLogger={() => navigateTo('track')}
          />
        )}

        {activePage === 'track' && (
          <RunTrackerView
            profile={profile}
            garmin={garmin}
            activeWorkout={
              trackerTargetWorkout ||
              weeks[selectedWeekNumber - 1]?.workouts.find(
                (w) => w.type !== 'Rest' && !w.completed
              ) ||
              null
            }
            availableWorkouts={allWorkouts}
            onSelectWorkout={(wo) => setTrackerTargetWorkout(wo)}
            onSaveTrackedRun={handleLogWorkoutComplete}
            onImportGarminActivity={handleImportGarminActivity}
          />
        )}

        {activePage === 'progress' && (
          <ProgressStatsView
            profile={profile}
            weeks={weeks}
            onOpenWorkout={(wo) => setSelectedWorkout(wo)}
          />
        )}

        {activePage === 'profile' && (
          <ProfileView
            profile={profile}
            weeks={weeks}
            garmin={garmin}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
            onOpenGarminModal={() => setIsGarminModalOpen(true)}
            onQuickRecalibrate5k={handleQuickRecalibrate5k}
            onResetDefaultDemo={handleResetDefaultDemo}
          />
        )}
      </main>

      {/* FULL WEBSITE MULTI-COLUMN FOOTER */}
      <footer className="mt-16 border-t border-white/10 bg-[#07080B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8 text-xs">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#CCFF00] text-black font-black text-sm flex items-center justify-center">
                R
              </div>
              <span className="font-black text-base tracking-tight text-white">
                RUNNA
              </span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Full-stack adaptive running platform hosted on Docker with PostgreSQL 16 persistence, Garmin Connect™ wearable sync, and GPS route telemetry.
            </p>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-extrabold uppercase tracking-wider text-white">
              Platform Sections
            </h4>
            <ul className="space-y-2 text-zinc-400">
              <li>
                <button
                  type="button"
                  onClick={() => navigateTo('overview')}
                  className="hover:text-[#CCFF00] transition cursor-pointer"
                >
                  Athlete Overview
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateTo('plan')}
                  className="hover:text-[#CCFF00] transition cursor-pointer"
                >
                  Weekly Training Plan ({profile.planWeeks} Weeks)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateTo('history')}
                  className="hover:text-[#CCFF00] transition cursor-pointer"
                >
                  Past Workouts & GPS Route Maps ({pastWorkouts.length})
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateTo('track')}
                  className="hover:text-[#CCFF00] transition cursor-pointer"
                >
                  Run Studio & Live Simulator
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-extrabold uppercase tracking-wider text-white">
              Active Calibration
            </h4>
            <ul className="space-y-2 text-zinc-400 font-mono-tabular">
              <li>Goal: {profile.goalLabel}</li>
              <li>5K Pace Benchmark: {fiveKPaceStr}/km</li>
              <li>Schedule: {profile.daysPerWeek} runs / week</li>
              <li>Race Date: {profile.targetRaceDate}</li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-extrabold uppercase tracking-wider text-white">
              Docker & PostgreSQL Stack
            </h4>
            <p className="text-zinc-400">
              Status:{' '}
              <span className="text-emerald-400 font-semibold">
                {dbStatus === 'synced'
                  ? 'PostgreSQL 16 Connected'
                  : dbStatus === 'saving'
                  ? 'Writing Transaction...'
                  : 'Local Fallback'}
              </span>
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsDbModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-400 font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                Inspect SQL DB
              </button>
              <button
                type="button"
                onClick={() => setIsGarminModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-[#0F172A] hover:bg-[#16223D] border border-[#38BDF8]/40 text-[#38BDF8] font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Watch className="w-3.5 h-3.5" />
                Garmin
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Workout Detail & Logging Modal */}
      {selectedWorkout && (
        <WorkoutDetailModal
          workout={selectedWorkout}
          garmin={garmin}
          onClose={() => setSelectedWorkout(null)}
          onLogComplete={handleLogWorkoutComplete}
          onUncomplete={handleUncompleteWorkout}
          onLaunchLiveTracker={handleLaunchLiveTracker}
          onPushWorkoutToGarmin={handlePushWorkoutToGarmin}
        />
      )}

      {/* Garmin Connect Integration Hub Modal */}
      {isGarminModalOpen && (
        <GarminConnectModal
          garmin={garmin}
          currentWeek={currentWeekObj}
          onClose={() => setIsGarminModalOpen(false)}
          onUpdateGarmin={setGarmin}
          onPushWeekToGarmin={handlePushWeekToGarmin}
          onImportGarminActivity={handleImportGarminActivity}
        />
      )}

      {/* PostgreSQL & Docker Diagnostics Modal */}
      {isDbModalOpen && (
        <DatabaseStatusModal onClose={() => setIsDbModalOpen(false)} />
      )}

      {/* Multi-Step Onboarding Quiz Modal */}
      {isOnboardingOpen && (
        <OnboardingModal
          initialProfile={profile}
          onComplete={handleCompleteOnboarding}
          onCancel={() => setIsOnboardingOpen(false)}
        />
      )}
    </div>
  );
}

export default App;

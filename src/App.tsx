import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  LogOut,
} from 'lucide-react';
import type {
  AuthUser,
  GarminActivityFeedItem,
  GarminIntegrationState,
  LoggedRunData,
  ScheduledWorkout,
  TrainingWeek,
  UserProfile,
} from './types';
import {
  addDaysIso,
  createDefaultProfileForToday,
  findActiveWeekForToday,
  formatSecondsToPace,
  generateTrainingPlan,
  getLocalTodayIso,
  rebuildPlanPreservingLogs,
} from './utils/planGenerator';
import {
  createEmptyGarminState,
  createInitialGarminState,
} from './utils/garminUtils';
import { buildPastWorkoutsList } from './utils/gpsRouteGenerator';
import {
  clearUserStateInDb,
  fetchBootstrapState,
  fetchCurrentUser,
  fetchDbHealth,
  logoutAccount,
  saveFullStateToDb,
} from './utils/apiClient';
import { AuthPage } from './components/AuthPage';
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

export type WebsitePage =
  | 'overview'
  | 'plan'
  | 'history'
  | 'track'
  | 'progress'
  | 'profile';

function createBlankUserProfile(userName: string): UserProfile {
  const todayIso = getLocalTodayIso();
  return {
    name: userName,
    goal: '10K',
    intent: 'improve',
    goalLabel: 'Run a 10K',
    current5kMinutes: 25.0,
    daysPerWeek: 4,
    startDate: todayIso,
    customStartDate: undefined,
    targetRaceDate: addDaysIso(todayIso, 8 * 7 - 1),
    planWeeks: 8,
    currentWeek: 1,
    createdAt: new Date().toISOString(),
    unit: 'km',
  };
}

export function App() {
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const [profile, setProfile] = useState<UserProfile>(() =>
    createBlankUserProfile('Runner')
  );
  const [weeks, setWeeks] = useState<TrainingWeek[]>([]);
  const [garmin, setGarmin] = useState<GarminIntegrationState>(() =>
    createEmptyGarminState('Runner')
  );

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
  const hydratedUserRef = useRef<boolean>(false);
  const skipNextAutoSaveRef = useRef<boolean>(false);

  const hydrateWorkspaceForUser = useCallback(async (user: AuthUser) => {
    hydratedUserRef.current = false;
    const todayIso = getLocalTodayIso();

    const [bootstrap, health] = await Promise.all([
      fetchBootstrapState(),
      fetchDbHealth(),
    ]);

    if (health?.status === 'ok') {
      setDbLatencyMs(health.latencyMs ?? null);
    }

    if (!bootstrap) {
      setProfile(createBlankUserProfile(user.name));
      setWeeks([]);
      setGarmin(createEmptyGarminState(user.name));
      setDbStatus('offline');
      hydratedUserRef.current = true;
      return;
    }

    // Brand-new or empty user account: NO pre-populated plan, NO workouts, NO Garmin data!
    if (!bootstrap.initialized || !bootstrap.hasPlan || !bootstrap.profile || !bootstrap.weeks?.length) {
      skipNextAutoSaveRef.current = true;
      setProfile(createBlankUserProfile(user.name));
      setWeeks([]);
      setGarmin(bootstrap.garmin || createEmptyGarminState(user.name));
      setSelectedWeekNumber(1);
      setDbStatus('synced');
      hydratedUserRef.current = true;
      return;
    }

    // Returning user with an existing saved training plan
    const dbProf = bootstrap.profile;
    const hasCustom = Boolean(dbProf.customStartDate?.trim());
    const expectedStart = hasCustom ? dbProf.customStartDate! : todayIso;
    const firstWorkoutIso = bootstrap.weeks[0]?.workouts[0]?.isoDate;

    if (
      !hasCustom &&
      (dbProf.startDate !== todayIso || firstWorkoutIso !== expectedStart)
    ) {
      const syncedProfile: UserProfile = {
        ...dbProf,
        startDate: todayIso,
        customStartDate: undefined,
        targetRaceDate: addDaysIso(todayIso, (dbProf.planWeeks || 8) * 7 - 1),
      };
      const syncedWeeks = rebuildPlanPreservingLogs(
        bootstrap.weeks,
        syncedProfile
      );
      setProfile(syncedProfile);
      setWeeks(syncedWeeks);
      setSelectedWeekNumber(findActiveWeekForToday(syncedWeeks, todayIso));
      setGarmin(bootstrap.garmin || createEmptyGarminState(user.name));
      setDbStatus('synced');
    } else {
      skipNextAutoSaveRef.current = true;
      setProfile({ ...dbProf, startDate: expectedStart });
      setWeeks(bootstrap.weeks);
      setSelectedWeekNumber(findActiveWeekForToday(bootstrap.weeks, todayIso));
      setGarmin(bootstrap.garmin || createEmptyGarminState(user.name));
      setDbStatus('synced');
    }

    hydratedUserRef.current = true;
  }, []);

  // Check existing session token on initial page load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [me, health] = await Promise.all([
        fetchCurrentUser(),
        fetchDbHealth(),
      ]);
      if (cancelled) return;

      if (health?.status === 'ok') {
        setDbLatencyMs(health.latencyMs ?? null);
        setDbStatus('synced');
      }

      if (me) {
        setCurrentUser(me);
        await hydrateWorkspaceForUser(me);
      }
      setAuthChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrateWorkspaceForUser]);

  // Auto-save authenticated user's changes to PostgreSQL
  useEffect(() => {
    if (!currentUser || !hydratedUserRef.current) return;
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }
    // Don't write empty profile/weeks unless user created a plan or connected Garmin
    if (weeks.length === 0 && !garmin.connected) return;

    setDbStatus('saving');
    const timer = setTimeout(async () => {
      const ok = await saveFullStateToDb({
        profile: weeks.length > 0 ? profile : null,
        weeks,
        garmin,
      });
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
  }, [currentUser, profile, weeks, garmin]);

  const handleAuthenticated = async (
    user: AuthUser,
    _isNewRegistration: boolean
  ) => {
    setCurrentUser(user);
    setActivePage('overview');
    await hydrateWorkspaceForUser(user);
  };

  const handleSignOut = async () => {
    hydratedUserRef.current = false;
    await logoutAccount();
    setCurrentUser(null);
    setWeeks([]);
    setSelectedWorkout(null);
    setTrackerTargetWorkout(null);
    setActivePage('overview');
  };

  const navigateTo = (page: WebsitePage) => {
    setActivePage(page);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Build Past Workouts list — ONLY include sample demo history for the demo user!
  const pastWorkouts = useMemo(
    () =>
      buildPastWorkoutsList(
        weeks,
        profile,
        garmin.watchModel,
        Boolean(currentUser?.isDemo)
      ),
    [weeks, profile, garmin.watchModel, currentUser?.isDemo]
  );

  const handleCompleteOnboarding = (newProfile: UserProfile) => {
    const todayIso = getLocalTodayIso();
    const effectiveStart = newProfile.customStartDate?.trim() || todayIso;
    const normalizedProfile: UserProfile = {
      ...newProfile,
      startDate: effectiveStart,
      customStartDate: newProfile.customStartDate?.trim() || undefined,
    };
    const freshPlan = generateTrainingPlan(normalizedProfile);
    setProfile(normalizedProfile);
    setWeeks(freshPlan);
    if (currentUser?.isDemo) {
      setGarmin(createInitialGarminState(normalizedProfile, freshPlan));
    }
    setSelectedWeekNumber(findActiveWeekForToday(freshPlan, todayIso));
    setIsOnboardingOpen(false);
    navigateTo('plan');
  };

  const handleUpdateStartDate = (customStartIso?: string) => {
    if (weeks.length === 0) return;
    const todayIso = getLocalTodayIso();
    const trimmedCustom = customStartIso?.trim() || undefined;
    const effectiveStart = trimmedCustom || todayIso;

    const updatedProfile: UserProfile = {
      ...profile,
      startDate: effectiveStart,
      customStartDate: trimmedCustom,
      targetRaceDate: addDaysIso(
        effectiveStart,
        (profile.planWeeks || 8) * 7 - 1
      ),
    };

    const nextWeeks = rebuildPlanPreservingLogs(weeks, updatedProfile);
    setProfile(updatedProfile);
    setWeeks(nextWeeks);
    setSelectedWeekNumber(findActiveWeekForToday(nextWeeks, todayIso));
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

    if (weeks.length > 0) {
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
    }

    if (garmin.connected) {
      setGarmin((prev) => ({
        ...prev,
        biometrics: {
          ...prev.biometrics,
          garminVo2Max: Math.round(
            Math.max(42, Math.min(72, 82 - new5kMinutes * 1.15))
          ),
        },
      }));
    }
  };

  const handleResetPlanData = async () => {
    if (!currentUser) return;
    if (currentUser.isDemo) {
      const todayProfile = createDefaultProfileForToday();
      const freshWeeks = generateTrainingPlan(todayProfile);
      setProfile(todayProfile);
      setWeeks(freshWeeks);
      setGarmin(createInitialGarminState(todayProfile, freshWeeks));
      setSelectedWeekNumber(1);
    } else {
      skipNextAutoSaveRef.current = true;
      await clearUserStateInDb();
      setProfile(createBlankUserProfile(currentUser.name));
      setWeeks([]);
      setGarmin(createEmptyGarminState(currentUser.name));
      setSelectedWeekNumber(1);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#090A0D] text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-bold text-zinc-400">
          <div className="w-8 h-8 rounded-xl bg-[#CCFF00] text-black font-black flex items-center justify-center">
            R
          </div>
          <span>Connecting to Runna PostgreSQL...</span>
        </div>
      </div>
    );
  }

  // Gate unauthenticated visitors with the Multi-User Sign In / Create Account Page
  if (!currentUser) {
    return (
      <AuthPage
        dbLatencyMs={dbLatencyMs}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  const allWorkouts = weeks.flatMap((w) => w.workouts);
  const fiveKPaceStr = formatSecondsToPace((profile.current5kMinutes * 60) / 5);
  const currentWeekObj =
    weeks.find((w) => w.weekNumber === selectedWeekNumber) || weeks[0] || null;

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

  const userInitials = currentUser.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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

          {/* Right Header Actions: DB + Garmin + User Account & Sign Out */}
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
              <span className="hidden lg:inline font-mono-tabular">
                {dbStatus === 'saving' ? 'Saving...' : 'Postgres'}
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
              <span className="hidden md:inline">
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

            {/* Plan Builder CTA */}
            <button
              id="btn-header-onboarding"
              type="button"
              onClick={() => setIsOnboardingOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#CCFF00] hover:bg-[#b8e600] text-black font-extrabold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{weeks.length > 0 ? 'Customize' : 'Create Plan'}</span>
            </button>

            {/* Signed-In User Chip + Sign Out Button */}
            <div className="hidden sm:flex items-center gap-1.5 pl-1 border-l border-white/10">
              <button
                type="button"
                onClick={() => navigateTo('profile')}
                className="px-2.5 py-1.5 rounded-xl bg-[#141720] hover:bg-[#1C212E] border border-white/10 flex items-center gap-2 text-xs font-bold text-white transition cursor-pointer"
                title={`Signed in as ${currentUser.email}`}
              >
                <span className="w-5 h-5 rounded-md bg-[#CCFF00] text-black font-black text-[10px] flex items-center justify-center">
                  {userInitials}
                </span>
                <span className="max-w-[90px] truncate hidden md:inline">
                  {currentUser.name.split(' ')[0]}
                </span>
              </button>

              <button
                id="btn-sign-out"
                type="button"
                onClick={handleSignOut}
                className="p-2 rounded-xl bg-[#141720] hover:bg-[#FF4D4D]/15 border border-white/10 hover:border-[#FF4D4D]/40 text-zinc-400 hover:text-[#FF4D4D] transition cursor-pointer"
                title="Sign Out / Switch Account"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

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
            <div className="flex items-center justify-between px-1 pb-2 border-b border-white/8 text-xs">
              <span className="text-zinc-300 font-bold">
                Signed in as <strong className="text-white">{currentUser.name}</strong> ({currentUser.email})
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-[#FF4D4D] font-extrabold uppercase flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>

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
              {weeks.length > 0 ? 'Customize Training Plan' : 'Create Training Plan'}
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
            onUpdateStartDate={handleUpdateStartDate}
          />
        )}

        {activePage === 'history' && (
          <PastWorkoutsSection
            pastWorkouts={pastWorkouts}
            onGoToLogger={() =>
              navigateTo(weeks.length > 0 ? 'track' : 'plan')
            }
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
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
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
            onResetDefaultDemo={handleResetPlanData}
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
              Multi-user adaptive running platform hosted on Docker with isolated PostgreSQL 16 accounts, Garmin Connect™ sync, and GPS route telemetry.
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
                  Weekly Training Plan
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
              Signed-In Athlete
            </h4>
            <ul className="space-y-2 text-zinc-400 font-mono-tabular">
              <li>Account: {currentUser.email}</li>
              {weeks.length > 0 ? (
                <>
                  <li>Goal: {profile.goalLabel}</li>
                  <li>5K Pace: {fiveKPaceStr}/km</li>
                  <li>
                    Start: {profile.customStartDate || profile.startDate} (
                    {profile.customStartDate ? 'Custom' : 'Today'})
                  </li>
                </>
              ) : (
                <li>Plan: Not created yet (0 workouts)</li>
              )}
            </ul>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-extrabold uppercase tracking-wider text-white">
              Session & Stack
            </h4>
            <p className="text-zinc-400">
              DB:{' '}
              <span className="text-emerald-400 font-semibold">
                {dbStatus === 'synced'
                  ? 'PostgreSQL 16 Connected'
                  : dbStatus === 'saving'
                  ? 'Writing Transaction...'
                  : 'Offline'}
              </span>
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsDbModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-400 font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                SQL DB
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-[#FF4D4D]/15 border border-white/10 hover:border-[#FF4D4D]/40 text-zinc-300 hover:text-[#FF4D4D] font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
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

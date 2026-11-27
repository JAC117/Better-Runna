import React, { useState } from 'react';
import {
  ArrowRight,
  Lock,
  Mail,
  User,
  Database,
  CheckCircle2,
  AlertCircle,
  Watch,
  MapPin,
  Gauge,
} from 'lucide-react';
import type { AuthUser } from '../types';
import { loginAccount, registerAccount } from '../utils/apiClient';

interface AuthPageProps {
  dbLatencyMs: number | null;
  onAuthenticated: (user: AuthUser, isNewRegistration: boolean) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  dbLatencyMs,
  onAuthenticated,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    if (mode === 'register') {
      const result = await registerAccount({ name, email, password });
      setSubmitting(false);
      if (result.error || !result.data) {
        setErrorMsg(result.error || 'Could not create account.');
        return;
      }
      onAuthenticated(result.data.user, true);
    } else {
      const result = await loginAccount({ email, password });
      setSubmitting(false);
      if (result.error || !result.data) {
        setErrorMsg(result.error || 'Invalid email or password.');
        return;
      }
      onAuthenticated(result.data.user, false);
    }
  };

  const handleDemoLogin = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    const result = await loginAccount({
      email: 'alex@runna.demo',
      password: 'demo1234',
    });
    setSubmitting(false);
    if (result.error || !result.data) {
      setErrorMsg(result.error || 'Demo account unavailable.');
      return;
    }
    onAuthenticated(result.data.user, false);
  };

  return (
    <div className="min-h-screen bg-[#090A0D] text-white flex flex-col justify-between">
      {/* Top Minimal Header */}
      <header className="border-b border-white/10 bg-[#090A0D]/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#CCFF00] flex items-center justify-center text-black font-black text-lg tracking-tighter">
              R
            </div>
            <div>
              <span className="font-black tracking-tight text-lg text-white block leading-none">
                RUNNA
              </span>
              <span className="text-[10px] font-mono-tabular font-bold uppercase tracking-widest text-zinc-400 block mt-0.5">
                Multi-Athlete Web Platform
              </span>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono-tabular font-bold">
            <Database className="w-3.5 h-3.5" />
            <span>
              PostgreSQL 16{dbLatencyMs != null ? ` • ${Math.round(dbLatencyMs)}ms` : ''}
            </span>
          </div>
        </div>
      </header>

      {/* Main Centered Split Auth Stage */}
      <main className="flex-1 flex items-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Editorial Column */}
          <div className="lg:col-span-6 space-y-6">
            <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#CCFF00]">
              Personalized Running & Race Coaching
            </div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-[1.06]">
              Every runner gets their own calibrated training lab.
            </h1>

            <p className="text-base text-zinc-400 leading-relaxed max-w-lg">
              Sign in to access your training schedule, Garmin Connect™ watch sync, and post-run GPS route telemetry—or create a brand-new athlete account starting from a clean slate.
            </p>

            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#131722] border border-white/10 flex items-center justify-center text-[#CCFF00] shrink-0">
                  <Gauge className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    Adaptive Pace Zones & Start Date Sync
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    Plans sync automatically to today's date or any custom race timeline you choose.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#131722] border border-white/10 flex items-center justify-center text-sky-400 shrink-0">
                  <Watch className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    Garmin Connect™ & .TCX Workout Export
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    Push structured interval steps to your watch and log heart rate & cadence splits.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#131722] border border-white/10 flex items-center justify-center text-emerald-400 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    Isolated PostgreSQL Accounts & GPS Route Maps
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    Each user's profile, weekly workouts, and GPS run logbook are stored independently in PostgreSQL.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sign In / Create Account Card */}
          <div className="lg:col-span-6">
            <div className="max-w-md mx-auto lg:ml-auto rounded-3xl bg-[#11141D] border border-white/10 p-6 sm:p-8 shadow-2xl space-y-6">
              {/* Mode Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#0A0C12] border border-white/8">
                <button
                  id="auth-tab-login"
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                  }}
                  className={`py-2.5 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
                    mode === 'login'
                      ? 'bg-[#CCFF00] text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  id="auth-tab-register"
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg(null);
                  }}
                  className={`py-2.5 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
                    mode === 'register'
                      ? 'bg-[#CCFF00] text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <div>
                <h2 className="text-2xl font-black tracking-tight text-white">
                  {mode === 'login'
                    ? 'Welcome back, runner'
                    : 'Create your athlete account'}
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  {mode === 'login'
                    ? 'Enter your email and password to load your personal training plan and workout history.'
                    : 'New accounts start completely fresh with zero pre-loaded workouts or plans.'}
                </p>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-[#FF4D4D]/15 border border-[#FF4D4D]/40 text-[#FF4D4D] text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <label
                      htmlFor="auth-name"
                      className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5"
                    >
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="auth-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Jordan Lee"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#171B26] border border-white/10 text-white text-sm focus:outline-none focus:border-[#CCFF00]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="runner@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#171B26] border border-white/10 text-white text-sm focus:outline-none focus:border-[#CCFF00]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        mode === 'register'
                          ? 'Minimum 6 characters'
                          : 'Enter your password'
                      }
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#171B26] border border-white/10 text-white text-sm focus:outline-none focus:border-[#CCFF00]"
                    />
                  </div>
                </div>

                {mode === 'register' && (
                  <div className="p-3 rounded-xl bg-[#0B0E15] border border-white/5 flex items-start gap-2.5 text-[11px] text-zinc-400">
                    <CheckCircle2 className="w-4 h-4 text-[#CCFF00] shrink-0 mt-0.5" />
                    <span>
                      Your new account starts empty—no sample workouts, routes, or wearable logs will be added until you create a plan or log a run.
                    </span>
                  </div>
                )}

                <button
                  id="auth-submit-btn"
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-5 rounded-xl bg-[#CCFF00] hover:bg-[#b8e600] disabled:opacity-50 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <span>
                    {submitting
                      ? 'Please wait...'
                      : mode === 'login'
                      ? 'Sign In'
                      : 'Create Empty Account'}
                  </span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>

              {/* Optional Demo Account Shortcut */}
              <div className="pt-4 border-t border-white/8 space-y-2.5">
                <div className="text-[11px] text-zinc-500 text-center uppercase tracking-wider font-bold">
                  Or preview with sample demo athlete
                </div>
                <button
                  id="auth-demo-btn"
                  type="button"
                  disabled={submitting}
                  onClick={handleDemoLogin}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-bold transition cursor-pointer"
                >
                  Sign In as Demo Athlete (Alex Rivera • Pre-Loaded Data)
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/8 py-5 text-center text-xs text-zinc-500">
        RUNNA // Multi-User PostgreSQL Authentication & Adaptive Coaching
      </footer>
    </div>
  );
};

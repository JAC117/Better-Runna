import React, { useEffect, useState } from 'react';
import {
  X,
  Database,
  RefreshCw,
  Server,
  CheckCircle2,
  Layers,
  Clock,
  Activity,
} from 'lucide-react';
import {
  fetchDbHealth,
  fetchSqlWorkoutLogs,
  type DbHealthResponse,
  type SqlWorkoutLogRow,
} from '../utils/apiClient';
import { formatDuration } from '../utils/planGenerator';

interface DatabaseStatusModalProps {
  onClose: () => void;
}

export const DatabaseStatusModal: React.FC<DatabaseStatusModalProps> = ({
  onClose,
}) => {
  const [health, setHealth] = useState<DbHealthResponse | null>(null);
  const [logs, setLogs] = useState<SqlWorkoutLogRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadDiagnostics = async () => {
    setLoading(true);
    const [h, l] = await Promise.all([fetchDbHealth(), fetchSqlWorkoutLogs()]);
    setHealth(h);
    setLogs(l);
    setLoading(false);
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-t-3xl sm:rounded-3xl bg-[#11141D] border border-white/10 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Top Modal Bar */}
        <div className="px-6 pt-5 pb-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
                  Docker Compose Infrastructure
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    health?.status === 'ok'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400'
                  }`}
                >
                  {health?.status === 'ok' ? 'Connected' : 'Checking'}
                </span>
              </div>
              <h2 className="text-lg font-black text-white">
                PostgreSQL Backend & Container Diagnostics
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadDiagnostics}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
              title="Refresh SQL Diagnostics"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* 3-Container Topology Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-[#161B28] border border-white/10">
              <div className="flex items-center justify-between text-xs font-bold text-sky-400">
                <span>runna-web</span>
                <Layers className="w-4 h-4" />
              </div>
              <div className="text-sm font-black text-white mt-1">
                Nginx 1.27 Alpine
              </div>
              <div className="text-[11px] text-zinc-400 font-mono-tabular mt-0.5">
                SPA + /api Reverse Proxy
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#161B28] border border-white/10">
              <div className="flex items-center justify-between text-xs font-bold text-[#CCFF00]">
                <span>runna-api</span>
                <Server className="w-4 h-4" />
              </div>
              <div className="text-sm font-black text-white mt-1">
                Node 22 + Express
              </div>
              <div className="text-[11px] text-zinc-400 font-mono-tabular mt-0.5">
                Uptime: {health?.uptimeSeconds ?? 0}s • Port 4000
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#161B28] border border-emerald-500/30">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                <span>runna-postgres</span>
                <Database className="w-4 h-4" />
              </div>
              <div className="text-sm font-black text-white mt-1">
                {health?.engine || 'PostgreSQL 16'}
              </div>
              <div className="text-[11px] text-emerald-400 font-mono-tabular mt-0.5">
                SQL Ping: {health?.latencyMs ?? '—'} ms
              </div>
            </div>
          </div>

          {/* Live Relational Table Row Counts */}
          {health?.tables && (
            <div className="p-5 rounded-3xl bg-[#151925] border border-white/10 space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#CCFF00]" />
                PostgreSQL Relational Tables (`runna_db`)
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="p-3 rounded-2xl bg-[#0C0F17] border border-white/5">
                  <div className="text-[10px] font-mono-tabular text-zinc-400">
                    athletes
                  </div>
                  <div className="text-xl font-black font-mono-tabular text-white mt-0.5">
                    {health.tables.athletes_count}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-[#0C0F17] border border-white/5">
                  <div className="text-[10px] font-mono-tabular text-zinc-400">
                    training_weeks
                  </div>
                  <div className="text-xl font-black font-mono-tabular text-white mt-0.5">
                    {health.tables.weeks_count}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-[#0C0F17] border border-[#CCFF00]/30">
                  <div className="text-[10px] font-mono-tabular text-[#CCFF00]">
                    workout_logs
                  </div>
                  <div className="text-xl font-black font-mono-tabular text-[#CCFF00] mt-0.5">
                    {health.tables.workout_logs_count}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-[#0C0F17] border border-white/5">
                  <div className="text-[10px] font-mono-tabular text-zinc-400">
                    garmin_connections
                  </div>
                  <div className="text-xl font-black font-mono-tabular text-sky-400 mt-0.5">
                    {health.tables.garmin_count}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live SQL Rows from workout_logs */}
          <div className="p-5 rounded-3xl bg-[#151925] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Live SQL Table: `workout_logs` ({logs.length} rows)
              </h3>
              <span className="text-[11px] font-mono-tabular text-zinc-500">
                SELECT * FROM workout_logs
              </span>
            </div>

            {logs.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500">
                No completed workout rows in `workout_logs` yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {logs.map((row) => (
                  <div
                    key={row.id}
                    className="p-3 rounded-xl bg-[#0C0F17] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-tabular text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">
                          {row.id}
                        </span>
                        <span className="font-bold text-white">
                          {row.title}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2">
                        <span>{row.workout_type}</span>
                        <span>•</span>
                        <span>Source: {row.source}</span>
                      </div>
                    </div>

                    <div className="font-mono-tabular text-right shrink-0">
                      <div className="font-black text-[#CCFF00]">
                        {Number(row.distance_km).toFixed(1)} km @{' '}
                        {row.avg_pace_str}
                      </div>
                      <div className="text-[10px] text-zinc-400 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(Number(row.duration_seconds))} • RPE{' '}
                        {row.rpe}/10
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MapPin,
  Heart,
  Gauge,
  Mountain,
  Compass,
} from 'lucide-react';
import type { PastWorkoutRecord } from '../types';
import { ROUTE_ENVIRONMENTS } from '../utils/gpsRouteGenerator';
import { formatSecondsToPace } from '../utils/planGenerator';

interface WorkoutRouteMapProps {
  workout: PastWorkoutRecord;
  compact?: boolean;
  selectedKmSplit?: number | null;
  onSelectKmSplit?: (km: number | null) => void;
}

type OverlayMode = 'pace' | 'hr' | 'elevation';

export const WorkoutRouteMap: React.FC<WorkoutRouteMapProps> = ({
  workout,
  compact = false,
  selectedKmSplit = null,
  onSelectKmSplit,
}) => {
  const env = ROUTE_ENVIRONMENTS[workout.routePresetId];
  const track = workout.gpsTrack;

  const [overlayMode, setOverlayMode] = useState<OverlayMode>('pace');
  const [activeIndex, setActiveIndex] = useState<number>(
    Math.floor(track.length * 0.45)
  );
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Reset state when switching workouts
  useEffect(() => {
    setIsReplaying(false);
    setZoomLevel(1);
    setActiveIndex(Math.floor(workout.gpsTrack.length * 0.45));
  }, [workout.id, workout.gpsTrack.length]);

  // Sync activeIndex if user clicks a KM split in parent table
  useEffect(() => {
    if (selectedKmSplit == null) return;
    const targetDist = selectedKmSplit;
    let bestIdx = 0;
    let bestDiff = Infinity;
    track.forEach((pt, idx) => {
      const diff = Math.abs(pt.distanceKm - targetDist);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = idx;
      }
    });
    setActiveIndex(bestIdx);
  }, [selectedKmSplit, track]);

  // Route Replay animation loop
  useEffect(() => {
    if (!isReplaying) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        if (prev >= track.length - 1) {
          setIsReplaying(false);
          return track.length - 1;
        }
        return prev + 1;
      });
    }, 95);
    return () => clearInterval(interval);
  }, [isReplaying, track.length]);

  const handleToggleReplay = () => {
    if (!isReplaying && activeIndex >= track.length - 1) {
      setActiveIndex(0);
    }
    setIsReplaying((r) => !r);
  };

  // Compute segment color based on selected telemetry mode
  const getSegmentColor = (idx: number): string => {
    const pt = track[idx];
    const nextPt = track[Math.min(track.length - 1, idx + 1)];

    if (overlayMode === 'pace') {
      const ratio = pt.paceSecPerKm / workout.avgPaceSecPerKm;
      if (ratio <= 0.96) return '#CCFF00'; // Fast surge (Neon Lime)
      if (ratio <= 1.05) return '#FBBF24'; // Threshold / Target (Amber)
      return '#38BDF8'; // Easy / Recovery (Sky Blue)
    }

    if (overlayMode === 'hr') {
      if (pt.heartRateBpm >= workout.maxHeartRate - 10) return '#FF4D4D'; // Zone 5 Coral
      if (pt.heartRateBpm >= workout.avgHeartRate - 4) return '#F59E0B'; // Zone 4 Amber
      return '#34D399'; // Zone 2-3 Emerald
    }

    // Elevation grade
    const elevDiff = nextPt.elevationM - pt.elevationM;
    if (elevDiff > 0.9) return '#FF4D4D';
    if (elevDiff > 0.15) return '#CCFF00';
    return '#38BDF8';
  };

  const activePoint = track[Math.min(track.length - 1, Math.max(0, activeIndex))];
  const startPoint = track[0];
  const endPoint = track[track.length - 1];

  // Dynamic zoom viewBox centered around route centroid
  const viewW = Math.round(1000 / zoomLevel);
  const viewH = Math.round(560 / zoomLevel);
  const centerX = 500;
  const centerY = 280;
  const minX = Math.round(centerX - viewW / 2);
  const minY = Math.round(centerY - viewH / 2);

  // Build Elevation & Pace Scrubber SVG coordinates
  const minElev = Math.min(...track.map((p) => p.elevationM));
  const maxElev = Math.max(...track.map((p) => p.elevationM), minElev + 10);
  const minPace = Math.min(...track.map((p) => p.paceSecPerKm));
  const maxPace = Math.max(...track.map((p) => p.paceSecPerKm), minPace + 20);

  const chartW = 800;
  const chartH = 110;

  const elevAreaPath =
    track
      .map((pt, i) => {
        const cx = (i / (track.length - 1)) * chartW;
        const cy =
          chartH -
          14 -
          ((pt.elevationM - minElev) / (maxElev - minElev)) * (chartH - 32);
        return `${i === 0 ? 'M' : 'L'} ${cx.toFixed(1)} ${cy.toFixed(1)}`;
      })
      .join(' ') + ` L ${chartW} ${chartH} L 0 ${chartH} Z`;

  const paceLinePath = track
    .map((pt, i) => {
      const cx = (i / (track.length - 1)) * chartW;
      // Faster pace (lower sec/km) sits higher on chart
      const cy =
        16 +
        ((pt.paceSecPerKm - minPace) / (maxPace - minPace)) * (chartH - 34);
      return `${i === 0 ? 'M' : 'L'} ${cx.toFixed(1)} ${cy.toFixed(1)}`;
    })
    .join(' ');

  const fullRouteShadowPath = track
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`)
    .join(' ');

  const handleChartMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const idx = Math.round(relX * (track.length - 1));
    setIsReplaying(false);
    setActiveIndex(idx);
  };

  return (
    <div className="rounded-3xl bg-[#0D1017] border border-white/10 overflow-hidden">
      {/* Top Map Control Bar */}
      <div className="px-4 sm:px-5 py-3.5 bg-[#121621] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#CCFF00]/15 border border-[#CCFF00]/30 flex items-center justify-center text-[#CCFF00] shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-white truncate">
              {workout.locationName}
            </div>
            <div className="text-[11px] font-mono-tabular text-zinc-400 truncate">
              {env.areaSubtitle} • {workout.coordinatesLabel}
            </div>
          </div>
        </div>

        {/* Overlay Mode Toggle & Replay */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-[#0B0D14] border border-white/10 text-[11px]">
            <button
              type="button"
              onClick={() => setOverlayMode('pace')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                overlayMode === 'pace'
                  ? 'bg-[#CCFF00] text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Gauge className="w-3 h-3" />
              Pace
            </button>
            <button
              type="button"
              onClick={() => setOverlayMode('hr')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                overlayMode === 'hr'
                  ? 'bg-[#FF4D4D] text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Heart className="w-3 h-3" />
              HR
            </button>
            <button
              type="button"
              onClick={() => setOverlayMode('elevation')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                overlayMode === 'elevation'
                  ? 'bg-sky-400 text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Mountain className="w-3 h-3" />
              Grade
            </button>
          </div>

          <button
            type="button"
            onClick={handleToggleReplay}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
              isReplaying
                ? 'bg-amber-400 text-black'
                : 'bg-white/10 hover:bg-white/15 text-white'
            }`}
          >
            {isReplaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-black" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-[#CCFF00] fill-[#CCFF00]" />
                Replay GPS
              </>
            )}
          </button>
        </div>
      </div>

      {/* Cartographic Vector Map Viewport */}
      <div className="relative w-full aspect-[16/9] bg-[#0B0E15] select-none overflow-hidden">
        <svg
          viewBox={`${minX} ${minY} ${viewW} ${viewH}`}
          className="w-full h-full block transition-all duration-300"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#081726" />
              <stop offset="100%" stopColor="#0C2136" />
            </linearGradient>
            <linearGradient id="parkGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0E211A" />
              <stop offset="100%" stopColor="#122B21" />
            </linearGradient>
          </defs>

          {/* Land Base */}
          <rect x="0" y="0" width="1000" height="560" fill="#0D1018" />

          {/* Park Reserves */}
          {env.parkPaths.map((d, i) => (
            <path
              key={`park-${i}`}
              d={d}
              fill="url(#parkGrad)"
              stroke="#1A3B2D"
              strokeWidth="1.5"
            />
          ))}

          {/* Water Bodies & Bay Coastline */}
          {env.waterPaths.map((d, i) => (
            <path
              key={`water-${i}`}
              d={d}
              fill="url(#waterGrad)"
              stroke="#1B4366"
              strokeWidth="2"
            />
          ))}

          {/* Minor Urban Streets & Park Trails */}
          {env.minorStreetPaths.map((d, i) => (
            <path
              key={`minor-${i}`}
              d={d}
              fill="none"
              stroke="#181E2C"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          ))}

          {/* Major Arterial Roads, Bridges & Piers */}
          {env.majorRoadPaths.map((d, i) => (
            <path
              key={`major-${i}`}
              d={d}
              fill="none"
              stroke="#242C3F"
              strokeWidth="5"
              strokeLinecap="round"
            />
          ))}

          {/* Cartographic Landmark Labels */}
          {env.landmarks.map((lm, i) => (
            <text
              key={`lm-${i}`}
              x={lm.x}
              y={lm.y}
              textAnchor="middle"
              className="pointer-events-none"
              fill={
                lm.type === 'water'
                  ? '#2B5B84'
                  : lm.type === 'park'
                  ? '#2E6B52'
                  : '#64748B'
              }
              fontSize={lm.type === 'water' ? '12' : '11'}
              fontWeight="700"
              letterSpacing={lm.type === 'water' ? '2.5' : '0.6'}
            >
              {lm.label}
            </text>
          ))}

          {/* Route Outer Casing Shadow */}
          <path
            d={fullRouteShadowPath}
            fill="none"
            stroke="#05070B"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />

          {/* Multi-Segment Color-Coded GPS Track */}
          {track.slice(0, -1).map((pt, idx) => {
            const nextPt = track[idx + 1];
            const segColor = getSegmentColor(idx);
            const isTraversed = idx <= activeIndex;
            return (
              <line
                key={`seg-${idx}`}
                x1={pt.x}
                y1={pt.y}
                x2={nextPt.x}
                y2={nextPt.y}
                stroke={segColor}
                strokeWidth={isTraversed ? 5.5 : 3.8}
                strokeOpacity={isTraversed ? 1 : 0.42}
                strokeLinecap="round"
              />
            );
          })}

          {/* Kilometer Split Markers along GPS Route */}
          {workout.splits.map((sp) => {
            const isSelected = selectedKmSplit === sp.km;
            return (
              <g
                key={`km-${sp.km}`}
                transform={`translate(${sp.x}, ${sp.y})`}
                className="cursor-pointer"
                onClick={() => {
                  onSelectKmSplit?.(isSelected ? null : sp.km);
                  const matchIdx = track.findIndex(
                    (p) => p.distanceKm >= sp.km
                  );
                  if (matchIdx >= 0) setActiveIndex(matchIdx);
                }}
              >
                <circle
                  r={isSelected ? 13 : 9.5}
                  fill={isSelected ? '#CCFF00' : '#111520'}
                  stroke={isSelected ? '#000000' : '#FFFFFF'}
                  strokeWidth="2"
                />
                <text
                  y="3.5"
                  textAnchor="middle"
                  fill={isSelected ? '#000000' : '#FFFFFF'}
                  fontSize="9.5"
                  fontWeight="800"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {sp.km}
                </text>
              </g>
            );
          })}

          {/* Start Pin */}
          <g transform={`translate(${startPoint.x}, ${startPoint.y})`}>
            <circle r="11" fill="#10B981" stroke="#06281E" strokeWidth="2.5" />
            <text
              y="3.5"
              textAnchor="middle"
              fill="#000000"
              fontSize="9.5"
              fontWeight="900"
            >
              S
            </text>
          </g>

          {/* Finish Pin */}
          <g transform={`translate(${endPoint.x + 12}, ${endPoint.y - 10})`}>
            <circle r="11" fill="#FF4D4D" stroke="#2D0A0A" strokeWidth="2.5" />
            <text
              y="3.5"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="9.5"
              fontWeight="900"
            >
              F
            </text>
          </g>

          {/* Active Live Runner Telemetry Beacon */}
          {activePoint && (
            <g transform={`translate(${activePoint.x}, ${activePoint.y})`}>
              <circle
                r="18"
                fill="#CCFF00"
                fillOpacity="0.22"
              />
              <circle
                r="8.5"
                fill="#CCFF00"
                stroke="#090A0D"
                strokeWidth="3"
              />
            </g>
          )}
        </svg>

        {/* Live Telemetry Point-in-Time Floating HUD */}
        {activePoint && (
          <div className="absolute top-3 left-3 bg-[#0B0E16]/90 backdrop-blur-md border border-white/10 rounded-2xl px-3.5 py-2.5 shadow-xl">
            <div className="flex items-center gap-3 text-xs font-mono-tabular">
              <div>
                <span className="text-[9px] uppercase text-zinc-400 block">
                  Dist
                </span>
                <span className="font-black text-white">
                  {activePoint.distanceKm.toFixed(2)} km
                </span>
              </div>
              <div className="h-6 w-px bg-white/10" />
              <div>
                <span className="text-[9px] uppercase text-zinc-400 block">
                  Split Pace
                </span>
                <span className="font-black text-[#CCFF00]">
                  {formatSecondsToPace(activePoint.paceSecPerKm)}/km
                </span>
              </div>
              <div className="h-6 w-px bg-white/10" />
              <div>
                <span className="text-[9px] uppercase text-zinc-400 block">
                  Heart Rate
                </span>
                <span className="font-black text-[#FF4D4D]">
                  {activePoint.heartRateBpm} bpm
                </span>
              </div>
              {!compact && (
                <>
                  <div className="h-6 w-px bg-white/10 hidden sm:block" />
                  <div className="hidden sm:block">
                    <span className="text-[9px] uppercase text-zinc-400 block">
                      Elev / Cad
                    </span>
                    <span className="font-bold text-sky-300">
                      {activePoint.elevationM}m • {activePoint.cadenceSpm} spm
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Map Zoom Controls (Top Right) */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(1.8, Number((z + 0.25).toFixed(2))))}
            className="w-8 h-8 rounded-xl bg-[#0B0E16]/90 hover:bg-[#171C2B] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(1, Number((z - 0.25).toFixed(2))))}
            className="w-8 h-8 rounded-xl bg-[#0B0E16]/90 hover:bg-[#171C2B] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          {zoomLevel > 1 && (
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="w-8 h-8 rounded-xl bg-[#0B0E16]/90 hover:bg-[#171C2B] border border-white/10 flex items-center justify-center text-[#CCFF00] transition cursor-pointer"
              title="Reset Map Bounds"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Legend & Scale Bar (Bottom Left & Right) */}
        <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-none">
          <div className="bg-[#0B0E16]/90 backdrop-blur-md border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-3 text-[10px] font-bold">
            {overlayMode === 'pace' && (
              <>
                <span className="flex items-center gap-1 text-[#CCFF00]">
                  <span className="w-2 h-2 rounded-full bg-[#CCFF00]" />
                  Fast Surge
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Target Zone
                </span>
                <span className="flex items-center gap-1 text-sky-400">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  Warm/Easy
                </span>
              </>
            )}
            {overlayMode === 'hr' && (
              <>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Zone 2–3
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Threshold Z4
                </span>
                <span className="flex items-center gap-1 text-[#FF4D4D]">
                  <span className="w-2 h-2 rounded-full bg-[#FF4D4D]" />
                  VO2 Peak Z5
                </span>
              </>
            )}
            {overlayMode === 'elevation' && (
              <>
                <span className="flex items-center gap-1 text-sky-400">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  Flat / Descent
                </span>
                <span className="flex items-center gap-1 text-[#CCFF00]">
                  <span className="w-2 h-2 rounded-full bg-[#CCFF00]" />
                  Rolling
                </span>
                <span className="flex items-center gap-1 text-[#FF4D4D]">
                  <span className="w-2 h-2 rounded-full bg-[#FF4D4D]" />
                  Climb
                </span>
              </>
            )}
          </div>

          <div className="bg-[#0B0E16]/90 backdrop-blur-md border border-white/10 rounded-xl px-2.5 py-1 flex items-center gap-2 text-[10px] font-mono-tabular text-zinc-300">
            <Compass className="w-3 h-3 text-[#CCFF00]" />
            <span>{env.scaleLabel}</span>
            <span className="w-8 h-1 border-b border-x border-zinc-400 inline-block" />
          </div>
        </div>
      </div>

      {/* Synchronized Elevation & Pace Scrubbing Profile */}
      {!compact && (
        <div className="px-5 py-4 bg-[#111520] border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold uppercase tracking-wider text-zinc-400">
              Interactive Route Telemetry • Hover or drag to scrub runner position on map
            </span>
            <div className="flex items-center gap-3 font-mono-tabular text-xs">
              <span className="text-[#CCFF00] font-bold">— Pace Stream</span>
              <span className="text-sky-400 font-bold">■ Elevation ({Math.round(minElev)}–{Math.round(maxElev)}m)</span>
            </div>
          </div>

          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="w-full h-24 cursor-crosshair block"
            preserveAspectRatio="none"
            onMouseMove={handleChartMouseMove}
          >
            <defs>
              <linearGradient id="elevFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Elevation Profile Area */}
            <path
              d={elevAreaPath}
              fill="url(#elevFill)"
              stroke="#38BDF8"
              strokeWidth="1.5"
            />

            {/* Pace Stream Line */}
            <path
              d={paceLinePath}
              fill="none"
              stroke="#CCFF00"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />

            {/* Active Scrubber Cursor Line */}
            <line
              x1={(activeIndex / (track.length - 1)) * chartW}
              y1={0}
              x2={(activeIndex / (track.length - 1)) * chartW}
              y2={chartH}
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          </svg>

          <div className="flex justify-between text-[10px] font-mono-tabular text-zinc-500">
            <span>0.0 km (Start)</span>
            <span>{(workout.distanceKm * 0.5).toFixed(1)} km (Midpoint)</span>
            <span>{workout.distanceKm.toFixed(1)} km (Finish)</span>
          </div>
        </div>
      )}
    </div>
  );
};

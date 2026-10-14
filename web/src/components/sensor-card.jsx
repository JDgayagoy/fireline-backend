'use client';

import React from 'react';
import { getSensorZone } from '@/lib/zones';
import { Clock, TrendingUp } from 'lucide-react';

export default function SensorCard({
  title,
  icon: Icon,
  value,
  unit,
  watchThreshold,
  dangerThreshold,
  history = [],
  isStale = false,
  description
}) {
  const sensorZone = getSensorZone(value, watchThreshold, dangerThreshold, isStale);

  // Generate SVG points for mini-sparkline
  const sparklinePoints = React.useMemo(() => {
    if (!history || history.length < 2) return '';
    const vals = history.slice(-15).map(v => Number(v) || 0);
    const min = Math.min(...vals, 0);
    const max = Math.max(...vals, dangerThreshold || 100);
    const range = max - min || 1;
    const width = 120;
    const height = 30;

    return vals.map((val, idx) => {
      const x = (idx / (vals.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [history, dangerThreshold]);

  const badgeColorMap = {
    safe: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    watch: 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-semibold',
    danger: 'bg-red-500 text-white border-red-600 font-bold',
    offline: 'bg-zinc-800 text-zinc-400 border-zinc-700'
  };

  return (
    <div className={`rounded-lg border bg-zinc-900/60 p-4 md:p-6 transition-all duration-200 relative overflow-hidden ${
      isStale ? 'opacity-65 border-zinc-800' : 
      sensorZone.zone === 'danger' ? 'border-red-600/80 shadow-lg shadow-red-950/20' : 
      sensorZone.zone === 'watch' ? 'border-amber-500/60' : 'border-zinc-800'
    }`}>
      {/* Top Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${
            sensorZone.zone === 'danger' ? 'bg-red-500/20 text-red-400' :
            sensorZone.zone === 'watch' ? 'bg-amber-500/20 text-amber-400' :
            'bg-zinc-800 text-zinc-300'
          }`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium text-zinc-300">{title}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {isStale && <Clock className="w-3.5 h-3.5 text-zinc-400" />}
          <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeColorMap[sensorZone.zone]}`}>
            {sensorZone.label}
          </span>
        </div>
      </div>

      {/* Big Value Reading & Sparkline */}
      <div className="flex items-baseline justify-between mt-3 mb-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl md:text-5xl font-semibold tabular-nums text-zinc-100 tracking-tight">
            {isStale ? '--' : (value !== undefined && value !== null ? value : '--')}
          </span>
          <span className="text-sm font-medium text-zinc-400">{unit}</span>
        </div>

        {/* Sparkline */}
        {sparklinePoints && !isStale && (
          <div className="w-[120px] h-[30px] shrink-0">
            <svg viewBox="0 0 120 30" className="w-full h-full overflow-visible">
              <polyline
                fill="none"
                stroke={sensorZone.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={sparklinePoints}
              />
            </svg>
          </div>
        )}
      </div>

      {/* Progress Bar relative to Watch & Danger limits */}
      <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden relative mt-2">
        <div
          className="h-full transition-all duration-300 rounded-full"
          style={{
            width: `${Math.min(100, sensorZone.progressPercent)}%`,
            backgroundColor: sensorZone.color
          }}
        />
      </div>

      {/* Threshold Guide */}
      <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2 font-mono">
        <span>Watch: {watchThreshold}{unit}</span>
        <span>Danger: {dangerThreshold}{unit}</span>
      </div>

      {description && (
        <p className="text-xs text-zinc-400/90 mt-2.5 pt-2 border-t border-zinc-800/80">
          {description}
        </p>
      )}
    </div>
  );
}

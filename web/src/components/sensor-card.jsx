'use client';

import React from 'react';
import { getSensorZone } from '@/lib/zones';
import { Clock } from 'lucide-react';

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
    safe: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    watch: 'bg-amber-50 text-amber-600 border-amber-200 font-semibold',
    danger: 'bg-red-500 text-white border-red-600 font-bold',
    offline: 'bg-zinc-100 text-zinc-500 border-zinc-200'
  };

  return (
    <div className={`rounded-[28px] bg-white border p-4 sm:p-5 md:p-6 shadow-smart-card hover:shadow-md transition-all duration-300 relative flex flex-col justify-between ${
      isStale ? 'opacity-65 border-zinc-200' : 
      sensorZone.zone === 'danger' ? 'border-red-400/80 ring-2 ring-red-400/30' : 
      sensorZone.zone === 'watch' ? 'border-amber-400/80' : 'border-zinc-200/80'
    }`}>
      <div>
        {/* Top Header: Circular Icon + Connectivity Symbol */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-zinc-100 text-zinc-800 flex items-center justify-center shadow-sm">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-800" />
          </div>
          <div className="flex items-center gap-1 text-zinc-400">
            {isStale && <Clock className="w-3 h-3 text-zinc-400" />}
            <span className={`text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-0.5 rounded-full border ${badgeColorMap[sensorZone.zone]}`}>
              {sensorZone.label}
            </span>
          </div>
        </div>

        {/* Middle: Title & Subtitle */}
        <div className="mb-3 sm:mb-4">
          <h3 className="text-sm sm:text-base font-bold text-zinc-900 tracking-tight truncate">
            {title}
          </h3>
          <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 truncate">
            {description || 'Continuous environmental telemetry'}
          </p>
        </div>

        {/* Big Value Reading & Sparkline */}
        <div className="flex items-baseline justify-between mt-1 sm:mt-2 mb-2 sm:mb-3">
          <div className="flex items-baseline gap-0.5 sm:gap-1">
            <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold tabular-nums text-zinc-950 tracking-tight">
              {isStale ? '--' : (value !== undefined && value !== null ? value : '--')}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-zinc-400 uppercase">{unit}</span>
          </div>

          {/* Sparkline */}
          {sparklinePoints && !isStale && (
            <div className="w-[60px] sm:w-[85px] h-[22px] sm:h-[26px] shrink-0 opacity-80">
              <svg viewBox="0 0 120 30" className="w-full h-full overflow-visible">
                <polyline
                  fill="none"
                  stroke={sensorZone.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={sparklinePoints}
                />
              </svg>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-zinc-100 overflow-hidden relative">
          <div
            className="h-full transition-all duration-300 rounded-full"
            style={{
              width: `${Math.min(100, sensorZone.progressPercent)}%`,
              backgroundColor: sensorZone.color
            }}
          />
        </div>
      </div>
    </div>
  );
}

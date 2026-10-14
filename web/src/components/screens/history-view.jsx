'use client';

import React, { useState, useMemo } from 'react';
import { Download, Flame, Wind, Thermometer, Layers, Calendar } from 'lucide-react';

export default function HistoryView({ readings = [], config = {} }) {
  const [timeframe, setTimeframe] = useState('hourly'); // 'hourly' | 'daily' | 'weekly'
  const [sensorFilter, setSensorFilter] = useState('all'); // 'all' | 'gas' | 'smoke' | 'temp'

  // Filter and downsample readings based on timeframe
  const chartData = useMemo(() => {
    if (!readings || readings.length === 0) return [];

    let count = 30;
    if (timeframe === 'daily') count = 60;
    if (timeframe === 'weekly') count = 100;

    return [...readings].slice(0, count).reverse().map((r, i) => ({
      index: i,
      time: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      gas: Number(r.gas_ppm),
      smoke: Number(r.smoke_level),
      temp: Number(r.temperature)
    }));
  }, [readings, timeframe]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!readings || readings.length === 0) return;
    const headers = ['Timestamp', 'Gas (PPM)', 'Smoke Index', 'Temperature (°C)', 'RSSI (dBm)', 'Uptime (s)'];
    const rows = readings.map(r => [
      new Date(r.created_at).toISOString(),
      r.gas_ppm,
      r.smoke_level,
      r.temperature,
      r.rssi,
      r.uptime
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sensor_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // SVG Chart Dimensions
  const svgWidth = 800;
  const svgHeight = 260;
  const padding = { top: 20, right: 30, bottom: 30, left: 45 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  // Max scale calculation
  const maxGasVal = Math.max(...chartData.map(d => d.gas), config.gas_danger_threshold || 300, 400);

  // Generate SVG polyline points
  const generatePoints = (key, maxVal) => {
    if (chartData.length < 2) return '';
    return chartData.map((d, i) => {
      const x = padding.left + (i / (chartData.length - 1)) * graphWidth;
      const y = padding.top + graphHeight - ((d[key] || 0) / maxVal) * graphHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  };

  const gasPoints = generatePoints('gas', maxGasVal);
  const smokePoints = generatePoints('smoke', maxGasVal);
  const tempPoints = generatePoints('temp', 100);

  // Threshold Y positions
  const gasWatchY = padding.top + graphHeight - ((config.gas_watch_threshold || 150) / maxGasVal) * graphHeight;
  const gasDangerY = padding.top + graphHeight - ((config.gas_danger_threshold || 300) / maxGasVal) * graphHeight;

  return (
    <div className="space-y-6">
      {/* Top Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Telemetry History & Analytics</h2>
          <p className="text-xs text-zinc-400">High-resolution sensor logs with threshold reference baselines</p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="h-10 px-4 rounded-md font-medium text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center justify-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4 text-zinc-400" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-lg bg-zinc-900/80 border border-zinc-800">
        {/* Timeframe Tabs */}
        <div className="flex rounded-md bg-zinc-950 p-1 border border-zinc-800/80">
          {['hourly', 'daily', 'weekly'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTimeframe(t)}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded text-xs font-medium capitalize transition-all ${
                timeframe === t 
                  ? 'bg-zinc-800 text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Sensor Toggle Group */}
        <div className="flex rounded-md bg-zinc-950 p-1 border border-zinc-800/80">
          {[
            { id: 'all', label: 'All', icon: Layers },
            { id: 'gas', label: 'Gas', icon: Flame },
            { id: 'smoke', label: 'Smoke', icon: Wind },
            { id: 'temp', label: 'Temp', icon: Thermometer },
          ].map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSensorFilter(s.id)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  sensorFilter === s.id 
                    ? 'bg-zinc-800 text-white shadow-sm' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Time-Series Chart */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 text-xs">
            {(sensorFilter === 'all' || sensorFilter === 'gas') && (
              <div className="flex items-center gap-1.5 font-medium text-red-400">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                <span>Gas (PPM)</span>
              </div>
            )}
            {(sensorFilter === 'all' || sensorFilter === 'smoke') && (
              <div className="flex items-center gap-1.5 font-medium text-amber-400">
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                <span>Smoke Index</span>
              </div>
            )}
            {(sensorFilter === 'all' || sensorFilter === 'temp') && (
              <div className="flex items-center gap-1.5 font-medium text-sky-400">
                <span className="w-3 h-3 rounded-full bg-sky-400 inline-block" />
                <span>Temp (°C)</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-mono hidden sm:flex">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-red-500 inline-block" /> Danger Threshold
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-amber-500 inline-block" /> Watch Threshold
            </span>
          </div>
        </div>

        {/* SVG Visualization */}
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full min-w-[550px] h-[260px]">
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = padding.top + graphHeight * pct;
              return (
                <line
                  key={i}
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="#27272a"
                  strokeWidth="1"
                />
              );
            })}

            {/* Threshold Reference Lines */}
            {(sensorFilter === 'all' || sensorFilter === 'gas') && (
              <>
                {/* Danger Reference Line */}
                <line
                  x1={padding.left}
                  y1={gasDangerY}
                  x2={svgWidth - padding.right}
                  y2={gasDangerY}
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text x={svgWidth - padding.right} y={gasDangerY - 4} fill="#ef4444" fontSize="10" textAnchor="end" className="font-mono">
                  Gas Danger ({config.gas_danger_threshold} PPM)
                </text>

                {/* Watch Reference Line */}
                <line
                  x1={padding.left}
                  y1={gasWatchY}
                  x2={svgWidth - padding.right}
                  y2={gasWatchY}
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text x={svgWidth - padding.right} y={gasWatchY - 4} fill="#f59e0b" fontSize="10" textAnchor="end" className="font-mono">
                  Gas Watch ({config.gas_watch_threshold} PPM)
                </text>
              </>
            )}

            {/* Data Paths */}
            {(sensorFilter === 'all' || sensorFilter === 'smoke') && smokePoints && (
              <polyline
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                points={smokePoints}
              />
            )}
            {(sensorFilter === 'all' || sensorFilter === 'temp') && tempPoints && (
              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                points={tempPoints}
              />
            )}
            {(sensorFilter === 'all' || sensorFilter === 'gas') && gasPoints && (
              <polyline
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                points={gasPoints}
              />
            )}

            {/* Time labels on X Axis */}
            {chartData.length > 0 && (
              <>
                <text x={padding.left} y={svgHeight - 10} fill="#71717a" fontSize="11" className="font-mono">
                  {chartData[0].time}
                </text>
                <text x={svgWidth - padding.right} y={svgHeight - 10} fill="#71717a" fontSize="11" textAnchor="end" className="font-mono">
                  {chartData[chartData.length - 1].time}
                </text>
              </>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}

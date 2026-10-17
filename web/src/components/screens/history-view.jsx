'use client';

import React, { useState, useMemo } from 'react';
import { Download, Flame, Wind, Thermometer, Droplets, Layers } from 'lucide-react';

export default function HistoryView({ readings = [], config = {} }) {
  const [timeframe, setTimeframe] = useState('hourly'); // 'hourly' | 'daily' | 'weekly'
  const [sensorFilter, setSensorFilter] = useState('all'); // 'all' | 'gas' | 'smoke' | 'temp' | 'humidity'

  // Filter and downsample readings based on timeframe
  const chartData = useMemo(() => {
    if (!readings || readings.length === 0) return [];

    let count = 30;
    if (timeframe === 'daily') count = 60;
    if (timeframe === 'weekly') count = 100;

    return [...readings].slice(0, count).reverse().map((r, i) => ({
      index: i,
      time: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      gas: Number(r.gas_ppm || 0),
      smoke: Number(r.smoke_level || 0),
      temp: Number(r.temperature || 0),
      humidity: Number(r.humidity !== undefined ? r.humidity : 55)
    }));
  }, [readings, timeframe]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!readings || readings.length === 0) return;
    const headers = ['Timestamp', 'MQ-2 Gas (PPM)', 'MQ-2 Smoke (PPM)', 'DHT11 Temp (°C)', 'DHT11 Humidity (% RH)', 'RSSI (dBm)', 'Uptime (s)'];
    const rows = readings.map(r => [
      new Date(r.created_at).toISOString(),
      r.gas_ppm,
      r.smoke_level,
      r.temperature,
      r.humidity !== undefined ? r.humidity : 55,
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
  const padding = { top: 25, right: 30, bottom: 35, left: 45 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  // Max scale calculation
  const maxGasVal = Math.max(...chartData.map(d => Math.max(d.gas, d.smoke)), config.gas_danger_threshold || 300, 400);

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
  const humidityPoints = generatePoints('humidity', 100);

  // Threshold Y positions
  const gasWatchY = padding.top + graphHeight - ((config.gas_watch_threshold || 150) / maxGasVal) * graphHeight;
  const gasDangerY = padding.top + graphHeight - ((config.gas_danger_threshold || 300) / maxGasVal) * graphHeight;
  const smokeDangerY = padding.top + graphHeight - ((config.smoke_danger_threshold || 250) / maxGasVal) * graphHeight;
  const tempDangerY = padding.top + graphHeight - ((config.temp_danger_threshold || 60) / 100) * graphHeight;

  return (
    <div className="space-y-6">
      {/* Top Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-950">Sensor History & Analytics</h2>
          <p className="text-xs text-zinc-400">MQ-2 (Gas, Smoke) and DHT11 (Temp, Humidity) telemetry logs</p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="h-10 px-4 rounded-full font-bold text-xs bg-zinc-950 hover:bg-zinc-800 text-white shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4 text-zinc-300" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-2xl bg-white border border-zinc-200/80 shadow-sm">
        {/* Timeframe Tabs */}
        <div className="flex rounded-xl bg-zinc-100 p-1 border border-zinc-200/60">
          {['hourly', 'daily', 'weekly'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTimeframe(t)}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                timeframe === t 
                  ? 'bg-zinc-950 text-white shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Sensor Toggle Group */}
        <div className="flex rounded-xl bg-zinc-100 p-1 border border-zinc-200/60 overflow-x-auto">
          {[
            { id: 'all', label: 'All Sensors', icon: Layers },
            { id: 'gas', label: 'MQ-2 Gas', icon: Flame },
            { id: 'smoke', label: 'MQ-2 Smoke', icon: Wind },
            { id: 'temp', label: 'DHT11 Temp', icon: Thermometer },
            { id: 'humidity', label: 'DHT11 Humidity', icon: Droplets },
          ].map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSensorFilter(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  sensorFilter === s.id 
                    ? 'bg-zinc-950 text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${sensorFilter === s.id ? 'text-[#c8ff00]' : ''}`} />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Time-Series Chart */}
      <div className="rounded-[28px] border border-zinc-200/80 bg-white p-5 md:p-6 shadow-smart-card">
        <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {(sensorFilter === 'all' || sensorFilter === 'gas') && (
              <div className="flex items-center gap-1.5 font-bold text-red-500">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                <span>MQ-2 Gas (PPM)</span>
              </div>
            )}
            {(sensorFilter === 'all' || sensorFilter === 'smoke') && (
              <div className="flex items-center gap-1.5 font-bold text-amber-500">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                <span>MQ-2 Smoke (PPM)</span>
              </div>
            )}
            {(sensorFilter === 'all' || sensorFilter === 'temp') && (
              <div className="flex items-center gap-1.5 font-bold text-sky-500">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                <span>DHT11 Temp (°C)</span>
              </div>
            )}
            {(sensorFilter === 'all' || sensorFilter === 'humidity') && (
              <div className="flex items-center gap-1.5 font-bold text-purple-600">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                <span>DHT11 Humidity (% RH)</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-red-500 inline-block" /> Danger Limit
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-amber-500 inline-block" /> Watch Limit
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
                  stroke="#f1f3f5"
                  strokeWidth="1.5"
                />
              );
            })}

            {/* Threshold Reference Lines for Gas */}
            {(sensorFilter === 'all' || sensorFilter === 'gas') && (
              <>
                <line
                  x1={padding.left}
                  y1={gasDangerY}
                  x2={svgWidth - padding.right}
                  y2={gasDangerY}
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text x={svgWidth - padding.right} y={gasDangerY - 4} fill="#ef4444" fontSize="10" textAnchor="end" className="font-mono font-bold">
                  Gas Danger ({config.gas_danger_threshold || 300} PPM)
                </text>

                <line
                  x1={padding.left}
                  y1={gasWatchY}
                  x2={svgWidth - padding.right}
                  y2={gasWatchY}
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text x={svgWidth - padding.right} y={gasWatchY - 4} fill="#f59e0b" fontSize="10" textAnchor="end" className="font-mono font-bold">
                  Gas Watch ({config.gas_watch_threshold || 150} PPM)
                </text>
              </>
            )}

            {/* Threshold Reference Lines for Smoke */}
            {sensorFilter === 'smoke' && (
              <>
                <line
                  x1={padding.left}
                  y1={smokeDangerY}
                  x2={svgWidth - padding.right}
                  y2={smokeDangerY}
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text x={svgWidth - padding.right} y={smokeDangerY - 4} fill="#ef4444" fontSize="10" textAnchor="end" className="font-mono font-bold">
                  Smoke Danger ({config.smoke_danger_threshold || 250} PPM)
                </text>
              </>
            )}

            {/* Threshold Reference Lines for Temp */}
            {sensorFilter === 'temp' && (
              <>
                <line
                  x1={padding.left}
                  y1={tempDangerY}
                  x2={svgWidth - padding.right}
                  y2={tempDangerY}
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text x={svgWidth - padding.right} y={tempDangerY - 4} fill="#ef4444" fontSize="10" textAnchor="end" className="font-mono font-bold">
                  Temp Danger ({config.temp_danger_threshold || 60}°C)
                </text>
              </>
            )}

            {/* Data Paths */}
            {(sensorFilter === 'all' || sensorFilter === 'humidity') && humidityPoints && (
              <polyline
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={humidityPoints}
              />
            )}
            {(sensorFilter === 'all' || sensorFilter === 'smoke') && smokePoints && (
              <polyline
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={smokePoints}
              />
            )}
            {(sensorFilter === 'all' || sensorFilter === 'temp') && tempPoints && (
              <polyline
                fill="none"
                stroke="#0ea5e9"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={tempPoints}
              />
            )}
            {(sensorFilter === 'all' || sensorFilter === 'gas') && gasPoints && (
              <polyline
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={gasPoints}
              />
            )}

            {/* Time labels on X Axis */}
            {chartData.length > 0 && (
              <>
                <text x={padding.left} y={svgHeight - 10} fill="#9ca3af" fontSize="11" className="font-mono font-medium">
                  {chartData[0].time}
                </text>
                <text x={svgWidth - padding.right} y={svgHeight - 10} fill="#9ca3af" fontSize="11" textAnchor="end" className="font-mono font-medium">
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

'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, TriangleAlert, Flame, WifiOff, CheckCircle2, AlertOctagon, HelpCircle } from 'lucide-react';
import { getOverallZone } from '@/lib/zones';

export default function StatusBanner({
  isDeviceOnline,
  secondsSinceLastReading,
  latestReading,
  config,
  activeAlert,
  onAcknowledge,
  onShutoffClick,
  onMarkFalseAlarm
}) {
  const [countdownSeconds, setCountdownSeconds] = useState(null);

  const overall = getOverallZone({
    isDeviceOnline,
    secondsSinceLastReading,
    offlineTimeoutSeconds: config?.offline_timeout_seconds || 60,
    gasPPM: latestReading?.gas_ppm,
    temperature: latestReading?.temperature,
    smokeLevel: latestReading?.smoke_level,
    config
  });

  // Calculate escalation countdown if active unacknowledged danger alert exists
  useEffect(() => {
    if (activeAlert && activeAlert.status === 'active' && activeAlert.level === 'danger') {
      const ackTimeout = config?.ack_timeout_seconds || 120;
      const createdTime = new Date(activeAlert.created_at).getTime();

      const timer = setInterval(() => {
        const elapsed = Math.round((Date.now() - createdTime) / 1000);
        const remaining = Math.max(0, ackTimeout - elapsed);
        setCountdownSeconds(remaining);
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setCountdownSeconds(null);
    }
  }, [activeAlert, config]);

  const formatCountdown = (secs) => {
    if (secs === null) return '';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 1. DANGER STATE
  if (overall.zone === 'danger' || (activeAlert && activeAlert.level === 'danger' && activeAlert.status === 'active')) {
    const triggerMsg = activeAlert?.message || overall.message;

    return (
      <div 
        role="alert" 
        className="w-full rounded-lg border-2 border-red-600 bg-red-950/40 p-4 md:p-5 text-red-100 shadow-xl animate-danger-pulse mb-6"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-full bg-red-600 text-white shrink-0 mt-0.5">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-bold tracking-wider uppercase bg-red-600 text-white">
                  Danger State
                </span>
                {countdownSeconds !== null && countdownSeconds > 0 && (
                  <span className="text-xs text-red-300 font-mono">
                    Escalates to SMS in {formatCountdown(countdownSeconds)}
                  </span>
                )}
                {countdownSeconds === 0 && (
                  <span className="text-xs text-red-300 font-semibold">
                    Escalated to SMS Contacts
                  </span>
                )}
              </div>
              <h2 className="text-lg md:text-xl font-bold mt-1 text-red-200">
                {triggerMsg}
              </h2>
              <p className="text-sm text-red-300/90 mt-0.5">
                Immediate action required: Ventilate area, confirm valve closure, and evacuate if necessary.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-stretch md:self-auto">
            {activeAlert && activeAlert.status === 'active' && (
              <button
                type="button"
                onClick={() => onAcknowledge(activeAlert.id)}
                className="flex-1 md:flex-initial h-11 px-5 rounded-md font-semibold bg-zinc-100 hover:bg-white text-zinc-950 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Acknowledge Alert
              </button>
            )}
            <button
              type="button"
              onClick={onShutoffClick}
              className="flex-1 md:flex-initial h-11 px-5 rounded-md font-semibold bg-red-600 hover:bg-red-700 text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
            >
              <AlertOctagon className="w-4 h-4" />
              Shut Off Gas
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. WATCH STATE
  if (overall.zone === 'watch' || (activeAlert && activeAlert.level === 'watch' && activeAlert.status === 'active')) {
    const triggerMsg = activeAlert?.message || overall.message;

    return (
      <div 
        role="alert" 
        className="w-full rounded-lg border border-amber-500/50 bg-amber-950/30 p-4 text-amber-100 shadow-md mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-amber-500 text-zinc-950 shrink-0 mt-0.5">
              <TriangleAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-bold tracking-wide uppercase bg-amber-500 text-zinc-950">
                  Watch
                </span>
                <span className="text-xs text-amber-300">Monitored Threshold Exceeded</span>
              </div>
              <h3 className="text-base font-semibold mt-1 text-amber-200">
                {triggerMsg}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeAlert && (
              <button
                type="button"
                onClick={() => onAcknowledge(activeAlert.id)}
                className="h-10 px-4 rounded-md font-medium bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-all text-xs"
              >
                Acknowledge
              </button>
            )}
            {activeAlert && (
              <button
                type="button"
                onClick={() => onMarkFalseAlarm(activeAlert.id)}
                className="h-10 px-3 rounded-md font-medium bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 transition-all text-xs flex items-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                False Alarm?
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. OFFLINE STATE
  if (overall.zone === 'offline') {
    return (
      <div 
        role="status" 
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-zinc-200 shadow-sm mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-zinc-800 text-zinc-400 shrink-0">
            <WifiOff className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-medium uppercase bg-zinc-800 text-zinc-400 border border-zinc-700">
                Device Offline
              </span>
              <span className="text-xs text-zinc-400">
                No signal received for {secondsSinceLastReading ? `${secondsSinceLastReading}s` : 'a while'}
              </span>
            </div>
            <p className="text-sm text-zinc-300 mt-1">
              {overall.message} Cached telemetry displayed. Standalone safety fail-safe remains active on hardware.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 4. SAFE STATE (Calm, low contrast per UI.MD)
  return (
    <div 
      role="status" 
      className="w-full rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3.5 md:p-4 text-emerald-100 shadow-sm mb-6 flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded-full bg-emerald-600/20 text-emerald-400 shrink-0">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <span className="text-sm font-medium text-emerald-200">
            All systems normal.
          </span>
          <span className="text-xs text-emerald-400/80 ml-2 hidden sm:inline">
            Sensors operating within safe thresholds. Updated {secondsSinceLastReading ?? 3}s ago.
          </span>
        </div>
      </div>
      <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
        Safe
      </span>
    </div>
  );
}

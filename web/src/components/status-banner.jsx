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
    humidity: latestReading?.humidity,
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
        className="w-full rounded-[24px] border-2 border-red-500 bg-red-50 p-4 md:p-5 text-red-950 shadow-xl animate-danger-pulse mb-6"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-full bg-red-600 text-white shrink-0 mt-0.5 shadow-md">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase bg-red-600 text-white">
                  Danger State
                </span>
                {countdownSeconds !== null && countdownSeconds > 0 && (
                  <span className="text-xs text-red-700 font-mono font-semibold">
                    Escalates to SMS in {formatCountdown(countdownSeconds)}
                  </span>
                )}
                {countdownSeconds === 0 && (
                  <span className="text-xs text-red-700 font-bold">
                    Escalated to SMS Contacts
                  </span>
                )}
              </div>
              <h2 className="text-lg md:text-xl font-bold mt-1 text-red-950">
                {triggerMsg}
              </h2>
              <p className="text-sm text-red-800/90 mt-0.5">
                Immediate action required: Ventilate area, confirm valve closure, and evacuate if necessary.
              </p>
            </div>
          </div>

          {activeAlert && activeAlert.status === 'active' && (
            <div className="flex items-center gap-3 shrink-0 self-stretch md:self-auto">
              <button
                type="button"
                onClick={() => onAcknowledge(activeAlert.id)}
                className="w-full md:w-auto h-11 px-5 rounded-full font-bold bg-white hover:bg-zinc-100 text-zinc-950 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 text-sm border border-zinc-200"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Acknowledge Alert
              </button>
            </div>
          )}
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
        className="w-full rounded-[24px] border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-md mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-amber-500 text-zinc-950 shrink-0 mt-0.5 shadow-sm">
              <TriangleAlert className="w-5 h-5 text-zinc-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-amber-500 text-zinc-950">
                  Watch
                </span>
                <span className="text-xs text-amber-800 font-medium">Monitored Threshold Exceeded</span>
              </div>
              <h3 className="text-base font-bold mt-1 text-amber-950">
                {triggerMsg}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeAlert && (
              <button
                type="button"
                onClick={() => onAcknowledge(activeAlert.id)}
                className="h-10 px-4 rounded-full font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-all text-xs shadow-sm"
              >
                Acknowledge
              </button>
            )}
            {activeAlert && (
              <button
                type="button"
                onClick={() => onMarkFalseAlarm(activeAlert.id)}
                className="h-10 px-3 rounded-full font-semibold bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 transition-all text-xs flex items-center gap-1.5 shadow-sm"
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
        className="w-full rounded-[24px] border border-zinc-200/80 bg-white p-4 text-zinc-800 shadow-smart-card mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-zinc-100 text-zinc-500 shrink-0">
            <WifiOff className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-zinc-100 text-zinc-600 border border-zinc-200">
                Device Offline
              </span>
              <span className="text-xs text-zinc-500">
                No signal received for {secondsSinceLastReading ? `${secondsSinceLastReading}s` : 'a while'}
              </span>
            </div>
            <p className="text-sm text-zinc-600 mt-1">
              {overall.message} Cached telemetry displayed. Standalone safety fail-safe remains active on hardware.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 4. SAFE STATE (Calm, quiet per UI.MD - hero environmental card serves as the normal state)
  return null;
}

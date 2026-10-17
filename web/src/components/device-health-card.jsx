'use client';

import React, { useState } from 'react';
import { Cpu, Signal, Clock, ChevronDown, ChevronUp, Radio, ShieldCheck } from 'lucide-react';

export default function DeviceHealthCard({ status = {}, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const formatUptime = (seconds) => {
    if (!seconds) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const getRssiQuality = (rssi) => {
    if (!rssi) return { text: 'Unknown', color: 'text-zinc-400' };
    if (rssi >= -65) return { text: 'Excellent', color: 'text-emerald-600 font-semibold' };
    if (rssi >= -75) return { text: 'Good', color: 'text-emerald-600 font-semibold' };
    if (rssi >= -85) return { text: 'Fair', color: 'text-amber-600 font-semibold' };
    return { text: 'Weak', color: 'text-red-500 font-semibold' };
  };

  const rssiInfo = getRssiQuality(status.rssi);

  return (
    <div className="rounded-[28px] border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-smart-card transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left transition-colors cursor-pointer group"
      >
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-[#c8ff00] group-hover:scale-105 flex items-center justify-center shadow-sm shrink-0 transition-all">
              <Cpu className="w-5 h-5 text-[#c8ff00]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-zinc-950 tracking-tight leading-tight">
                  Device Health & Telemetry
                </h3>
                <span className="hidden sm:inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200/60 shrink-0">
                  ESP32 MCU
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2.5 py-1 rounded-full font-mono font-bold inline-flex items-center gap-1.5 shadow-sm ${
              status.online 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' 
                : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.online ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
              {status.online ? 'Online' : 'Offline'}
            </span>
            <div className="w-8 h-8 rounded-full bg-zinc-100 group-hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors">
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {/* Subtitle / Diagnostics Scope - Full width on phone */}
        <div className="mt-2.5 sm:mt-1.5 sm:ml-[52px] flex items-center gap-2 flex-wrap">
          <span className="sm:hidden text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200/60 shrink-0">
            ESP32 MCU
          </span>
          <p className="text-xs text-zinc-400 font-medium">
            Node diagnostics, SIM800L GSM & Wi-Fi watchdog
          </p>
        </div>
      </button>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-zinc-100 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/60">
            <span className="text-zinc-400 block mb-1 font-medium text-[11px]">Wi-Fi Signal</span>
            <div className="flex items-center gap-1.5 font-mono text-zinc-900 font-bold">
              <Signal className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span>{status.rssi ? `${status.rssi} dBm` : '-62 dBm'}</span>
              <span className={`text-[10px] ${rssiInfo.color}`}>({rssiInfo.text})</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/60">
            <span className="text-zinc-400 block mb-1 font-medium text-[11px]">GSM SIM800L</span>
            <div className="flex items-center gap-1.5 font-mono text-zinc-900 font-bold">
              <Radio className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-emerald-700 font-semibold">SMS Ready</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/60">
            <span className="text-zinc-400 block mb-1 font-medium text-[11px]">Uptime & Seen</span>
            <div className="flex items-center gap-1.5 font-mono text-zinc-900 font-bold">
              <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span>{formatUptime(status.uptime)}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/60">
            <span className="text-zinc-400 block mb-1 font-medium text-[11px]">Node Firmware</span>
            <span className="font-mono text-zinc-900 font-bold block truncate">
              {status.firmware_version || 'v1.0.0-esp32'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

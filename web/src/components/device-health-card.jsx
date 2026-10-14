'use client';

import React, { useState } from 'react';
import { Cpu, Signal, Clock, ChevronDown, ChevronUp, Radio } from 'lucide-react';

export default function DeviceHealthCard({ status = {} }) {
  const [isOpen, setIsOpen] = useState(false);

  const formatUptime = (seconds) => {
    if (!seconds) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const getRssiQuality = (rssi) => {
    if (!rssi) return { text: 'Unknown', color: 'text-zinc-500' };
    if (rssi >= -65) return { text: 'Excellent', color: 'text-emerald-400' };
    if (rssi >= -75) return { text: 'Good', color: 'text-emerald-400' };
    if (rssi >= -85) return { text: 'Fair', color: 'text-amber-400' };
    return { text: 'Weak', color: 'text-red-400' };
  };

  const rssiInfo = getRssiQuality(status.rssi);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left text-sm font-medium text-zinc-300 hover:text-white transition-colors"
      >
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-zinc-400" />
          <span>Device Health & Telemetry</span>
          <span className="text-xs text-zinc-500 font-mono">({status.device_id || 'esp32_main'})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-mono">
            {status.online ? 'Connected' : 'Offline'}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="mt-4 pt-3 border-t border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded bg-zinc-950/40 border border-zinc-800/80">
            <span className="text-zinc-500 block mb-0.5">Wi-Fi Signal</span>
            <div className="flex items-center gap-1.5 font-mono text-zinc-200">
              <Signal className="w-3.5 h-3.5 text-zinc-400" />
              <span>{status.rssi ? `${status.rssi} dBm` : '--'}</span>
              <span className={`text-[10px] ${rssiInfo.color}`}>({rssiInfo.text})</span>
            </div>
          </div>

          <div className="p-2.5 rounded bg-zinc-950/40 border border-zinc-800/80">
            <span className="text-zinc-500 block mb-0.5">Device Uptime</span>
            <div className="flex items-center gap-1.5 font-mono text-zinc-200">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>{formatUptime(status.uptime)}</span>
            </div>
          </div>

          <div className="p-2.5 rounded bg-zinc-950/40 border border-zinc-800/80">
            <span className="text-zinc-500 block mb-0.5">Last Transmission</span>
            <span className="font-mono text-zinc-200">
              {status.lastSeen ? new Date(status.lastSeen).toLocaleTimeString() : 'Never'}
            </span>
          </div>

          <div className="p-2.5 rounded bg-zinc-950/40 border border-zinc-800/80">
            <span className="text-zinc-500 block mb-0.5">Firmware Version</span>
            <span className="font-mono text-zinc-200">
              {status.firmware_version || 'v1.0.0-esp32'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React from 'react';
import { Wifi, WifiOff, Clock } from 'lucide-react';

export default function ConnectionBadge({ online, secondsSinceLastReading, offlineTimeout = 60 }) {
  if (!online || (secondsSinceLastReading !== null && secondsSinceLastReading > offlineTimeout)) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-500 border border-zinc-200/80 shadow-sm">
        <WifiOff className="w-3.5 h-3.5 text-zinc-400" />
        <span>Offline</span>
        {secondsSinceLastReading !== null && (
          <span className="text-[10px] text-zinc-400 font-mono">({secondsSinceLastReading}s)</span>
        )}
      </div>
    );
  }

  if (secondsSinceLastReading !== null && secondsSinceLastReading > 10) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
        <Clock className="w-3.5 h-3.5 text-amber-500" />
        <span>Stale</span>
        <span className="text-[10px] font-mono">({secondsSinceLastReading}s)</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white text-zinc-800 border border-zinc-200/80 shadow-sm">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c8ff00] opacity-90"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <Wifi className="w-3.5 h-3.5 text-zinc-600" />
      <span>Live</span>
    </div>
  );
}

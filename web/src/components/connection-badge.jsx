'use client';

import React from 'react';
import { Wifi, WifiOff, Clock } from 'lucide-react';

export default function ConnectionBadge({ online, secondsSinceLastReading, offlineTimeout = 60 }) {
  if (!online || (secondsSinceLastReading !== null && secondsSinceLastReading > offlineTimeout)) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
        <WifiOff className="w-3.5 h-3.5 text-zinc-400" />
        <span>Offline</span>
        {secondsSinceLastReading !== null && (
          <span className="text-[10px] text-zinc-500 font-mono">({secondsSinceLastReading}s ago)</span>
        )}
      </div>
    );
  }

  if (secondsSinceLastReading !== null && secondsSinceLastReading > 10) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
        <Clock className="w-3.5 h-3.5 text-amber-400" />
        <span>Stale</span>
        <span className="text-[10px] font-mono">({secondsSinceLastReading}s)</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <Wifi className="w-3.5 h-3.5 text-emerald-400" />
      <span>Live</span>
    </div>
  );
}

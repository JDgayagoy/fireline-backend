'use client';

import React from 'react';
import { 
  Flame, 
  TriangleAlert, 
  CheckCircle2, 
  Lock, 
  Unlock, 
  WifiOff, 
  Wifi, 
  Sliders, 
  Info, 
  PhoneCall,
  Clock
} from 'lucide-react';

export default function EventRow({ event, onSelect }) {
  const getEventMeta = (type, severity) => {
    switch (type) {
      case 'danger_alert':
        return {
          icon: Flame,
          color: 'text-red-400 bg-red-500/20',
          badge: 'Danger Alert',
          badgeClass: 'bg-red-600 text-white'
        };
      case 'watch_alert':
        return {
          icon: TriangleAlert,
          color: 'text-amber-400 bg-amber-500/20',
          badge: 'Watch Alert',
          badgeClass: 'bg-amber-500 text-zinc-950 font-medium'
        };
      case 'alert_acknowledged':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-400 bg-emerald-500/20',
          badge: 'Acknowledged',
          badgeClass: 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
        };
      case 'alert_escalated':
        return {
          icon: PhoneCall,
          color: 'text-red-400 bg-red-500/20',
          badge: 'Escalated to SMS',
          badgeClass: 'bg-red-950 text-red-300 border border-red-800'
        };
      case 'valve_closed':
        return {
          icon: Lock,
          color: 'text-red-400 bg-red-500/20',
          badge: 'Valve Closed',
          badgeClass: 'bg-red-500/20 text-red-400 border border-red-500/40'
        };
      case 'valve_opened':
        return {
          icon: Unlock,
          color: 'text-emerald-400 bg-emerald-500/20',
          badge: 'Valve Opened',
          badgeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
        };
      case 'device_offline':
        return {
          icon: WifiOff,
          color: 'text-zinc-400 bg-zinc-800',
          badge: 'Device Offline',
          badgeClass: 'bg-zinc-800 text-zinc-400 border border-zinc-700'
        };
      case 'device_online':
        return {
          icon: Wifi,
          color: 'text-emerald-400 bg-emerald-500/20',
          badge: 'Device Online',
          badgeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
        };
      case 'config_updated':
        return {
          icon: Sliders,
          color: 'text-sky-400 bg-sky-500/20',
          badge: 'Config Changed',
          badgeClass: 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
        };
      default:
        return {
          icon: Info,
          color: 'text-zinc-400 bg-zinc-800',
          badge: 'System Event',
          badgeClass: 'bg-zinc-800 text-zinc-300'
        };
    }
  };

  const meta = getEventMeta(event.event_type, event.severity);
  const Icon = meta.icon;

  return (
    <div 
      onClick={() => onSelect && onSelect(event)}
      className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200/80 bg-zinc-50/60 hover:bg-zinc-100/80 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3 min-w-0 pr-3">
        <div className={`p-2.5 rounded-xl shrink-0 ${meta.color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${meta.badgeClass}`}>
              {meta.badge}
            </span>
            <span className="text-xs text-zinc-400 font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <p className="text-sm font-semibold text-zinc-800 truncate">
            {event.summary}
          </p>
        </div>
      </div>

      <div className="text-xs text-zinc-400 shrink-0 font-mono hidden sm:block">
        Actor: {event.actor || 'system'}
      </div>
    </div>
  );
}

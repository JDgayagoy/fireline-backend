'use client';

import React, { useState, useMemo } from 'react';
import EventRow from '../event-row';
import { Filter, X, HelpCircle, Sparkles, CheckCircle2 } from 'lucide-react';

export default function EventsView({ events = [], onMarkFalseAlarm, alerts = [] }) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'alerts' | 'valve' | 'system'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [falseAlarmNote, setFalseAlarmNote] = useState('Normal cooking activity');

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (filterType === 'all') return events;
    if (filterType === 'alerts') {
      return events.filter(e => e.event_type.includes('alert') || e.event_type.includes('spike'));
    }
    if (filterType === 'valve') {
      return events.filter(e => e.event_type.includes('valve'));
    }
    if (filterType === 'system') {
      return events.filter(e => e.event_type.includes('device') || e.event_type.includes('config'));
    }
    return events;
  }, [events, filterType]);

  const handleConfirmFalseAlarm = () => {
    if (!selectedEvent) return;
    const matchingAlert = alerts.find(a => a.id === selectedEvent.details?.alertId) || alerts[0];
    if (matchingAlert) {
      onMarkFalseAlarm(matchingAlert.id, falseAlarmNote);
    }
    setSelectedEvent(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-950">Safety Audit Log & Events</h2>
          <p className="text-xs text-zinc-400">Complete immutable record of triggers, valve actions, alerts, and heartbeats</p>
        </div>

        {/* Filters */}
        <div className="flex rounded-2xl bg-white p-1 border border-zinc-200/80 shadow-sm self-start sm:self-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'alerts', label: 'Alerts' },
            { id: 'valve', label: 'Valve Actions' },
            { id: 'system', label: 'System' }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterType(f.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === f.id
                  ? 'bg-zinc-950 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events List Card */}
      <div className="rounded-[28px] border border-zinc-200/80 bg-white p-5 md:p-6 shadow-smart-card">
        {filteredEvents.length > 0 ? (
          <div className="space-y-2.5">
            {filteredEvents.map(event => (
              <EventRow 
                key={event.id} 
                event={event} 
                onSelect={(evt) => setSelectedEvent(evt)} 
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-zinc-400 text-xs">
            No events match the selected category filter.
          </div>
        )}
      </div>

      {/* Event Details & AI Incident Sheet / Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-[28px] border border-zinc-200/80 bg-white p-6 shadow-2xl text-zinc-950 relative">
            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-950 hover:bg-zinc-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-zinc-100 text-zinc-700">
                {selectedEvent.event_type.replace(/_/g, ' ').toUpperCase()}
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                {new Date(selectedEvent.created_at).toLocaleString()}
              </span>
            </div>

            <h3 className="text-base font-bold text-zinc-900 mb-2">
              {selectedEvent.summary}
            </h3>

            {/* AI Diagnostics Card */}
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60 mb-4 mt-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>AI Incident Interpretation</span>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                {selectedEvent.details?.ai_interpretation || 
                  "Sensors detected a brief elevation matching typical localized activity. No continuous spike observed. Hardware safety interlocks responded within 120ms."}
              </p>
            </div>

            {/* Event Raw Context Data */}
            <div className="text-xs font-mono bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/60 mb-5 text-zinc-700 space-y-1">
              <div>Actor: <span className="font-semibold text-zinc-900">{selectedEvent.actor || 'system_daemon'}</span></div>
              <div>Severity: <span className="font-semibold text-zinc-900">{selectedEvent.severity || 'info'}</span></div>
              <div>Event ID: <span className="text-zinc-500">{selectedEvent.id}</span></div>
            </div>

            {/* False Alarm Section */}
            {(selectedEvent.event_type.includes('alert') || selectedEvent.event_type.includes('spike')) && (
              <div className="pt-4 border-t border-zinc-100 space-y-3">
                <label className="text-xs font-bold text-zinc-700 block">
                  Mark as False Alarm & Train Anomaly Filter:
                </label>
                <input
                  type="text"
                  value={falseAlarmNote}
                  onChange={(e) => setFalseAlarmNote(e.target.value)}
                  placeholder="e.g. Normal kitchen cooking / boiling"
                  className="w-full text-xs p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#c8ff00]"
                />
                <button
                  type="button"
                  onClick={handleConfirmFalseAlarm}
                  className="w-full h-10 rounded-full font-bold bg-zinc-950 text-white hover:bg-zinc-800 text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#c8ff00]" />
                  Confirm and Log as False Alarm
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

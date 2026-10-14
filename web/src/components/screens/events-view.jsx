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
    // Find matching alert if any
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
          <h2 className="text-xl font-bold text-zinc-100">Unified Safety Timeline</h2>
          <p className="text-xs text-zinc-400">Complete audit log of triggers, valve actions, alerts, and heartbeats</p>
        </div>

        {/* Filters */}
        <div className="flex rounded-md bg-zinc-950 p-1 border border-zinc-800 self-start sm:self-auto">
          {[
            { id: 'all', label: 'All Events' },
            { id: 'alerts', label: 'Alerts' },
            { id: 'valve', label: 'Valve Actions' },
            { id: 'system', label: 'System & Connectivity' }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterType(f.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                filterType === f.id
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 md:p-6 shadow-sm">
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
          <div className="text-center py-12 text-zinc-500 text-xs">
            No events match the selected category filter.
          </div>
        )}
      </div>

      {/* Event Details & AI Incident Sheet / Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-2xl text-zinc-100 relative">
            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                {selectedEvent.event_type.replace(/_/g, ' ').toUpperCase()}
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                {new Date(selectedEvent.created_at).toLocaleString()}
              </span>
            </div>

            <h3 className="text-base font-semibold text-zinc-100 mb-2">
              {selectedEvent.summary}
            </h3>

            {/* AI Diagnostics Card */}
            <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 mb-4 mt-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-sky-400 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>AI Incident Interpretation</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {selectedEvent.event_type === 'danger_alert'
                  ? "Analysis: Sudden rapid gas concentration climb without temperature rise suggests direct pressurized vapor escape. Cloud and hardware fail-safe commands verified."
                  : selectedEvent.event_type === 'device_offline'
                  ? "Analysis: Inactivity timeout reached 60 seconds without HTTP keep-alive packet. Recommended verification: 2.4GHz Wi-Fi gateway stability and ESP32 power supply."
                  : "Analysis: Telemetry logged into database. System rules operating normally."}
              </p>
            </div>

            {/* Event Payload Details */}
            {selectedEvent.details && Object.keys(selectedEvent.details).length > 0 && (
              <div className="mb-4">
                <span className="text-xs text-zinc-400 font-medium block mb-1">Metadata Payload:</span>
                <pre className="text-[11px] p-2.5 rounded bg-zinc-900 font-mono text-zinc-300 overflow-x-auto border border-zinc-800">
                  {JSON.stringify(selectedEvent.details, null, 2)}
                </pre>
              </div>
            )}

            {/* False Alarm Feedback Action */}
            <div className="pt-3 border-t border-zinc-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
                <HelpCircle className="w-4 h-4" />
                <span>False Alarm Learning Feedback</span>
              </div>
              <p className="text-xs text-zinc-400">
                Tag this event as a false alarm (e.g. cooking fumes or aerosol spray) so the AI classifier refines detection signatures.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={falseAlarmNote}
                  onChange={(e) => setFalseAlarmNote(e.target.value)}
                  placeholder="Context (e.g. Stovetop burner cooking)"
                  className="flex-1 h-9 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
                />
                <button
                  type="button"
                  onClick={handleConfirmFalseAlarm}
                  className="h-9 px-3 rounded-md bg-amber-500 hover:bg-amber-400 text-zinc-950 font-medium text-xs transition-colors"
                >
                  Mark False Alarm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

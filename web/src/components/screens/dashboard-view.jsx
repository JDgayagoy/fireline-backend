'use client';

import React from 'react';
import { Flame, Wind, Thermometer, ShieldAlert, ArrowRight } from 'lucide-react';
import StatusBanner from '../status-banner';
import SensorCard from '../sensor-card';
import ValveControlCard from '../valve-control-card';
import DeviceHealthCard from '../device-health-card';
import EventRow from '../event-row';

export default function DashboardView({
  status,
  readings,
  config,
  alerts,
  events,
  isAdmin,
  onAcknowledgeAlert,
  onShutoffGas,
  onReopenGas,
  onMarkFalseAlarm,
  onNavigateTab
}) {
  const latestReading = readings && readings.length > 0 ? readings[0] : null;
  const activeAlert = alerts?.find(a => a.status === 'active');
  const isStale = !status.online || (status.secondsSinceLastReading !== null && status.secondsSinceLastReading > (config?.offline_timeout_seconds || 60));

  // Extract history series for sparklines
  const gasHistory = readings?.slice(0, 20).reverse().map(r => r.gas_ppm) || [];
  const smokeHistory = readings?.slice(0, 20).reverse().map(r => r.smoke_level) || [];
  const tempHistory = readings?.slice(0, 20).reverse().map(r => r.temperature) || [];

  const lastValveEvent = events?.find(e => e.event_type === 'valve_closed' || e.event_type === 'valve_opened');

  return (
    <div className="space-y-6">
      {/* 1. Status Banner */}
      <StatusBanner
        isDeviceOnline={status.online}
        secondsSinceLastReading={status.secondsSinceLastReading}
        latestReading={latestReading}
        config={config}
        activeAlert={activeAlert}
        onAcknowledge={onAcknowledgeAlert}
        onShutoffClick={onShutoffGas}
        onMarkFalseAlarm={onMarkFalseAlarm}
      />

      {/* 2. Sensor Gauge Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SensorCard
          title="LPG Gas Concentration"
          icon={Flame}
          value={latestReading?.gas_ppm}
          unit=" PPM"
          watchThreshold={config?.gas_watch_threshold || 150}
          dangerThreshold={config?.gas_danger_threshold || 300}
          history={gasHistory}
          isStale={isStale}
          description="MQ-2 sensor calibrated for Liquefied Petroleum Gas."
        />

        <SensorCard
          title="Smoke Index"
          icon={Wind}
          value={latestReading?.smoke_level}
          unit=" IDX"
          watchThreshold={config?.smoke_watch_threshold || 100}
          dangerThreshold={config?.smoke_danger_threshold || 250}
          history={smokeHistory}
          isStale={isStale}
          description="Early combustion and aerosol particle detection."
        />

        <SensorCard
          title="Ambient Temperature"
          icon={Thermometer}
          value={latestReading?.temperature}
          unit="°C"
          watchThreshold={config?.temp_watch_threshold || 45}
          dangerThreshold={config?.temp_danger_threshold || 60}
          history={tempHistory}
          isStale={isStale}
          description="Monitors zone temperature for rapid thermal spikes."
        />
      </div>

      {/* 3. Valve & Health Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ValveControlCard
          valveState={status.valveState}
          isAdmin={isAdmin}
          onShutoffGas={onShutoffGas}
          onReopenGas={onReopenGas}
          lastValveEvent={lastValveEvent}
          isOffline={!status.online}
        />

        <div className="space-y-4">
          <DeviceHealthCard status={status} />

          {/* Quick AI status summary banner */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  AI INSIGHT
                </span>
                <span className="text-xs text-zinc-400">Continuous Analysis</span>
              </div>
              <p className="text-xs text-zinc-300">
                {activeAlert 
                  ? activeAlert.message 
                  : "Atmosphere stable. No drift or anomaly detected in sensor readings over the past 24 hours."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('assistant')}
              className="p-2 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors shrink-0"
              title="Open AI Assistant"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Latest 5 Events Timeline Snippet */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-zinc-100">Recent Safety Events</h3>
          <button
            type="button"
            onClick={() => onNavigateTab('events')}
            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {events && events.length > 0 ? (
            events.slice(0, 5).map(event => (
              <EventRow key={event.id} event={event} />
            ))
          ) : (
            <div className="text-center py-6 text-xs text-zinc-500">
              No recent events logged. Sensor telemetry is clear.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

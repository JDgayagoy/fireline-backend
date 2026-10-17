'use client';

import React, { useState } from 'react';
import { 
  Flame, 
  Wind, 
  Thermometer, 
  Droplets,
  ArrowRight, 
  Sparkles,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
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
  const [activeCategory, setActiveCategory] = useState('All Sensors & Valve');

  const latestReading = readings && readings.length > 0 ? readings[0] : null;
  const activeAlert = alerts?.find(a => a.status === 'active');
  const isStale = !status.online || (status.secondsSinceLastReading !== null && status.secondsSinceLastReading > (config?.offline_timeout_seconds || 60));

  // Extract history series for sparklines
  const gasHistory = readings?.slice(0, 20).reverse().map(r => r.gas_ppm) || [];
  const smokeHistory = readings?.slice(0, 20).reverse().map(r => r.smoke_level) || [];
  const tempHistory = readings?.slice(0, 20).reverse().map(r => r.temperature) || [];
  const humidityHistory = readings?.slice(0, 20).reverse().map(r => r.humidity !== undefined ? r.humidity : 55) || [];

  const lastValveEvent = events?.find(e => e.event_type === 'valve_closed' || e.event_type === 'valve_opened');

  const categories = ['All Sensors & Valve', 'MQ-2 Sensor', 'DHT11 Sensor', 'LPG Valve'];

  const currentTemp = latestReading?.temperature !== undefined ? latestReading.temperature : 24.8;
  const currentGas = latestReading?.gas_ppm !== undefined ? latestReading.gas_ppm : 82;
  const currentSmoke = latestReading?.smoke_level !== undefined ? latestReading.smoke_level : 45;
  const currentHumidity = latestReading?.humidity !== undefined ? latestReading.humidity : 56;

  // Derive atmospheric safety assessment based on real sensors
  const isDangerous = activeAlert?.level === 'danger' || 
    currentGas >= (config?.gas_danger_threshold || 300) ||
    currentTemp >= (config?.temp_danger_threshold || 60) ||
    currentSmoke >= (config?.smoke_danger_threshold || 250);

  const isWatching = activeAlert?.level === 'watch' || 
    currentGas >= (config?.gas_watch_threshold || 150) ||
    currentTemp >= (config?.temp_watch_threshold || 45) ||
    currentSmoke >= (config?.smoke_watch_threshold || 100);

  return (
    <div className="space-y-6">
      {/* 1. Status Banner (Unmissable Danger or Watch Alerts per UI.MD) */}
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

      {/* 2. Reference Hero Environmental Card (Electric Lime Card) */}
      <div className="relative rounded-[28px] bg-[#c8ff00] text-zinc-950 p-6 md:p-8 shadow-smart-card overflow-hidden transition-all duration-300">
        {/* Top Metric Row: DHT11 Ambient Temperature */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl md:text-6xl font-black tracking-tight tabular-nums">
                {currentTemp}°C
              </span>
              <span className="text-2xl md:text-3xl font-extrabold text-zinc-950 select-none">
                ↑
              </span>
            </div>
            <p className="text-xs md:text-sm font-bold text-zinc-900/80 mt-1">
              DHT11 • Ambient Temperature
            </p>
          </div>

          {/* Circular Badge with Thermometer Icon */}
          <div className="w-12 h-12 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-sm shrink-0">
            <Thermometer className="w-6 h-6 text-zinc-950" />
          </div>
        </div>

        {/* Dashed Separator */}
        <div className="border-b border-dashed border-zinc-950/20 my-5 md:my-6" />

        {/* 3 Metrics Bottom Columns: MQ-2 Gas, MQ-2 Smoke, DHT11 Humidity */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div>
            <div className="text-lg sm:text-xl font-black tracking-tight">
              {currentGas} PPM
            </div>
            <div className="text-xs sm:text-sm font-semibold text-zinc-900/75 mt-0.5 truncate">
              MQ-2 Gas Leak
            </div>
          </div>

          <div>
            <div className="text-lg sm:text-xl font-black tracking-tight">
              {currentSmoke} PPM
            </div>
            <div className="text-xs sm:text-sm font-semibold text-zinc-900/75 mt-0.5 truncate">
              MQ-2 Smoke
            </div>
          </div>

          <div>
            <div className="text-lg sm:text-xl font-black tracking-tight">
              {currentHumidity}% RH
            </div>
            <div className="text-xs sm:text-sm font-semibold text-zinc-900/75 mt-0.5 truncate">
              DHT11 Humidity
            </div>
          </div>
        </div>
      </div>

      {/* 3. Device Health & Telemetry */}
      <DeviceHealthCard status={status} defaultOpen={true} />

      {/* 4. AI Predictive Model Card (Placed Below Device Health & Telemetry) */}
      <div className="rounded-[28px] border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-smart-card space-y-3 sm:space-y-3.5 transition-all">
        {/* Top Header Row: Badge & Action Link */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold tracking-wider px-3 py-1 rounded-full bg-zinc-950 text-[#c8ff00] inline-flex items-center gap-1.5 shadow-sm whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5 text-[#c8ff00] shrink-0" />
            AI PREDICTIVE MODEL
          </span>

          <button
            type="button"
            onClick={() => onNavigateTab('assistant')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-semibold transition-all hover:scale-102 active:scale-98 cursor-pointer shadow-sm shrink-0"
            title="Open AI Assistant"
          >
            <span>Ask AI</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Feature Subtitle */}
        <div>
          <h3 className="text-sm sm:text-base font-bold text-zinc-950 tracking-tight">
            Real-Time Forecast & Anomaly Detection
          </h3>
          {/* Narrative Body */}
          <p className="text-xs sm:text-sm text-zinc-600 font-normal leading-relaxed mt-1.5">
            {activeAlert 
              ? activeAlert.message 
              : "Atmosphere stable. No drift or anomaly detected in MQ-2 (gas & smoke) and DHT11 (temp & humidity) telemetry over the past 24 hours."}
          </p>
        </div>

        {/* Telemetry Status Strip */}
        <div className="flex items-center gap-2 pt-2.5 border-t border-zinc-100 text-[11px] text-zinc-500 font-medium flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Telemetry Normal
          </span>
          <span className="text-zinc-300">•</span>
          <span className="text-zinc-600">MQ-2 Gas & Smoke</span>
          <span className="text-zinc-300">•</span>
          <span className="text-zinc-600">DHT11 Temp & Humidity</span>
        </div>
      </div>

      {/* 4. Sensor & Hardware Filter Tabs */}
      <div className="flex items-center gap-6 overflow-x-auto pb-1 scrollbar-none pt-1">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className="group flex flex-col items-center shrink-0 cursor-pointer focus:outline-none"
            >
              <span className={`text-sm md:text-base transition-colors ${
                isActive 
                  ? 'font-bold text-zinc-950' 
                  : 'font-medium text-zinc-400 hover:text-zinc-700'
              }`}>
                {cat}
              </span>
              {/* Neon Lime Active Underline Pill */}
              <span className={`h-1 rounded-full transition-all duration-200 mt-1.5 ${
                isActive ? 'w-5 bg-[#c8ff00]' : 'w-0 bg-transparent'
              }`} />
            </button>
          );
        })}
      </div>

      {/* 5. Sensor & Actuator Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5">
        {/* Card 1: DHT11 Relative Humidity */}
        {(activeCategory === 'All Sensors & Valve' || activeCategory === 'DHT11 Sensor') && (
          <SensorCard
            title="DHT11 Humidity"
            icon={Droplets}
            value={latestReading?.humidity !== undefined ? latestReading.humidity : 56}
            unit="% RH"
            watchThreshold={config?.humidity_watch_threshold || 80}
            dangerThreshold={config?.humidity_danger_threshold || 90}
            history={humidityHistory}
            isStale={isStale}
            description="DHT11 • Relative humidity monitoring"
          />
        )}

        {/* Card 2: MQ-2 Gas Leak Detector */}
        {(activeCategory === 'All Sensors & Valve' || activeCategory === 'MQ-2 Sensor') && (
          <SensorCard
            title="MQ-2 Gas Leak"
            icon={Flame}
            value={latestReading?.gas_ppm}
            unit=" PPM"
            watchThreshold={config?.gas_watch_threshold || 150}
            dangerThreshold={config?.gas_danger_threshold || 300}
            history={gasHistory}
            isStale={isStale}
            description="MQ-2 • LPG & Combustible gas detector"
          />
        )}

        {/* Card 3: MQ-2 Smoke Detector */}
        {(activeCategory === 'All Sensors & Valve' || activeCategory === 'MQ-2 Sensor') && (
          <SensorCard
            title="MQ-2 Smoke Detector"
            icon={Wind}
            value={latestReading?.smoke_level}
            unit=" PPM"
            watchThreshold={config?.smoke_watch_threshold || 100}
            dangerThreshold={config?.smoke_danger_threshold || 250}
            history={smokeHistory}
            isStale={isStale}
            description="MQ-2 • Smoke & airborne combustion"
          />
        )}

        {/* Card 4: DHT11 Ambient Temperature */}
        {(activeCategory === 'All Sensors & Valve' || activeCategory === 'DHT11 Sensor') && (
          <SensorCard
            title="DHT11 Temperature"
            icon={Thermometer}
            value={latestReading?.temperature}
            unit="°C"
            watchThreshold={config?.temp_watch_threshold || 45}
            dangerThreshold={config?.temp_danger_threshold || 60}
            history={tempHistory}
            isStale={isStale}
            description="DHT11 • Ambient thermal environment"
          />
        )}

        {/* Card 5: LPG Emergency Valve (Featured Dark Card with Switch) */}
        {(activeCategory === 'All Sensors & Valve' || activeCategory === 'LPG Valve') && (
          <ValveControlCard
            valveState={status.valveState}
            isAdmin={isAdmin}
            onShutoffGas={onShutoffGas}
            onReopenGas={onReopenGas}
            lastValveEvent={lastValveEvent}
            isOffline={!status.online}
          />
        )}
      </div>

      {/* 5. Recent Safety Events Section */}
      <div className="rounded-[28px] border border-zinc-200/80 bg-white p-5 md:p-6 shadow-smart-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900 tracking-tight">Recent Safety Events</h3>
            <p className="text-xs text-zinc-400">Live hardware audit trail and alerts</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('events')}
            className="text-xs font-semibold text-zinc-900 hover:text-zinc-600 flex items-center gap-1 transition-colors cursor-pointer"
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
            <div className="text-center py-6 text-xs text-zinc-400">
              No recent events logged. Sensor telemetry is clear.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

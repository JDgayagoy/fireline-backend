'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  ListTodo, 
  MessageSquare, 
  Settings, 
  Bell, 
  ShieldAlert, 
  Flame, 
  Wifi,
  WifiOff
} from 'lucide-react';
import ConnectionBadge from '../components/connection-badge';
import DashboardView from '../components/screens/dashboard-view';
import HistoryView from '../components/screens/history-view';
import EventsView from '../components/screens/events-view';
import AssistantView from '../components/screens/assistant-view';
import SettingsView from '../components/screens/settings-view';
import { 
  fetchStatus, 
  fetchReadings, 
  fetchConfig, 
  updateConfig, 
  fetchAlerts, 
  acknowledgeAlert, 
  markFalseAlarm, 
  fetchEvents, 
  queueCommand, 
  fetchContacts, 
  addContact 
} from '../lib/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAdmin, setIsAdmin] = useState(true);

  // System State
  const [status, setStatus] = useState({
    online: true,
    lastSeen: null,
    secondsSinceLastReading: 1,
    valveState: 'open',
    rssi: -62,
    uptime: 360,
    firmware_version: 'v1.0.0-esp32'
  });
  const [readings, setReadings] = useState([]);
  const [config, setConfig] = useState({
    gas_watch_threshold: 150,
    gas_danger_threshold: 300,
    smoke_watch_threshold: 100,
    smoke_danger_threshold: 250,
    temp_watch_threshold: 45,
    temp_danger_threshold: 60,
    clean_air_baseline: 85,
    offline_timeout_seconds: 60,
    ack_timeout_seconds: 120,
    quiet_hours_enabled: false,
    maintenance_mode: false
  });
  const [alerts, setAlerts] = useState([]);
  const [events, setEvents] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [isBrowserOffline, setIsBrowserOffline] = useState(false);

  // Network offline listener
  useEffect(() => {
    const handleOnline = () => setIsBrowserOffline(false);
    const handleOffline = () => setIsBrowserOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync data loop (every 3 seconds)
  const syncData = useCallback(async () => {
    try {
      const [statusRes, readingsRes, configRes, alertsRes, eventsRes, contactsRes] = await Promise.allSettled([
        fetchStatus(),
        fetchReadings(100),
        fetchConfig(),
        fetchAlerts(),
        fetchEvents(50),
        fetchContacts()
      ]);

      if (statusRes.status === 'fulfilled') setStatus(statusRes.value);
      if (readingsRes.status === 'fulfilled') setReadings(readingsRes.value);
      if (configRes.status === 'fulfilled') setConfig(configRes.value);
      if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value);
      if (eventsRes.status === 'fulfilled') setEvents(eventsRes.value);
      if (contactsRes.status === 'fulfilled') setContacts(contactsRes.value);
    } catch (err) {
      console.warn('Sync blip:', err);
    }
  }, []);

  useEffect(() => {
    syncData();
    const timer = setInterval(syncData, 3000);
    return () => clearInterval(timer);
  }, [syncData]);

  // Actions
  const handleShutoffGas = async () => {
    await queueCommand('close_valve', isAdmin ? 'admin' : 'viewer');
    await syncData();
  };

  const handleReopenGas = async () => {
    await queueCommand('open_valve', isAdmin ? 'admin' : 'viewer');
    await syncData();
  };

  const handleAcknowledgeAlert = async (alertId) => {
    await acknowledgeAlert(alertId, isAdmin ? 'admin' : 'viewer');
    await syncData();
  };

  const handleMarkFalseAlarm = async (alertId, note) => {
    await markFalseAlarm(alertId, note);
    await syncData();
  };

  const handleUpdateConfig = async (newConfig) => {
    await updateConfig(newConfig);
    await syncData();
  };

  const handleAddContact = async (newContact) => {
    await addContact(newContact);
    await syncData();
  };

  const handleQueueCommand = async (cmd) => {
    await queueCommand(cmd, 'admin');
    await syncData();
  };

  const activeAlertsCount = alerts.filter(a => a.status === 'active').length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'history', label: 'History', icon: TrendingUp },
    { id: 'events', label: 'Events', icon: ListTodo, badge: events.length },
    { id: 'assistant', label: 'Assistant', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Browser Offline Banner (UI.md 7.3) */}
      {isBrowserOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-zinc-950 font-semibold text-xs py-2 px-4 text-center">
          You are offline. Showing cached sensor data. Controls are temporarily disabled.
        </div>
      )}

      {/* Desktop Sidebar (md and up per UI.md Section 4) */}
      <aside className="hidden md:flex w-64 flex-col border-r border-zinc-800 bg-zinc-950 p-4 shrink-0 justify-between">
        <div className="space-y-6">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 px-2 py-1">
            <div className="p-2 rounded-lg bg-red-600 text-white shadow-md shadow-red-950/40">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-zinc-100">Gas & Fire Monitor</h1>
              <p className="text-[11px] text-zinc-400">IoT Safety System</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-zinc-800/90 text-white font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.id === 'events' && activeAlertsCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Info */}
        <div className="pt-4 border-t border-zinc-800/80 px-2 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Connection</span>
            <ConnectionBadge 
              online={status.online} 
              secondsSinceLastReading={status.secondsSinceLastReading} 
              offlineTimeout={config.offline_timeout_seconds}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Current Role</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              isAdmin ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
            }`}>
              {isAdmin ? 'Admin' : 'Viewer'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Mobile/Desktop Header */}
        <header className="sticky top-0 z-40 h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3 md:hidden">
            <div className="p-1.5 rounded-lg bg-red-600 text-white">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Gas & Fire Monitor</h2>
              <p className="text-[10px] text-zinc-400 font-mono">ESP32 IoT Node</p>
            </div>
          </div>

          <div className="hidden md:block">
            <h2 className="text-sm font-semibold capitalize text-zinc-300">
              {activeTab} Overview
            </h2>
          </div>

          {/* Header Right Status */}
          <div className="flex items-center gap-3">
            <ConnectionBadge 
              online={status.online} 
              secondsSinceLastReading={status.secondsSinceLastReading}
              offlineTimeout={config.offline_timeout_seconds}
            />

            {/* Alert Bell Button */}
            <button
              type="button"
              onClick={() => setActiveTab('events')}
              className="relative p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
              title="View Alerts"
            >
              <Bell className="w-4 h-4" />
              {activeAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center">
                  {activeAlertsCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* View Content Body */}
        <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              status={status}
              readings={readings}
              config={config}
              alerts={alerts}
              events={events}
              isAdmin={isAdmin}
              onAcknowledgeAlert={handleAcknowledgeAlert}
              onShutoffGas={handleShutoffGas}
              onReopenGas={handleReopenGas}
              onMarkFalseAlarm={handleMarkFalseAlarm}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'history' && (
            <HistoryView
              readings={readings}
              config={config}
            />
          )}

          {activeTab === 'events' && (
            <EventsView
              events={events}
              alerts={alerts}
              onMarkFalseAlarm={handleMarkFalseAlarm}
            />
          )}

          {activeTab === 'assistant' && (
            <AssistantView />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              config={config}
              onUpdateConfig={handleUpdateConfig}
              contacts={contacts}
              onAddContact={handleAddContact}
              isAdmin={isAdmin}
              setIsAdmin={setIsAdmin}
              onQueueCommand={handleQueueCommand}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (per UI.md Section 4: Dashboard, History, Events, Assistant, Settings) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-2 py-1 flex items-center justify-around pb-[env(safe-area-inset-bottom)]">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center w-14 h-12 rounded-lg transition-colors relative ${
                isActive ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium">{item.label}</span>
              {item.id === 'events' && activeAlertsCount > 0 && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500 animate-ping" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

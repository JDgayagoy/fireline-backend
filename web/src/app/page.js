'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Home,
  SlidersHorizontal,
  Scan,
  MessageSquare,
  User,
  Bell, 
  Flame, 
  Wifi,
  Sparkles,
  Settings,
  ShieldCheck,
  TrendingUp,
  ListTodo,
  LogOut,
  UserCheck
} from 'lucide-react';
import ConnectionBadge from '../components/connection-badge';
import PwaInstaller from '../components/pwa-installer';
import LoginView from '../components/auth/login-view';
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
  addContact,
  updateContact,
  deleteContact
} from '../lib/api';
import { getCurrentSession, logoutUser, AUTHORIZED_USERS, getAllKnownAccounts, loginUser } from '../lib/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Restore session from localStorage on initial mount
  useEffect(() => {
    const sessionUser = getCurrentSession();
    if (sessionUser) {
      setCurrentUser(sessionUser);
    }
    setAuthLoading(false);
  }, []);

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  const handleSwitchAccount = async (targetEmail) => {
    const all = getAllKnownAccounts();
    const target = all.find(u => u.email.toLowerCase() === targetEmail.toLowerCase()) 
      || AUTHORIZED_USERS.find(u => u.email.toLowerCase() === targetEmail.toLowerCase());
    if (target && target.password) {
      try {
        const user = await loginUser(target.email, target.password);
        setCurrentUser(user);
      } catch (e) {
        handleLogout();
      }
    } else {
      handleLogout();
    }
  };

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  const isSuperAdmin = currentUser?.role === 'superadmin';

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
    gas_watch_threshold: 30,
    gas_danger_threshold: 50,
    smoke_watch_threshold: 30,
    smoke_danger_threshold: 50,
    temp_watch_threshold: 40,
    temp_danger_threshold: 50,
    humidity_watch_threshold: 80,
    humidity_danger_threshold: 90,
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

  // Load cached config on initial mount so calibrations never flicker or reset
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('cached_config');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') {
            setConfig(prev => ({ ...prev, ...parsed }));
          }
        }
      } catch (_) {}
    }
  }, []);

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
      if (readingsRes.status === 'fulfilled') {
        const data = readingsRes.value;
        setReadings(data && data.length > 0 ? data : [
          {
            id: 1,
            created_at: new Date().toISOString(),
            gas_ppm: 82,
            smoke_level: 45,
            temperature: 24.8,
            humidity: 56,
            rssi: -62,
            uptime: 360
          }
        ]);
      }
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

  const lastDangerPopupRef = React.useRef(null);
  useEffect(() => {
    const activeDanger = alerts.find(a => a.status === 'active' && a.level === 'danger');
    if (activeDanger) {
      import('@/lib/notifications').then(n => {
        n.playEmergencyAlarmChime();
        if (lastDangerPopupRef.current !== activeDanger.id) {
          lastDangerPopupRef.current = activeDanger.id;
          n.showSystemPopupNotification({
            title: '🚨 CRITICAL GAS/FIRE DANGER',
            body: `${activeDanger.message || 'Critical sensor threshold breached'}. Automatic shutoff commanded!`,
            tag: `alert-${activeDanger.id}`
          });
        }
      }).catch(() => {});
    } else {
      lastDangerPopupRef.current = null;
      import('@/lib/notifications').then(n => n.stopEmergencyAlarmChime()).catch(() => {});
    }
  }, [alerts]);

  // Actions with user audit attribution
  const handleShutoffGas = async () => {
    await queueCommand('close_valve', currentUser?.email || 'admin');
    await syncData();
  };

  const handleReopenGas = async () => {
    await queueCommand('open_valve', currentUser?.email || 'admin');
    await syncData();
  };

  const handleAcknowledgeAlert = async (alertId) => {
    import('@/lib/notifications').then(n => n.stopEmergencyAlarmChime()).catch(() => {});
    await acknowledgeAlert(alertId, currentUser?.email || 'admin');
    await syncData();
  };

  const handleMarkFalseAlarm = async (alertId, note) => {
    await markFalseAlarm(alertId, note);
    await syncData();
  };

  const handleUpdateConfig = async (newConfig) => {
    const payload = {
      ...newConfig,
      contacts: contacts
    };
    await updateConfig(payload);
    await syncData();
  };

  const handleAddContact = async (newContact) => {
    const contactWithId = {
      ...newContact,
      id: newContact.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `contact-${Date.now()}`)
    };
    setContacts(prev => {
      const exists = prev.some(c => String(c.id) === String(contactWithId.id));
      return exists ? prev.map(c => String(c.id) === String(contactWithId.id) ? contactWithId : c) : [...prev, contactWithId];
    });
    try {
      await addContact(contactWithId);
    } catch (e) {
      console.warn('Add contact note:', e.message);
    }
    await syncData();
  };

  const handleUpdateContact = async (contactId, updates) => {
    setContacts(prev => prev.map(c => String(c.id) === String(contactId) ? { ...c, ...updates } : c));
    try {
      await updateContact(contactId, updates);
    } catch (e) {
      console.warn('Update contact note:', e.message);
    }
    await syncData();
  };

  const handleDeleteContact = async (contactId) => {
    setContacts(prev => prev.filter(c => String(c.id) !== String(contactId)));
    try {
      await deleteContact(contactId);
    } catch (e) {
      console.warn('Delete contact note:', e.message);
    }
    await syncData();
  };

  const handleQueueCommand = async (cmd, payload = {}) => {
    await queueCommand(cmd, currentUser?.email || 'admin', payload);
    await syncData();
  };

  const activeAlertsCount = alerts.filter(a => a.status === 'active').length;

  // Nav Items (Home, History, Events, AI Chat, Settings)
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'history', label: 'History', icon: SlidersHorizontal },
    { id: 'events', label: 'Events', icon: Scan, badge: activeAlertsCount },
    { id: 'assistant', label: 'AI Chat', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: User }
  ];

  const [currentDateText, setCurrentDateText] = useState('Monday, 24 July');

  useEffect(() => {
    setCurrentDateText(
      new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
      })
    );
  }, []);

  // Auth Verification Splash Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white selection:bg-[#c8ff00] selection:text-black">
        <div className="w-14 h-14 rounded-2xl bg-[#c8ff00] text-zinc-950 flex items-center justify-center font-black shadow-[0_0_35px_rgba(200,255,0,0.4)] animate-pulse mb-4">
          <Flame className="w-8 h-8 fill-zinc-950 text-zinc-950" />
        </div>
        <p className="text-xs text-zinc-400 font-mono tracking-widest uppercase">
          FireLine Security Gate...
        </p>
      </div>
    );
  }

  // Not Authenticated -> Show Login View
  if (!currentUser) {
    return <LoginView onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-zinc-950 flex flex-col md:flex-row pb-24 md:pb-0 font-sans antialiased selection:bg-[#c8ff00] selection:text-black">
      {/* Browser Offline Banner */}
      {isBrowserOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-zinc-950 font-bold text-xs pt-[max(calc(env(safe-area-inset-top,0px)+6px),16px)] pb-2 px-4 text-center shadow-md">
          You are offline. Showing cached sensor data. Controls are temporarily disabled.
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 flex-col border-r border-zinc-200/80 bg-white p-6 shrink-0 justify-between min-h-screen">
        <div className="space-y-8">
          {/* FireLine Brand Header */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950 text-white shadow-sm border border-zinc-900">
            <div className="w-10 h-10 rounded-xl bg-[#c8ff00] text-zinc-950 flex items-center justify-center font-black shadow-sm shrink-0">
              <Flame className="w-5 h-5 fill-zinc-950 text-zinc-950" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-black tracking-tight text-white leading-none">
                  FireLine
                </h2>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/10 text-[#c8ff00] tracking-wider uppercase">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium mt-1 truncate">
                Gas & Fire Defense
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-zinc-950 text-white shadow-md'
                      : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-[#c8ff00]' : 'text-zinc-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Info */}
        <div className="pt-5 border-t border-zinc-100 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 font-medium">IoT Node Link</span>
            <ConnectionBadge 
              online={status.online} 
              secondsSinceLastReading={status.secondsSinceLastReading} 
              offlineTimeout={config.offline_timeout_seconds}
            />
          </div>

          {/* Authenticated Officer Profile */}
          <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                Operator Account
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                isSuperAdmin 
                  ? 'bg-zinc-950 text-[#c8ff00]' 
                  : 'bg-zinc-900 text-white'
              }`}>
                {currentUser?.role}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-900 text-[#c8ff00] flex items-center justify-center font-bold text-xs shrink-0">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-zinc-900 truncate">
                  {currentUser?.name}
                </p>
                <p className="text-[10px] text-zinc-400 font-mono truncate">
                  {currentUser?.email}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full mt-1 py-1.5 px-3 rounded-xl bg-white hover:bg-red-50 text-zinc-600 hover:text-red-600 border border-zinc-200/90 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Mobile/Desktop Header */}
        <header className="sticky top-0 z-40 bg-[#f6f7f9]/95 backdrop-blur-md px-5 md:px-8 pt-[max(calc(env(safe-area-inset-top,0px)+12px),24px)] pb-3 md:py-4 flex items-center justify-between border-b border-zinc-200/50 md:border-b-0">
          {/* Mobile FireLine Brand Header */}
          <div className="flex items-center gap-2.5 md:hidden">
            <div className="w-9 h-9 rounded-xl bg-zinc-950 text-[#c8ff00] flex items-center justify-center shadow-sm shrink-0">
              <Flame className="w-5 h-5 fill-[#c8ff00] text-[#c8ff00]" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-zinc-950 leading-none">
                FireLine
              </h1>
              <p className="text-[10px] text-zinc-400 font-medium mt-1">
                {currentDateText}
              </p>
            </div>
          </div>

          {/* Desktop Tab Title */}
          <div className="hidden md:block">
            <h1 className="text-2xl font-black text-zinc-950 tracking-tight capitalize">
              {activeTab === 'dashboard' ? 'FireLine Safety Hub' : `${activeTab} Overview`}
            </h1>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              Gas & Fire Autonomous Protection System
            </p>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-2.5">
            <PwaInstaller />
            <ConnectionBadge 
              online={status.online} 
              secondsSinceLastReading={status.secondsSinceLastReading}
              offlineTimeout={config.offline_timeout_seconds}
            />

            {/* Alert Bell Button */}
            <button
              type="button"
              onClick={() => setActiveTab('events')}
              className="relative w-10 h-10 rounded-full bg-white border border-zinc-200/80 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-50 flex items-center justify-center transition-all shadow-sm shrink-0"
              title="View Alerts & Timeline"
            >
              <Bell className="w-4 h-4" />
              {activeAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center shadow-sm">
                  {activeAlertsCount}
                </span>
              )}
            </button>

            {/* Mobile Sign Out Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="md:hidden w-10 h-10 rounded-full bg-white border border-zinc-200/80 text-zinc-700 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-all shadow-sm shrink-0"
              title={`Signed in as ${currentUser?.email}. Tap to Sign Out.`}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* View Content Body */}
        <main className="flex-1 p-4 md:p-8 max-w-4xl lg:max-w-5xl w-full mx-auto">
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
              alerts={alerts}
              events={events}
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
            <AssistantView
              status={status}
              readings={readings}
              config={config}
              alerts={alerts}
              events={events}
              contacts={contacts}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              config={config}
              readings={readings}
              onUpdateConfig={handleUpdateConfig}
              contacts={contacts}
              onAddContact={handleAddContact}
              onUpdateContact={handleUpdateContact}
              onDeleteContact={handleDeleteContact}
              isAdmin={isAdmin}
              isSuperAdmin={isSuperAdmin}
              currentUser={currentUser}
              onLogout={handleLogout}
              onSwitchAccount={handleSwitchAccount}
              onQueueCommand={handleQueueCommand}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Matching Reference Mockup: Home, Devices, Scan, Profile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200/80 px-4 py-2 flex items-center justify-around pb-[calc(env(safe-area-inset-bottom)+8px)] shadow-[0_-4px_24px_rgba(0,0,0,0.03)]">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all cursor-pointer relative ${
                isActive ? 'text-zinc-950 font-bold' : 'text-zinc-400 hover:text-zinc-600 font-medium'
              }`}
            >
              <div className={`p-1 rounded-full transition-colors ${isActive ? 'text-zinc-950' : 'text-zinc-400'}`}>
                <Icon className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[10px] tracking-tight">{item.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#c8ff00] mt-0.5" />
              )}
              {item.badge > 0 && (
                <span className="absolute top-1 right-2.5 w-2 h-2 rounded-full bg-red-500 animate-ping" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Users, 
  Bell, 
  BellRing,
  ShieldCheck, 
  Globe, 
  Save, 
  Plus, 
  Phone, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  LogOut,
  UserCheck,
  KeyRound,
  Volume2,
  VolumeX,
  Sparkles,
  Trash2,
  Star,
  ShieldAlert,
  Check
} from 'lucide-react';
import { 
  getNotificationPermission, 
  enableWebPushNotifications, 
  showSystemPopupNotification, 
  playEmergencyAlarmChime, 
  stopEmergencyAlarmChime 
} from '../../lib/notifications';

export default function SettingsView({
  config,
  onUpdateConfig,
  contacts = [],
  onAddContact,
  onUpdateContact,
  onDeleteContact,
  isAdmin = true,
  setIsAdmin,
  currentUser,
  isSuperAdmin = false,
  onLogout,
  onSwitchAccount,
  onQueueCommand
}) {
  const [form, setForm] = useState({
    gas_watch_threshold: config?.gas_watch_threshold || 150,
    gas_danger_threshold: config?.gas_danger_threshold || 300,
    smoke_watch_threshold: config?.smoke_watch_threshold || 100,
    smoke_danger_threshold: config?.smoke_danger_threshold || 250,
    temp_watch_threshold: config?.temp_watch_threshold || 45,
    temp_danger_threshold: config?.temp_danger_threshold || 60,
    humidity_watch_threshold: config?.humidity_watch_threshold || 80,
    clean_air_baseline: config?.clean_air_baseline || 85,
    offline_timeout_seconds: config?.offline_timeout_seconds || 60,
    ack_timeout_seconds: config?.ack_timeout_seconds || 120,
    quiet_hours_enabled: config?.quiet_hours_enabled || false,
    quiet_hours_start: config?.quiet_hours_start || '22:00:00',
    quiet_hours_end: config?.quiet_hours_end || '07:00:00',
    maintenance_mode: config?.maintenance_mode || false
  });

  const [language, setLanguage] = useState('en');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone_number: '', relationship: '', priority: 1 });
  const [deletingContactId, setDeletingContactId] = useState(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [notificationPerm, setNotificationPerm] = useState('default');
  const [isEnablingPush, setIsEnablingPush] = useState(false);

  useEffect(() => {
    setNotificationPerm(getNotificationPermission());
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateConfig(form);
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setIsSaving(false);
      alert('Failed to save configuration');
    }
  };

  const handleCalibrateBaseline = async () => {
    setIsCalibrating(true);
    try {
      await onQueueCommand('calibrate_sensor');
      setTimeout(() => {
        setIsCalibrating(false);
        alert('Clean-air baseline sampling initiated on ESP32.');
      }, 1500);
    } catch (err) {
      setIsCalibrating(false);
    }
  };

  const handleSaveContact = async () => {
    if (!newContact.name || !newContact.phone_number) return;
    await onAddContact({
      ...newContact,
      priority: Number(newContact.priority) || 1
    });
    setNewContact({ name: '', phone_number: '', relationship: '', priority: 1 });
    setIsContactModalOpen(false);
  };

  const handleTogglePriority = async (contact) => {
    if (!isAdmin || !onUpdateContact) return;
    const newPriority = Number(contact.priority) === 1 ? 2 : 1;
    await onUpdateContact(contact.id, {
      priority: newPriority,
      relationship: newPriority === 1 ? 'Primary Safety Contact' : 'Secondary Escalation Contact'
    });
  };

  const handleDeleteContact = async (contactId) => {
    if (!isAdmin || !onDeleteContact) return;
    if (window.confirm('Are you sure you want to remove this emergency contact?')) {
      setDeletingContactId(contactId);
      try {
        await onDeleteContact(contactId);
      } finally {
        setDeletingContactId(null);
      }
    }
  };

  const handleEnablePopupNotifications = async () => {
    setIsEnablingPush(true);
    try {
      const res = await enableWebPushNotifications();
      setNotificationPerm(getNotificationPermission());
      setIsEnablingPush(false);
      alert('Popup Notifications enabled! You will now receive system banners even when the app is minimized or closed.');
    } catch (err) {
      setIsEnablingPush(false);
      alert(err.message || 'Failed to enable notifications');
    }
  };

  const handleTestPopup = async () => {
    const success = await showSystemPopupNotification({
      title: '🚨 FireLine Emergency Alert Test',
      body: 'Verified: System popup notification banner is functioning properly on this device.',
      tag: 'test-popup'
    });

    if (!success) {
      alert('Please enable popup notifications first using the "Turn On Background Popups" button.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Authenticated Officer Session Card */}
      <div className="rounded-[28px] border border-zinc-200/90 bg-white p-5 md:p-6 shadow-smart-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-[#c8ff00] flex items-center justify-center font-black shadow-sm shrink-0">
            <UserCheck className="w-6 h-6 text-[#c8ff00]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-zinc-950">
                {currentUser?.name || (isSuperAdmin ? 'Super Admin' : 'Safety Admin')}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isSuperAdmin 
                  ? 'bg-zinc-950 text-[#c8ff00] border border-zinc-800' 
                  : 'bg-zinc-100 text-zinc-800'
              }`}>
                {currentUser?.role || (isSuperAdmin ? 'superadmin' : 'admin')}
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              {currentUser?.email || (isSuperAdmin ? 'superadmin@test.com' : 'admin@test.com')}
            </p>
          </div>
        </div>

        {/* Account Switcher and Logout */}
        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
          {onSwitchAccount && (
            <button
              type="button"
              onClick={() => {
                const target = currentUser?.email === 'superadmin@test.com' ? 'admin@test.com' : 'superadmin@test.com';
                onSwitchAccount(target);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Fast switch between authorized test accounts"
            >
              <KeyRound className="w-3.5 h-3.5 text-zinc-600" />
              <span>Switch to {currentUser?.email === 'superadmin@test.com' ? 'admin@test.com' : 'superadmin@test.com'}</span>
            </button>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. NOTIFICATIONS & SYSTEM NATIVE POPUP ALERTS (PLACED FIRST) */}
      <div className="rounded-[28px] border border-zinc-200/90 bg-white p-5 md:p-6 space-y-5 shadow-smart-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-zinc-950 text-[#c8ff00] flex items-center justify-center shadow-sm shrink-0">
              <BellRing className="w-5 h-5 text-[#c8ff00]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-zinc-950">System Popup Notifications & Alerts</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  notificationPerm === 'granted'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {notificationPerm === 'granted' ? '● Popups Active' : '○ Popups Disabled'}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Receive instant OS popup banners on Windows, Android, and macOS even when FireLine is minimized or closed.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {notificationPerm !== 'granted' ? (
              <button
                type="button"
                onClick={handleEnablePopupNotifications}
                disabled={isEnablingPush}
                className="px-4 py-2 rounded-xl text-xs font-black bg-zinc-950 hover:bg-zinc-800 text-[#c8ff00] flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-black/10 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isEnablingPush ? 'Activating Popups...' : 'Turn On Background Popups'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleTestPopup}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#c8ff00] hover:bg-[#b5e600] text-zinc-950 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Send Test Popup Banner</span>
              </button>
            )}
          </div>
        </div>

        {/* Feature status grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* Web Push / OS Banner Box */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-zinc-600" />
                <span>Background Web Push Service</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-500">VAPID Protocol</span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              When a critical gas leak or high temperature hazard occurs, the cloud dispatcher sends a wake-up signal to your device.
            </p>
            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestPopup}
                className="text-xs font-bold text-zinc-800 hover:text-black underline cursor-pointer"
              >
                Test system banner now &rarr;
              </button>
            </div>
          </div>

          {/* Acoustic Alarm Synthesizer Box */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-red-600" />
                <span>Emergency Audio Siren (Synthesizer)</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-500">Web Audio API</span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Pulsing high-frequency audio tone automatically triggered during active Danger alerts to alert nearby operators.
            </p>
            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={playEmergencyAlarmChime}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 transition-colors cursor-pointer"
              >
                Test Siren
              </button>
              <button
                type="button"
                onClick={stopEmergencyAlarmChime}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors cursor-pointer"
              >
                Silence
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* 2. MQ-2 Sensor Thresholds (Gas Leak & Smoke Detector) */}
      <div className="rounded-[28px] border border-zinc-200/80 bg-white p-5 md:p-6 space-y-6 shadow-smart-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-800">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">MQ-2 Gas & Smoke Detector Calibration</h3>
              <p className="text-xs text-zinc-400">Combustible gas (LPG) and smoke push notification alert thresholds</p>
            </div>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={handleCalibrateBaseline}
              disabled={isCalibrating}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isCalibrating ? 'animate-spin text-zinc-800' : ''}`} />
              <span>{isCalibrating ? 'Sampling...' : 'Calibrate R0 Baseline'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gas Danger Slider */}
          <div className="space-y-2 p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-red-600">MQ-2 Gas Danger (Push Alert)</span>
              <span className="font-mono text-zinc-950">{form.gas_danger_threshold} PPM</span>
            </div>
            <input
              type="range"
              min="100"
              max="600"
              step="10"
              disabled={!isAdmin}
              value={form.gas_danger_threshold}
              onChange={(e) => setForm({ ...form, gas_danger_threshold: Number(e.target.value) })}
              className="w-full accent-red-600 cursor-pointer disabled:opacity-50"
            />
            <p className="text-[11px] text-zinc-400">Critical danger limit; triggers automatic solenoid valve shutoff, audio chime, and SIM800L SMS alert.</p>
          </div>

          {/* Gas Watch Slider */}
          <div className="space-y-2 p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-amber-600">MQ-2 Gas Watch Warning</span>
              <span className="font-mono text-zinc-950">{form.gas_watch_threshold} PPM</span>
            </div>
            <input
              type="range"
              min="50"
              max="300"
              step="5"
              disabled={!isAdmin}
              value={form.gas_watch_threshold}
              onChange={(e) => setForm({ ...form, gas_watch_threshold: Number(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer disabled:opacity-50"
            />
            <p className="text-[11px] text-zinc-400">Generates advisory in-app alert and push notification for early gas detection.</p>
          </div>

          {/* Smoke Danger Slider */}
          <div className="space-y-2 p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-red-600">MQ-2 Smoke Danger (Push Alert)</span>
              <span className="font-mono text-zinc-950">{form.smoke_danger_threshold} PPM</span>
            </div>
            <input
              type="range"
              min="150"
              max="500"
              step="10"
              disabled={!isAdmin}
              value={form.smoke_danger_threshold}
              onChange={(e) => setForm({ ...form, smoke_danger_threshold: Number(e.target.value) })}
              className="w-full accent-red-600 cursor-pointer disabled:opacity-50"
            />
            <p className="text-[11px] text-zinc-400">High combustion smoke threshold; triggers emergency valve shutoff and alarm.</p>
          </div>

          {/* Smoke Watch Slider */}
          <div className="space-y-2 p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-amber-600">MQ-2 Smoke Watch Warning</span>
              <span className="font-mono text-zinc-950">{form.smoke_watch_threshold} PPM</span>
            </div>
            <input
              type="range"
              min="50"
              max="200"
              step="5"
              disabled={!isAdmin}
              value={form.smoke_watch_threshold}
              onChange={(e) => setForm({ ...form, smoke_watch_threshold: Number(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer disabled:opacity-50"
            />
            <p className="text-[11px] text-zinc-400">Early warning for smoldering smoke; dispatches an advisory push notification.</p>
          </div>
        </div>
      </div>


      {/* 3. DHT11 Temperature & Humidity Thresholds */}
      <div className="rounded-[28px] border border-zinc-200/80 bg-white p-5 md:p-6 space-y-6 shadow-smart-card">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-800">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900">DHT11 Temperature & Humidity Thresholds</h3>
            <p className="text-xs text-zinc-400">Ambient thermal fire and humidity push notification alert triggers</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Temperature Danger Slider */}
          <div className="space-y-2 p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-red-600">DHT11 Temp Danger (Push Alert)</span>
              <span className="font-mono text-zinc-950">{form.temp_danger_threshold}°C</span>
            </div>
            <input
              type="range"
              min="40"
              max="90"
              step="1"
              disabled={!isAdmin}
              value={form.temp_danger_threshold}
              onChange={(e) => setForm({ ...form, temp_danger_threshold: Number(e.target.value) })}
              className="w-full accent-red-600 cursor-pointer disabled:opacity-50"
            />
            <p className="text-[11px] text-zinc-400">High thermal alert threshold; triggers emergency solenoid valve shutoff and SIM800L SMS alert.</p>
          </div>

          {/* Temperature Watch Slider */}
          <div className="space-y-2 p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-amber-600">DHT11 Temp Watch</span>
              <span className="font-mono text-zinc-950">{form.temp_watch_threshold}℃</span>
            </div>
            <input
              type="range"
              min="30"
              max="60"
              step="1"
              disabled={!isAdmin}
              value={form.temp_watch_threshold}
              onChange={(e) => setForm({ ...form, temp_watch_threshold: Number(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer disabled:opacity-50"
            />
            <p className="text-[11px] text-zinc-400">Elevated temperature warning; sends an advisory push notification.</p>
          </div>

          {/* Humidity Watch Slider */}
          <div className="space-y-2 p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-purple-600">DHT11 Humidity Watch</span>
              <span className="font-mono text-zinc-950">{form.humidity_watch_threshold}% RH</span>
            </div>
            <input
              type="range"
              min="60"
              max="95"
              step="5"
              disabled={!isAdmin}
              value={form.humidity_watch_threshold}
              onChange={(e) => setForm({ ...form, humidity_watch_threshold: Number(e.target.value) })}
              className="w-full accent-purple-600 cursor-pointer disabled:opacity-50"
            />
            <p className="text-[11px] text-zinc-400">High moisture/condensation watch point; sends an advisory push notification.</p>
          </div>
        </div>
      </div>


      {/* 4. Emergency Contacts & Multi-Tier Escalation Order */}
      <div className="rounded-[28px] border border-zinc-200/80 bg-white p-5 md:p-6 space-y-4 shadow-smart-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-800">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">Emergency Contacts & Multi-Tier Escalation</h3>
              <p className="text-xs text-zinc-400">
                Primary contacts receive instant SMS upon danger detection. Secondary contacts receive SMS if alarm is unacknowledged.
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsContactModalOpen(true)}
              className="px-4 py-1.5 rounded-full text-xs font-bold bg-zinc-950 hover:bg-zinc-800 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Contact</span>
            </button>
          )}
        </div>

        {contacts.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50">
            <Users className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
            <p className="text-xs font-bold text-zinc-600">No emergency contacts configured</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Add primary and secondary contacts to receive GSM hardware SMS alerts.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact, idx) => {
              const isPrimary = Number(contact.priority) === 1;
              return (
                <div
                  key={contact.id || idx}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all gap-3 ${
                    isPrimary 
                      ? 'border-emerald-200/90 bg-emerald-50/30 shadow-sm' 
                      : 'border-zinc-200/70 bg-zinc-50/70'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 mt-0.5 ${
                      isPrimary 
                        ? 'bg-emerald-500 text-white shadow-sm' 
                        : 'bg-zinc-200 text-zinc-700'
                    }`}>
                      {isPrimary ? <Star className="w-4 h-4 fill-white" /> : (idx + 1)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-black text-zinc-900">{contact.name}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isPrimary
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {isPrimary ? '★ Primary (Instant SMS)' : '⏱ Secondary (Escalation Backup)'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 font-medium mt-0.5">
                        {contact.relationship} &bull;{' '}
                        <span className="font-mono text-zinc-800 font-semibold">{contact.phone_number}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions for Contact */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleTogglePriority(contact)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                          isPrimary
                            ? 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                        }`}
                        title={isPrimary ? 'Demote to Secondary backup' : 'Promote to Primary immediate responder'}
                      >
                        <Star className={`w-3.5 h-3.5 ${isPrimary ? 'text-amber-500 fill-amber-500' : 'text-emerald-600'}`} />
                        <span>{isPrimary ? 'Set Secondary' : 'Set Primary'}</span>
                      </button>
                    )}

                    <a
                      href={`tel:${contact.phone_number}`}
                      className="w-8 h-8 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-emerald-600 hover:bg-zinc-50 transition-colors shadow-sm"
                      title={`Call ${contact.name}`}
                    >
                      <Phone className="w-4 h-4" />
                    </a>

                    {isAdmin && (
                      <button
                        type="button"
                        disabled={deletingContactId === contact.id}
                        onClick={() => handleDeleteContact(contact.id)}
                        className="w-8 h-8 rounded-xl bg-white hover:bg-red-50 text-zinc-400 hover:text-red-600 border border-zinc-200 transition-colors flex items-center justify-center cursor-pointer shadow-sm disabled:opacity-50"
                        title="Delete contact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Language & Localization */}
      <div className="rounded-[28px] border border-zinc-200/80 bg-white p-5 md:p-6 flex items-center justify-between shadow-smart-card">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-800">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900">Language (Wika)</h3>
            <p className="text-xs text-zinc-400">Select interface language</p>
          </div>
        </div>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="h-10 px-4 rounded-xl bg-zinc-100 border border-zinc-200 text-xs font-bold text-zinc-800 focus:outline-none"
        >
          <option value="en">English (US)</option>
          <option value="fil">Filipino (Tagalog)</option>
        </select>
      </div>

      {/* Save Button */}
      {isAdmin && (
        <div className="flex items-center justify-end gap-3 pt-2">
          {saveSuccess && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Safety limits saved successfully</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-[#c8ff00] text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-black/10 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Safety Rules'}</span>
          </button>
        </div>
      )}
      {/* Add Contact Modal */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-[28px] border border-zinc-200 bg-white p-6 shadow-2xl text-zinc-950 space-y-4">
            <div>
              <h3 className="text-base font-black text-zinc-950">Add Emergency Contact</h3>
              <p className="text-xs text-zinc-400">Configure phone number for hardware GSM SMS alerts</p>
            </div>

            <div className="space-y-3">
              {/* Alert Response Tier Selector */}
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1.5">Alert Response Tier</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewContact({ ...newContact, priority: 1, relationship: newContact.relationship || 'Primary Safety Contact' })}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      Number(newContact.priority) === 1
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm ring-2 ring-emerald-500/20'
                        : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-black text-xs">
                      <Star className={`w-3.5 h-3.5 ${Number(newContact.priority) === 1 ? 'fill-emerald-600 text-emerald-600' : 'text-zinc-400'}`} />
                      <span>Primary Contact</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1 leading-tight">
                      Alerted immediately when danger threshold trips.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewContact({ ...newContact, priority: 2, relationship: newContact.relationship || 'Secondary Escalation Contact' })}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      Number(newContact.priority) > 1
                        ? 'border-blue-500 bg-blue-50 text-blue-950 shadow-sm ring-2 ring-blue-500/20'
                        : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-black text-xs">
                      <ShieldAlert className={`w-3.5 h-3.5 ${Number(newContact.priority) > 1 ? 'text-blue-600' : 'text-zinc-400'}`} />
                      <span>Secondary Backup</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1 leading-tight">
                      Alerted if alarm is unacknowledged past timeout.
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Contact Name</label>
                <input
                  type="text"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  placeholder="e.g. Officer Juan Dela Cruz"
                  className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#c8ff00]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Mobile Number (SMS)</label>
                <input
                  type="tel"
                  value={newContact.phone_number}
                  onChange={(e) => setNewContact({ ...newContact, phone_number: e.target.value })}
                  placeholder="+63 9XX XXX XXXX"
                  className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#c8ff00]"
                />
                <p className="text-[10px] text-zinc-400 mt-1">Accepts +639XXXXXXXXX or 09XXXXXXXXX</p>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">Relationship / Organization</label>
                <input
                  type="text"
                  value={newContact.relationship}
                  onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                  placeholder="e.g. Building Fire Safety Officer / Guardhouse"
                  className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#c8ff00]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsContactModalOpen(false)}
                className="h-10 px-4 rounded-full text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveContact}
                disabled={!newContact.name || !newContact.phone_number}
                className="h-10 px-5 rounded-full text-xs font-bold bg-zinc-950 hover:bg-zinc-800 text-white transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                Save Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

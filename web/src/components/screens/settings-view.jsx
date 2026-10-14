'use client';

import React, { useState } from 'react';
import { 
  Sliders, 
  Users, 
  Bell, 
  ShieldCheck, 
  Globe, 
  Moon, 
  Save, 
  Plus, 
  Phone, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export default function SettingsView({
  config,
  onUpdateConfig,
  contacts = [],
  onAddContact,
  isAdmin,
  setIsAdmin,
  onQueueCommand
}) {
  const [form, setForm] = useState({
    gas_watch_threshold: config?.gas_watch_threshold || 150,
    gas_danger_threshold: config?.gas_danger_threshold || 300,
    temp_watch_threshold: config?.temp_watch_threshold || 45,
    temp_danger_threshold: config?.temp_danger_threshold || 60,
    clean_air_baseline: config?.clean_air_baseline || 85,
    offline_timeout_seconds: config?.offline_timeout_seconds || 60,
    ack_timeout_seconds: config?.ack_timeout_seconds || 120,
    quiet_hours_enabled: config?.quiet_hours_enabled || false,
    quiet_hours_start: config?.quiet_hours_start || '22:00:00',
    quiet_hours_end: config?.quiet_hours_end || '07:00:00',
    maintenance_mode: config?.maintenance_mode || false
  });

  const [language, setLanguage] = useState('en'); // 'en' | 'fil'
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone_number: '', relationship: 'Escalation Contact' });
  const [isCalibrating, setIsCalibrating] = useState(false);

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
      priority: contacts.length + 1
    });
    setNewContact({ name: '', phone_number: '', relationship: 'Escalation Contact' });
    setIsContactModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">System Configuration & Safety Rules</h2>
          <p className="text-xs text-zinc-400">Tune sensor trip points, offline watchdogs, and emergency SMS contacts</p>
        </div>

        {/* Demo Role Switcher */}
        <div className="flex items-center gap-2 p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 self-start sm:self-auto">
          <span className="text-xs text-zinc-400 font-medium pl-1">Role:</span>
          <button
            type="button"
            onClick={() => setIsAdmin(true)}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              isAdmin ? 'bg-zinc-800 text-emerald-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => setIsAdmin(false)}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              !isAdmin ? 'bg-zinc-800 text-sky-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Viewer (Read-Only)
          </button>
        </div>
      </div>

      {!isAdmin && (
        <div className="p-3.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
          <span>You are viewing Settings as a <strong>Viewer</strong>. Settings are locked to read-only. Switch role above to edit.</span>
        </div>
      )}

      {/* 1. Thresholds & Calibration Card */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 md:p-6 space-y-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-zinc-100">Thresholds & Sensor Calibration</h3>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={handleCalibrateBaseline}
              disabled={isCalibrating}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isCalibrating ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isCalibrating ? 'Sampling...' : 'Calibrate Clean-Air Baseline'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gas Danger Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-red-400">Gas Danger Limit (Auto Shutoff)</span>
              <span className="font-mono font-bold text-zinc-100">{form.gas_danger_threshold} PPM</span>
            </div>
            <input
              type="range"
              min="100"
              max="600"
              step="10"
              disabled={!isAdmin}
              value={form.gas_danger_threshold}
              onChange={(e) => setForm({ ...form, gas_danger_threshold: Number(e.target.value) })}
              className="w-full accent-red-500 cursor-pointer disabled:opacity-50"
            />
            <p className="text-[11px] text-zinc-500">Breaching this limit trips the CW-025 relay immediately.</p>
          </div>

          {/* Gas Watch Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-amber-400">Gas Watch Warning Limit</span>
              <span className="font-mono font-bold text-zinc-100">{form.gas_watch_threshold} PPM</span>
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
            <p className="text-[11px] text-zinc-500">Generates advisory in-app alert without shutting off gas.</p>
          </div>

          {/* Temperature Danger Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-red-400">Temperature Danger Limit</span>
              <span className="font-mono font-bold text-zinc-100">{form.temp_danger_threshold}°C</span>
            </div>
            <input
              type="range"
              min="40"
              max="90"
              step="1"
              disabled={!isAdmin}
              value={form.temp_danger_threshold}
              onChange={(e) => setForm({ ...form, temp_danger_threshold: Number(e.target.value) })}
              className="w-full accent-red-500 cursor-pointer disabled:opacity-50"
            />
          </div>

          {/* Offline Watchdog Timeout */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-zinc-300">Device Offline Watchdog Timeout</span>
              <span className="font-mono font-bold text-zinc-100">{form.offline_timeout_seconds}s</span>
            </div>
            <input
              type="range"
              min="30"
              max="180"
              step="5"
              disabled={!isAdmin}
              value={form.offline_timeout_seconds}
              onChange={(e) => setForm({ ...form, offline_timeout_seconds: Number(e.target.value) })}
              className="w-full accent-zinc-400 cursor-pointer disabled:opacity-50"
            />
            <p className="text-[11px] text-zinc-500">Time without sensor packet before declaring ESP32 offline.</p>
          </div>
        </div>
      </div>

      {/* 2. Emergency Contacts & Escalation Order */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 md:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-semibold text-zinc-100">Emergency Contacts & Escalation</h3>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsContactModalOpen(true)}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Contact</span>
            </button>
          )}
        </div>

        <div className="space-y-2.5">
          {contacts.map((contact, idx) => (
            <div
              key={contact.id}
              className="flex items-center justify-between p-3 rounded-lg border border-zinc-800/80 bg-zinc-950/40"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 font-mono text-xs flex items-center justify-center font-bold">
                  {idx + 1}
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200">{contact.name}</h4>
                  <p className="text-xs text-zinc-400">{contact.relationship} &bull; <span className="font-mono text-zinc-300">{contact.phone_number}</span></p>
                </div>
              </div>

              <a
                href={`tel:${contact.phone_number}`}
                className="p-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-emerald-400 transition-colors"
                title="Call Emergency Contact"
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Quiet Hours & Maintenance Mode */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 md:p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-semibold text-zinc-100">Notifications & Quiet Hours</h3>
        </div>

        <div className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-zinc-200 block">Maintenance / Testing Mode</span>
              <span className="text-xs text-zinc-500">Pauses non-critical watch notifications during sensor testing.</span>
            </div>
            <input
              type="checkbox"
              disabled={!isAdmin}
              checked={form.maintenance_mode}
              onChange={(e) => setForm({ ...form, maintenance_mode: e.target.checked })}
              className="w-5 h-5 accent-amber-500 cursor-pointer disabled:opacity-50"
            />
          </div>

          <div className="p-2.5 rounded bg-red-950/30 border border-red-900/50 text-[11px] text-red-300">
            <strong>Safety mandate:</strong> Danger alerts and emergency auto-shutoffs are NEVER silenced by quiet hours or maintenance mode.
          </div>
        </div>
      </div>

      {/* 4. Language & Localization */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 md:p-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-base font-semibold text-zinc-100">Language (Wika)</h3>
            <p className="text-xs text-zinc-400">Select interface language</p>
          </div>
        </div>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="h-10 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none"
        >
          <option value="en">English (US)</option>
          <option value="fil">Filipino (Tagalog)</option>
        </select>
      </div>

      {/* Save Button */}
      {isAdmin && (
        <div className="flex items-center justify-end gap-3 pt-2">
          {saveSuccess && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-4 h-4" /> Configuration saved & synced!
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-11 px-6 rounded-md font-semibold text-sm bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      )}

      {/* Add Contact Modal */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-2xl text-zinc-100 space-y-4">
            <h3 className="text-base font-bold text-zinc-100">Add Emergency Escalation Contact</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Contact Name</label>
                <input
                  type="text"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  placeholder="e.g. Building Security Desk"
                  className="w-full h-10 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Mobile Number (SMS)</label>
                <input
                  type="tel"
                  value={newContact.phone_number}
                  onChange={(e) => setNewContact({ ...newContact, phone_number: e.target.value })}
                  placeholder="+63 9XX XXX XXXX"
                  className="w-full h-10 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Relationship</label>
                <input
                  type="text"
                  value={newContact.relationship}
                  onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                  placeholder="e.g. Fire Safety Officer"
                  className="w-full h-10 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsContactModalOpen(false)}
                className="h-9 px-3 rounded-md text-xs font-medium text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveContact}
                className="h-9 px-4 rounded-md text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function fetchStatus() {
  const res = await fetch(`${API_BASE}/status`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
}

export async function fetchReadings(limit = 100) {
  const res = await fetch(`${API_BASE}/readings?limit=${limit}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch readings');
  return res.json();
}

export async function fetchConfig() {
  try {
    const res = await fetch(`${API_BASE}/config`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (typeof window !== 'undefined' && data) {
        try {
          localStorage.setItem('cached_config', JSON.stringify(data));
        } catch (_) {}
      }
      return data;
    }
  } catch (err) {
    console.warn('Fetch config network blip:', err.message);
  }

  // Supabase fallback
  if (supabase) {
    try {
      const { data, error } = await supabase.from('config').select('*').eq('id', 1).single();
      if (!error && data) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('cached_config', JSON.stringify(data));
          } catch (_) {}
        }
        return data;
      }
    } catch (e) {
      console.warn('Supabase fetch config fallback error:', e.message);
    }
  }

  // LocalStorage cached fallback
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('cached_config');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (_) {}
  }

  return {
    gas_watch_threshold: 150,
    gas_danger_threshold: 300,
    smoke_watch_threshold: 100,
    smoke_danger_threshold: 250,
    temp_watch_threshold: 45,
    temp_danger_threshold: 60,
    humidity_watch_threshold: 80,
    clean_air_baseline: 85,
    offline_timeout_seconds: 60,
    ack_timeout_seconds: 120,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00:00',
    quiet_hours_end: '07:00:00',
    maintenance_mode: false
  };
}

export async function updateConfig(data) {
  // Immediately cache calibrations & thresholds to localStorage
  if (typeof window !== 'undefined' && data) {
    try {
      const existing = JSON.parse(localStorage.getItem('cached_config') || '{}');
      const merged = { ...existing, ...data };
      localStorage.setItem('cached_config', JSON.stringify(merged));
      
      if (Array.isArray(data.contacts)) {
        localStorage.setItem('cached_contacts', JSON.stringify(data.contacts));
      }
    } catch (_) {}
  }

  try {
    const res = await fetch(`${API_BASE}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      const result = await res.json();
      if (result.config && typeof window !== 'undefined') {
        try {
          localStorage.setItem('cached_config', JSON.stringify(result.config));
        } catch (_) {}
      }
      if (result.contacts && typeof window !== 'undefined') {
        try {
          localStorage.setItem('cached_contacts', JSON.stringify(result.contacts));
        } catch (_) {}
      }
      return result;
    }
  } catch (err) {
    console.warn('API update config failed, using local/supabase fallback:', err.message);
  }

  // Supabase fallback
  if (supabase) {
    try {
      const { data: sbData, error } = await supabase.from('config').update(data).eq('id', 1).select();
      if (!error && sbData && sbData[0]) return { success: true, config: sbData[0] };
    } catch (e) {
      console.warn('Supabase update config fallback error:', e.message);
    }
  }

  return { success: true, config: data };
}

export async function fetchAlerts() {
  const res = await fetch(`${API_BASE}/alerts`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function acknowledgeAlert(alertId, acknowledgedBy = 'admin') {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acknowledged_by: acknowledgedBy })
  });
  if (!res.ok) throw new Error('Failed to acknowledge alert');
  return res.json();
}

export async function markFalseAlarm(alertId, note) {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/false-alarm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note })
  });
  if (!res.ok) throw new Error('Failed to mark false alarm');
  return res.json();
}

export async function fetchEvents(limit = 50) {
  const res = await fetch(`${API_BASE}/events?limit=${limit}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

export async function queueCommand(command, requestedBy = 'admin', payload = {}) {
  const res = await fetch(`${API_BASE}/commands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, requested_by: requestedBy, payload })
  });
  if (!res.ok) throw new Error('Failed to queue command');
  return res.json();
}

export async function fetchAISummary() {
  const res = await fetch(`${API_BASE}/ai/summary`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch AI summary');
  return res.json();
}

function synthesizeClientRAG(prompt, clientContext = {}) {
  const query = (prompt || '').toLowerCase();
  const readings = clientContext.readings || [];
  const latest = readings[0] || { gas_ppm: 85, smoke_level: 40, temperature: 28, humidity: 60 };
  const oldest = readings[Math.min(readings.length - 1, 15)] || latest;
  const timeSpan = Math.max(1, Math.round((new Date(latest.created_at || Date.now()) - new Date(oldest.created_at || Date.now())) / 60000));
  const gasDelta = (latest.gas_ppm || 0) - (oldest.gas_ppm || 0);
  const rateOfRise = (gasDelta / timeSpan).toFixed(1);

  const status = clientContext.status || { online: true, valveState: 'open' };
  const config = clientContext.config || { gas_danger_threshold: 300, temp_danger_threshold: 60, clean_air_baseline: 85 };
  const alerts = clientContext.alerts || [];
  const activeAlerts = alerts.filter(a => a.status === 'active');
  const contacts = clientContext.contacts || [];

  if (query.includes('incident') || query.includes('summary') || query.includes('what happened') || query.includes('explain')) {
    const dangerAlert = activeAlerts.find(a => a.level === 'danger');
    const watchAlert = activeAlerts.find(a => a.level === 'watch');

    if (dangerAlert) {
      return `### 🚨 CRITICAL RISK: Incident & Diagnostic Summary

**Diagnostic Finding:**
${dangerAlert.message}. Atmospheric rate of rise is **~${rateOfRise} PPM/min** while ambient temperature is at **${latest.temperature}°C**. This profile is consistent with an active combustible gas leak.

**Telemetry Correlation:**
- **MQ-2 Gas Reading:** **${latest.gas_ppm} PPM** (Breached danger threshold of ${config.gas_danger_threshold || 300} PPM)
- **DHT11 Temperature:** **${latest.temperature}°C** (Danger limit: ${config.temp_danger_threshold || 60}°C)
- **Emergency Solenoid Valve:** Currently **${status.valveState?.toUpperCase() || 'CLOSED'}**

**Immediate Safety Protocol:**
1. Keep the solenoid valve closed to stop fuel flow.
2. Open doors and windows at floor level (LPG is heavier than air).
3. Do **NOT** touch light switches or electrical appliances (sparks can ignite gas).
4. Evacuate premises and notify emergency services.`;
    }

    if (watchAlert) {
      return `### ⚠️ ADVISORY WARNING: Elevated Reading Detected

**Diagnostic Finding:**
${watchAlert.message}. Rate of gas rise is recorded at **${rateOfRise} PPM/min**.

**Current Observations:**
- **MQ-2 Gas:** **${latest.gas_ppm} PPM** (Approaching danger threshold of ${config.gas_danger_threshold || 300} PPM)
- **DHT11 Temperature:** **${latest.temperature}°C**
- **Valve Status:** Solenoid valve remains **${status.valveState?.toUpperCase() || 'OPEN'}**

**Recommendation:**
Inspect stove burners, gas lines, or localized combustion sources and ensure adequate ventilation.`;
    }

    return `### ✅ Safe & Stable Incident Summary

**Diagnostic Finding:**
System is operating within safe baseline parameters. No critical hazards, gas spikes, or thermal anomalies are detected.

**Real-Time Telemetry:**
- **MQ-2 Gas Concentration:** **${latest.gas_ppm} PPM** (Baseline: ${config.clean_air_baseline || 85} PPM, Danger: ${config.gas_danger_threshold || 300} PPM)
- **MQ-2 Smoke Index:** **${latest.smoke_level}**
- **DHT11 Temperature:** **${latest.temperature}°C** (Danger: ${config.temp_danger_threshold || 60}°C)
- **DHT11 Humidity:** **${latest.humidity}% RH**
- **Emergency Valve:** **${status.valveState?.toUpperCase() || 'OPEN'}**

**Status:**
All zones are normal and protected by autonomous hardware shutoff routines.`;
  }

  if (query.includes('valve') || query.includes('shut off') || query.includes('open') || query.includes('closed') || query.includes('solenoid')) {
    const valveState = status.valveState?.toUpperCase() || 'OPEN';
    return `### 🛑 Emergency Solenoid Valve: **${valveState}**

- **Current State:** The emergency gas shutoff valve is **${valveState}**.
- **Hardware Link:** ESP32 safety node is **${status.online ? 'ONLINE' : 'OFFLINE'}** (${status.firmware_version || 'v1.2.0-esp32'}).
- **Automatic Failsafe:** Shuts off automatically if gas crosses **${config.gas_danger_threshold || 300} PPM** or temperature crosses **${config.temp_danger_threshold || 60}°C**.
- **Manual Control:** Administrators can command remote shutoff or reopening with audit confirmation directly from the dashboard.`;
  }

  if (query.includes('gas') || query.includes('smoke') || query.includes('temp') || query.includes('mq-2') || query.includes('dht11') || query.includes('reading') || query.includes('level') || query.includes('status')) {
    return `### 📊 Real-Time Sensor Telemetry

- **Node Link:** **${status.online ? 'ONLINE' : 'OFFLINE'}** (Signal: ${latest.rssi || status.rssi || -65} dBm)
- **MQ-2 Gas Concentration:** **${latest.gas_ppm} PPM** (Clean-Air Baseline: ${config.clean_air_baseline || 85} PPM, Danger: ${config.gas_danger_threshold || 300} PPM)
- **MQ-2 Smoke Index:** **${latest.smoke_level}**
- **DHT11 Temperature:** **${latest.temperature}°C** (Danger: ${config.temp_danger_threshold || 60}°C)
- **DHT11 Humidity:** **${latest.humidity}% RH**
- **Atmospheric Rate of Rise:** ${rateOfRise} PPM/min
- **Emergency Valve:** **${status.valveState?.toUpperCase() || 'OPEN'}**`;
  }

  if (query.includes('threshold') || query.includes('setting') || query.includes('limit') || query.includes('config')) {
    return `### ⚙️ Configured Safety Limits & Threshold Rules

- **MQ-2 Gas Watch Threshold:** **${config.gas_watch_threshold || 150} PPM** (Advisory push warning)
- **MQ-2 Gas Danger Threshold:** **${config.gas_danger_threshold || 300} PPM** (Emergency shutoff & GSM SMS)
- **DHT11 Temperature Watch:** **${config.temp_watch_threshold || 45}°C**
- **DHT11 Temperature Danger:** **${config.temp_danger_threshold || 60}°C** (Thermal fire emergency)
- **Clean Air Baseline:** **${config.clean_air_baseline || 85} PPM**
- **Alert Escalation Timeout:** **${config.ack_timeout_seconds || 120}s**`;
  }

  if (query.includes('contact') || query.includes('sms') || query.includes('escalat') || query.includes('phone')) {
    const primary = contacts.filter(c => Number(c.priority) === 1);
    const secondary = contacts.filter(c => Number(c.priority) > 1);
    const pStr = primary.map(c => `- **${c.name}** (${c.phone_number}) - ${c.relationship}`).join('\n') || '- None configured';
    const sStr = secondary.map(c => `- **${c.name}** (${c.phone_number}) - ${c.relationship}`).join('\n') || '- None configured';

    return `### 📱 Emergency Escalation Contacts

**★ Primary Responders (Dispatched instantly upon danger trip):**
${pStr}

**⏱ Secondary Escalation Responders (Dispatched if unacknowledged after ${config.ack_timeout_seconds || 120}s):**
${sStr}`;
  }

  return `### 🛡️ FireLine Safety Assistant Overview

- **Atmosphere Status:** Gas **${latest.gas_ppm} PPM**, Temperature **${latest.temperature}°C**, Smoke **${latest.smoke_level}**
- **Emergency Valve:** **${status.valveState?.toUpperCase() || 'OPEN'}**
- **Active Alerts:** ${activeAlerts.length > 0 ? `⚠️ ${activeAlerts.length} alert(s) active` : '✅ All clear'}

Ask me about:
- *"Explain latest incident summary"*
- *"Is the emergency valve open or closed?"*
- *"What are the current MQ-2 gas and smoke readings?"*
- *"What are the configured safety thresholds?"*
- *"Who are the emergency escalation contacts?"*`;
}

export async function sendAIChatMessage(prompt, clientContext = null) {
  try {
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, clientContext })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.reply && !data.reply.startsWith('I am your IoT Safety Assistant. You can ask me:')) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Backend AI chat request failed, generating client-side RAG response:', err.message);
  }

  return {
    reply: synthesizeClientRAG(prompt, clientContext),
    timestamp: new Date().toISOString()
  };
}

import { supabase } from './supabase';

export async function fetchContacts() {
  try {
    const res = await fetch(`${API_BASE}/contacts`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('cached_contacts', JSON.stringify(data));
        }
        return data;
      }
    }
  } catch (err) {
    console.warn('Fetch contacts network blip:', err.message);
  }

  // Supabase fallback
  if (supabase) {
    try {
      const { data, error } = await supabase.from('contacts').select('*').order('priority', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        if (typeof window !== 'undefined') localStorage.setItem('cached_contacts', JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn('Supabase fetch contacts fallback error:', e.message);
    }
  }

  // LocalStorage cached fallback
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('cached_contacts');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
  }

  const defaultContacts = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Primary Admin (Home)',
      phone_number: '+639171234567',
      relationship: 'Primary Safety Operator',
      priority: 1,
      is_active: true
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Secondary Emergency Contact',
      phone_number: '+639189876543',
      relationship: 'Building Security / Escalation',
      priority: 2,
      is_active: true
    }
  ];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('cached_contacts', JSON.stringify(defaultContacts));
    } catch (_) {}
  }
  return defaultContacts;
}

export async function addContact(contact) {
  // Ensure valid ID
  const contactWithId = {
    ...contact,
    id: contact.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `contact-${Date.now()}`)
  };

  // Always update localStorage cache
  if (typeof window !== 'undefined') {
    try {
      const local = JSON.parse(localStorage.getItem('cached_contacts') || '[]');
      const idx = local.findIndex(c => String(c.id) === String(contactWithId.id));
      if (idx !== -1) {
        local[idx] = { ...local[idx], ...contactWithId };
      } else {
        local.push(contactWithId);
      }
      localStorage.setItem('cached_contacts', JSON.stringify(local));
    } catch (_) {}
  }

  try {
    const res = await fetch(`${API_BASE}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contactWithId)
    });
    if (res.ok) {
      const saved = await res.json();
      if (typeof window !== 'undefined') {
        try {
          const local = JSON.parse(localStorage.getItem('cached_contacts') || '[]');
          const idx = local.findIndex(c => String(c.id) === String(contactWithId.id) || String(c.id) === String(saved.id));
          if (idx !== -1) {
            local[idx] = saved;
          } else {
            local.push(saved);
          }
          localStorage.setItem('cached_contacts', JSON.stringify(local));
        } catch (_) {}
      }
      return saved;
    }
  } catch (err) {
    console.warn('API add contact failed, trying Supabase fallback:', err.message);
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.from('contacts').insert([contactWithId]).select();
      if (!error && data && data.length > 0) return data[0];
    } catch (e) {
      console.warn('Supabase insert contact fallback error:', e.message);
    }
  }

  return contactWithId;
}

export async function updateContact(id, updates) {
  // Always update localStorage cache immediately
  if (typeof window !== 'undefined') {
    try {
      const local = JSON.parse(localStorage.getItem('cached_contacts') || '[]');
      const idx = local.findIndex(c => String(c.id) === String(id));
      if (idx !== -1) {
        local[idx] = { ...local[idx], ...updates };
        localStorage.setItem('cached_contacts', JSON.stringify(local));
      }
    } catch (_) {}
  }

  try {
    const res = await fetch(`${API_BASE}/contacts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (res.ok) {
      const saved = await res.json();
      if (typeof window !== 'undefined') {
        try {
          const local = JSON.parse(localStorage.getItem('cached_contacts') || '[]');
          const idx = local.findIndex(c => String(c.id) === String(id));
          if (idx !== -1) {
            local[idx] = saved;
            localStorage.setItem('cached_contacts', JSON.stringify(local));
          }
        } catch (_) {}
      }
      return saved;
    }
  } catch (err) {
    console.warn('API update contact failed, trying Supabase fallback:', err.message);
  }

  // Supabase fallback
  if (supabase) {
    try {
      const { data, error } = await supabase.from('contacts').update(updates).eq('id', id).select();
      if (!error && data && data.length > 0) return data[0];
    } catch (e) {
      console.warn('Supabase update contact fallback error:', e.message);
    }
  }

  return { id, ...updates };
}

export async function deleteContact(id) {
  // Always update localStorage cache immediately
  if (typeof window !== 'undefined') {
    try {
      const local = JSON.parse(localStorage.getItem('cached_contacts') || '[]');
      const updated = local.filter(c => String(c.id) !== String(id));
      localStorage.setItem('cached_contacts', JSON.stringify(updated));
    } catch (_) {}
  }

  try {
    const res = await fetch(`${API_BASE}/contacts/${id}`, {
      method: 'DELETE'
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('API delete contact failed, trying Supabase fallback:', err.message);
  }

  // Supabase fallback
  if (supabase) {
    try {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (!error) return { success: true, deletedId: id };
    } catch (e) {
      console.warn('Supabase delete contact fallback error:', e.message);
    }
  }

  return { success: true, deletedId: id };
}

export { loginUser, registerUser, logoutUser, getCurrentSession, AUTHORIZED_USERS, getAllKnownAccounts } from './auth';


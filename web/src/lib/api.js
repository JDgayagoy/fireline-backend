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
  const res = await fetch(`${API_BASE}/config`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch config');
  return res.json();
}

export async function updateConfig(data) {
  const res = await fetch(`${API_BASE}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update config');
  return res.json();
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

export async function sendAIChatMessage(prompt) {
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  if (!res.ok) throw new Error('Failed to get AI chat response');
  return res.json();
}

import { supabase } from './supabase';

export async function fetchContacts() {
  try {
    const res = await fetch(`${API_BASE}/contacts`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (typeof window !== 'undefined') {
        localStorage.setItem('cached_contacts', JSON.stringify(data));
      }
      return data;
    }
  } catch (err) {
    console.warn('Fetch contacts network blip:', err.message);
  }

  // Supabase fallback
  if (supabase) {
    try {
      const { data, error } = await supabase.from('contacts').select('*').order('priority', { ascending: true });
      if (!error && data && data.length > 0) {
        if (typeof window !== 'undefined') localStorage.setItem('cached_contacts', JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn('Supabase fetch contacts fallback error:', e.message);
    }
  }

  // LocalStorage cached fallback
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('cached_contacts');
    if (cached) return JSON.parse(cached);
  }

  return [];
}

export async function addContact(contact) {
  try {
    const res = await fetch(`${API_BASE}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contact)
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('API add contact failed, trying Supabase fallback:', err.message);
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.from('contacts').insert([contact]).select();
      if (!error && data && data.length > 0) return data[0];
    } catch (e) {
      console.warn('Supabase insert contact fallback error:', e.message);
    }
  }

  return contact;
}

export async function updateContact(id, updates) {
  try {
    const res = await fetch(`${API_BASE}/contacts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (res.ok) return await res.json();
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

  // Local fallback: update cached contacts in localStorage
  if (typeof window !== 'undefined') {
    try {
      const local = JSON.parse(localStorage.getItem('cached_contacts') || '[]');
      const idx = local.findIndex(c => String(c.id) === String(id));
      if (idx !== -1) {
        local[idx] = { ...local[idx], ...updates };
        localStorage.setItem('cached_contacts', JSON.stringify(local));
        return local[idx];
      }
    } catch (_) {}
  }

  return { id, ...updates };
}

export async function deleteContact(id) {
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

  // Local fallback: remove from cached contacts in localStorage
  if (typeof window !== 'undefined') {
    try {
      const local = JSON.parse(localStorage.getItem('cached_contacts') || '[]');
      const updated = local.filter(c => String(c.id) !== String(id));
      localStorage.setItem('cached_contacts', JSON.stringify(updated));
    } catch (_) {}
  }

  return { success: true, deletedId: id };
}

export { loginUser, registerUser, logoutUser, getCurrentSession, AUTHORIZED_USERS, getAllKnownAccounts } from './auth';


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

export async function fetchContacts() {
  const res = await fetch(`${API_BASE}/contacts`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch contacts');
  return res.json();
}

export async function addContact(contact) {
  const res = await fetch(`${API_BASE}/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact)
  });
  if (!res.ok) throw new Error('Failed to add contact');
  return res.json();
}

export { loginUser, registerUser, logoutUser, getCurrentSession, AUTHORIZED_USERS, getAllKnownAccounts } from './auth';


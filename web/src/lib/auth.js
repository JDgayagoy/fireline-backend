// Authentication Service for FireLine Gas & Fire Safety PWA
// Supports Supabase Auth, Backend Express API, and PWA Offline Resilience

import { supabase } from './supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const AUTH_STORAGE_KEY = 'fireline_auth_session';
const REGISTERED_ACCOUNTS_KEY = 'fireline_registered_accounts';

export const AUTHORIZED_USERS = [
  {
    email: 'admin@test.com',
    password: '1234',
    altPasswords: ['admin123'],
    name: 'Safety Admin',
    role: 'admin',
    title: 'Operations Admin',
    description: 'Autonomous monitoring, alert acknowledgment, and remote solenoid valve shutoff control.'
  },
  {
    email: 'superadmin@test.com',
    password: '1234',
    altPasswords: ['admin123'],
    name: 'Super Admin',
    role: 'superadmin',
    title: 'Root Supervisor',
    description: 'Root access: baseline recalibration, safety threshold tuning, emergency contact escalation, and valve override.'
  }
];

/**
 * Retrieve locally stored registered accounts (for offline PWA support)
 */
export function getRegisteredAccounts() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REGISTERED_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read registered accounts:', e);
    return [];
  }
}

/**
 * Save a newly registered account locally
 */
export function saveRegisteredAccount(account) {
  if (typeof window === 'undefined') return;
  try {
    const accounts = getRegisteredAccounts();
    const existingIndex = accounts.findIndex(
      (a) => a.email.toLowerCase() === account.email.toLowerCase()
    );
    if (existingIndex >= 0) {
      accounts[existingIndex] = { ...accounts[existingIndex], ...account };
    } else {
      accounts.push(account);
    }
    localStorage.setItem(REGISTERED_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save registered account locally:', e);
  }
}

/**
 * Helper to determine user title from role
 */
export function getTitleForRole(role) {
  switch (role) {
    case 'superadmin':
      return 'Root Supervisor';
    case 'viewer':
      return 'Safety Auditor';
    case 'admin':
    default:
      return 'Safety Officer';
  }
}

/**
 * Helper to get description from role
 */
export function getDescriptionForRole(role) {
  switch (role) {
    case 'superadmin':
      return 'Full root privilege: threshold calibration, hardware override, and emergency contacts.';
    case 'viewer':
      return 'Telemetry auditor: read-only access to gauges, live sensors, incident log, and alerts.';
    case 'admin':
    default:
      return 'Standard operator: live sensor monitoring, alert acknowledgment, and remote solenoid valve control.';
  }
}

/**
 * Sign Up a new user with email, password, full name, and role
 */
export async function registerUser({ email, password, name, role = 'admin' }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '');
  const cleanName = String(name || '').trim() || cleanEmail.split('@')[0];
  const cleanRole = ['admin', 'viewer', 'superadmin'].includes(role) ? role : 'admin';

  // Basic validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    throw new Error('Please enter a valid email address.');
  }

  if (cleanPassword.length < 6) {
    throw new Error('Security passcode must be at least 6 characters long.');
  }

  // Check if account matches default credentials
  if (AUTHORIZED_USERS.some(u => u.email.toLowerCase() === cleanEmail)) {
    throw new Error('An account with this email already exists.');
  }

  const userProfile = {
    email: cleanEmail,
    name: cleanName,
    role: cleanRole,
    title: getTitleForRole(cleanRole),
    description: getDescriptionForRole(cleanRole)
  };

  let registeredSuccessfully = false;
  let authToken = null;

  // 1. Attempt registration via backend API
  try {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        password: cleanPassword,
        name: cleanName,
        role: cleanRole
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.user) {
        userProfile.id = data.user.id || userProfile.id;
        userProfile.name = data.user.name || userProfile.name;
        userProfile.role = data.user.role || userProfile.role;
        userProfile.title = data.user.title || userProfile.title;
        authToken = data.token || `fl_token_${Date.now()}`;
        registeredSuccessfully = true;
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      if (res.status === 409) {
        throw new Error(errData.error || 'An account with this email already exists.');
      } else if (res.status === 400) {
        throw new Error(errData.error || 'Invalid registration details provided.');
      }
      // If 404 (endpoint not deployed on Render yet), let it fall through to Supabase/offline
    }
  } catch (err) {
    if (err.message && (err.message.includes('already exists') || err.message.includes('valid email') || err.message.includes('characters long'))) {
      throw err;
    }
    console.warn('Backend signup unavailable, falling back to direct Supabase / local registry:', err.message);
  }

  // 2. If backend didn't handle it, attempt direct Supabase Auth
  if (!registeredSuccessfully && supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            name: cleanName,
            role: cleanRole,
            title: userProfile.title
          }
        }
      });

      if (error) {
        if (error.message?.toLowerCase().includes('already registered')) {
          throw new Error('An account with this email already exists.');
        }
        console.warn('Supabase direct signUp returned error:', error.message);
      } else if (data?.user) {
        userProfile.id = data.user.id;
        authToken = data.session?.access_token || `fl_sb_${btoa(`${cleanEmail}:${Date.now()}`)}`;
        registeredSuccessfully = true;
      }
    } catch (sbErr) {
      if (sbErr.message && sbErr.message.includes('already exists')) {
        throw sbErr;
      }
      console.warn('Supabase direct signUp error:', sbErr.message);
    }
  }

  // 3. Save to local registered accounts for offline PWA persistence
  saveRegisteredAccount({
    ...userProfile,
    password: cleanPassword,
    registeredAt: new Date().toISOString()
  });

  // If authToken was not created by backend/Supabase, generate local token
  if (!authToken) {
    authToken = `fl_local_${btoa(`${cleanEmail}:${Date.now()}`)}`;
  }

  // Establish active session immediately
  saveSession(userProfile, authToken);

  return userProfile;
}

/**
 * Log in with email and password
 */
export async function loginUser(email, password) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '');

  if (!cleanEmail || !cleanPassword) {
    throw new Error('Please enter both email and password.');
  }

  // 1. Try remote backend API first
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.user) {
        const user = {
          ...data.user,
          title: data.user.title || getTitleForRole(data.user.role),
          description: data.user.description || getDescriptionForRole(data.user.role)
        };
        saveSession(user, data.token || `fl_token_${Date.now()}`);
        return user;
      }
    } else if (res.status === 401) {
      const errData = await res.json().catch(() => ({}));
      // If backend says invalid, don't stop yet if we have local accounts or direct Supabase
      console.warn('Backend 401, checking direct Supabase & local storage accounts...');
    }
  } catch (err) {
    console.warn('Backend auth unreachable or network offline. Validating with Supabase / local registry.');
  }

  // 2. Try direct Supabase Auth
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword
      });

      if (!error && data?.user) {
        const role = data.user.user_metadata?.role || 'admin';
        const name = data.user.user_metadata?.name || cleanEmail.split('@')[0];
        const user = {
          id: data.user.id,
          email: data.user.email,
          name,
          role,
          title: getTitleForRole(role),
          description: getDescriptionForRole(role)
        };
        const token = data.session?.access_token || `fl_sb_${btoa(`${cleanEmail}:${Date.now()}`)}`;
        saveSession(user, token);
        return user;
      }
    } catch (sbErr) {
      console.warn('Direct Supabase sign-in error:', sbErr.message);
    }
  }

  // 3. Check pre-configured authorized users
  const defaultMatched = AUTHORIZED_USERS.find(
    (u) => u.email.toLowerCase() === cleanEmail && 
      (u.password === cleanPassword || (u.altPasswords && u.altPasswords.includes(cleanPassword)))
  );

  if (defaultMatched) {
    const user = {
      email: defaultMatched.email,
      name: defaultMatched.name,
      role: defaultMatched.role,
      title: defaultMatched.title || getTitleForRole(defaultMatched.role),
      description: defaultMatched.description || getDescriptionForRole(defaultMatched.role)
    };
    const token = `fl_offline_${btoa(`${defaultMatched.email}:${Date.now()}`)}`;
    saveSession(user, token);
    return user;
  }

  // 4. Check locally registered accounts (PWA offline persistence)
  const localAccounts = getRegisteredAccounts();
  const localMatched = localAccounts.find(
    (u) => u.email.toLowerCase() === cleanEmail && u.password === cleanPassword
  );

  if (localMatched) {
    const user = {
      id: localMatched.id,
      email: localMatched.email,
      name: localMatched.name,
      role: localMatched.role || 'admin',
      title: localMatched.title || getTitleForRole(localMatched.role),
      description: localMatched.description || getDescriptionForRole(localMatched.role)
    };
    const token = `fl_offline_${btoa(`${localMatched.email}:${Date.now()}`)}`;
    saveSession(user, token);
    return user;
  }

  throw new Error('Invalid email or password. Please verify your credentials or create an account.');
}

/**
 * Save auth session to localStorage
 */
export function saveSession(user, token) {
  if (typeof window === 'undefined') return;
  try {
    const sessionData = {
      user,
      token,
      loggedInAt: new Date().toISOString()
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
  } catch (e) {
    console.error('Failed to save auth session:', e);
  }
}

/**
 * Retrieve current active session
 */
export function getCurrentSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    const sessionEmail = session?.user?.email?.toLowerCase();

    if (!sessionEmail) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    // Check if user is among default accounts
    const isDefault = AUTHORIZED_USERS.some(
      (u) => u.email.toLowerCase() === sessionEmail
    );

    // Check if user is among registered accounts
    const isRegistered = getRegisteredAccounts().some(
      (u) => u.email.toLowerCase() === sessionEmail
    );

    // If user has a valid session object with role and email, preserve it
    if (isDefault || isRegistered || session?.token) {
      return session?.user || null;
    }

    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  } catch (e) {
    console.error('Error reading auth session:', e);
    return null;
  }
}

/**
 * Sign out user
 */
export async function logoutUser() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
  } catch (e) {
    console.error('Failed to remove auth session:', e);
  }
}

/**
 * Get all available accounts (defaults + locally registered) for easy testing and switching
 */
export function getAllKnownAccounts() {
  const local = getRegisteredAccounts().map(a => ({
    email: a.email,
    name: a.name,
    role: a.role,
    title: a.title || getTitleForRole(a.role)
  }));

  const defaults = AUTHORIZED_USERS.map(a => ({
    email: a.email,
    name: a.name,
    role: a.role,
    title: a.title
  }));

  const map = new Map();
  [...defaults, ...local].forEach(acc => {
    map.set(acc.email.toLowerCase(), acc);
  });

  return Array.from(map.values());
}

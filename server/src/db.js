import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

if (supabase) {
  console.log('✅ Connected to Supabase at:', supabaseUrl);
} else {
  console.log('⚠️ Running with in-memory store (Set SUPABASE_URL and SUPABASE_KEY to use live Postgres)');
}

// In-Memory store with file-system persistence fallback
export const memoryStore = {
  config: {
    id: 1,
    device_id: 'esp32_main',
    gas_watch_threshold: 150.0,
    gas_danger_threshold: 300.0,
    smoke_watch_threshold: 100.0,
    smoke_danger_threshold: 250.0,
    temp_watch_threshold: 45.0,
    temp_danger_threshold: 60.0,
    clean_air_baseline: 85.0,
    offline_timeout_seconds: 60,
    ack_timeout_seconds: 120,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00:00',
    quiet_hours_end: '07:00:00',
    maintenance_mode: false,
    valve_state: 'open' // 'open' | 'closed'
  },
  readings: [],
  alerts: [],
  commands: [],
  users: [],
  events: [
    {
      id: 'event-0',
      created_at: new Date().toISOString(),
      event_type: 'config_updated',
      severity: 'info',
      summary: 'System initialized with safety rules: Gas Danger > 300 PPM, Temp Danger > 60°C',
      details: { gas_danger: 300, temp_danger: 60 },
      actor: 'system'
    }
  ],
  contacts: [
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
  ],
  deviceStatus: {
    online: false,
    lastSeen: null,
    uptime: 0,
    rssi: -65,
    firmware_version: 'v1.0.0',
    valveState: 'open'
  }
};

// Persist store to local JSON file so Render cold restarts or server crashes retain contacts & config
export function persistStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const dataToSave = {
      config: memoryStore.config,
      contacts: memoryStore.contacts,
      events: memoryStore.events.slice(0, 50)
    };
    fs.writeFileSync(STORE_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to persist store to file:', err.message);
  }
}

// Load persisted store from local JSON file on startup
export function loadPersistedStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const content = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed.contacts && Array.isArray(parsed.contacts)) {
        memoryStore.contacts = parsed.contacts;
        console.log(`📂 Loaded ${parsed.contacts.length} persisted emergency contact(s) from disk`);
      }
      if (parsed.config && typeof parsed.config === 'object') {
        Object.assign(memoryStore.config, parsed.config);
      }
      if (parsed.events && Array.isArray(parsed.events)) {
        memoryStore.events = parsed.events;
      }
    } else {
      // Create initial store file
      persistStore();
    }
  } catch (err) {
    console.warn('Failed to load store from file:', err.message);
  }
}

loadPersistedStore();


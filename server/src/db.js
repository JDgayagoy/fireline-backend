import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

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

// In-Memory store for offline/local standalone mode
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
      id: '1',
      name: 'Primary Admin (Home)',
      phone_number: '+639171234567',
      relationship: 'Primary Safety Operator',
      priority: 1,
      is_active: true
    },
    {
      id: '2',
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

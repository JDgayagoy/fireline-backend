import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { memoryStore, supabase } from './db.js';
import { startWatchdogs } from './watchdog.js';
import { generateIncidentSummary, handleAIChatQuery } from './ai.js';
import { addPushSubscription, dispatchWebPushAlert, dispatchSMSEscalation } from './notifications.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Root & Health Checks for Render
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'FireLine Gas & Fire Monitor API',
    version: '1.0.0',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Start safety watchdogs
startWatchdogs();

// ----------------------------------------------------------------------------
// Authentication (Sign In & Sign Up with Supabase + In-Memory Fallback)
// ----------------------------------------------------------------------------
const AUTHORIZED_ACCOUNTS = {
  'admin@test.com': {
    email: 'admin@test.com',
    passwords: ['1234', 'admin123'],
    name: 'Safety Admin',
    role: 'admin',
    title: 'Operations Admin'
  },
  'superadmin@test.com': {
    email: 'superadmin@test.com',
    passwords: ['1234', 'admin123'],
    name: 'Super Admin',
    role: 'superadmin',
    title: 'Root Supervisor'
  }
};

// Sign In Endpoint (POST /api/auth/login and /api/auth/signin)
const handleLogin = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const rawPassword = String(password);

  // 1. Check pre-configured default admin accounts
  const defaultAccount = AUTHORIZED_ACCOUNTS[normalizedEmail];
  if (defaultAccount && defaultAccount.passwords.includes(rawPassword)) {
    const token = `fl_${Buffer.from(`${defaultAccount.email}:${Date.now()}`).toString('base64')}`;
    return res.json({
      success: true,
      token,
      user: {
        email: defaultAccount.email,
        name: defaultAccount.name,
        role: defaultAccount.role,
        title: defaultAccount.title
      }
    });
  }

  // 2. Check in-memory registered accounts
  const memUser = (memoryStore.users || []).find(
    u => u.email.toLowerCase() === normalizedEmail && u.password === rawPassword
  );
  if (memUser) {
    const token = `fl_${Buffer.from(`${memUser.email}:${Date.now()}`).toString('base64')}`;
    return res.json({
      success: true,
      token,
      user: {
        email: memUser.email,
        name: memUser.name,
        role: memUser.role || 'admin',
        title: memUser.role === 'viewer' ? 'Safety Auditor' : 'Safety Officer'
      }
    });
  }

  // 3. Check Supabase Auth if connected
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: rawPassword
      });

      if (!error && data?.user) {
        const role = data.user.user_metadata?.role || 'admin';
        const name = data.user.user_metadata?.name || normalizedEmail.split('@')[0];
        const token = data.session?.access_token || `fl_${Buffer.from(`${normalizedEmail}:${Date.now()}`).toString('base64')}`;

        return res.json({
          success: true,
          token,
          user: {
            id: data.user.id,
            email: data.user.email,
            name,
            role,
            title: role === 'superadmin' ? 'Root Supervisor' : (role === 'viewer' ? 'Safety Auditor' : 'Safety Officer')
          }
        });
      }
    } catch (sbErr) {
      console.warn('Supabase sign-in attempt error:', sbErr.message);
    }
  }

  return res.status(401).json({ 
    error: 'Invalid email or password. Please verify your credentials or create a new account.' 
  });
};

app.post('/api/auth/login', handleLogin);
app.post('/api/auth/signin', handleLogin);

// Sign Up Endpoint (POST /api/auth/signup)
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name, role = 'admin' } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const rawPassword = String(password);
  const fullName = String(name || '').trim() || normalizedEmail.split('@')[0];
  const userRole = ['admin', 'viewer', 'superadmin'].includes(role) ? role : 'admin';

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  // Password length validation
  if (rawPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  // Check if account already exists in default accounts
  if (AUTHORIZED_ACCOUNTS[normalizedEmail]) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  // Check if account already exists in memory store
  const existingMem = (memoryStore.users || []).find(u => u.email.toLowerCase() === normalizedEmail);
  if (existingMem) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  let createdUser = {
    email: normalizedEmail,
    name: fullName,
    role: userRole,
    title: userRole === 'superadmin' ? 'Root Supervisor' : (userRole === 'viewer' ? 'Safety Auditor' : 'Safety Officer'),
    created_at: new Date().toISOString()
  };

  // 1. Register with Supabase Auth if available
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: rawPassword,
        email_confirm: true,
        user_metadata: {
          name: fullName,
          role: userRole,
          title: createdUser.title
        }
      });

      if (error) {
        if (error.message?.toLowerCase().includes('already') || error.status === 422) {
          return res.status(409).json({ error: 'An account with this email already exists.' });
        }
        console.warn('Supabase admin create user failed, continuing with memory fallback:', error.message);
      } else if (data?.user) {
        createdUser.id = data.user.id;
      }
    } catch (sbErr) {
      console.warn('Supabase auth signup error:', sbErr.message);
    }
  }

  // 2. Persist in memory store
  memoryStore.users = memoryStore.users || [];
  memoryStore.users.push({
    ...createdUser,
    password: rawPassword
  });

  // 3. Log event
  memoryStore.events.unshift({
    id: `event-${Date.now()}`,
    created_at: new Date().toISOString(),
    event_type: 'user_registered',
    severity: 'info',
    summary: `New safety account registered: ${fullName} (${userRole})`,
    details: { email: normalizedEmail, role: userRole },
    actor: fullName
  });

  const token = `fl_${Buffer.from(`${normalizedEmail}:${Date.now()}`).toString('base64')}`;

  return res.status(201).json({
    success: true,
    message: 'Account created successfully',
    token,
    user: createdUser
  });
});

app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  res.json({ success: true, valid: true });
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  res.json({ success: true, authenticated: true });
});

// ----------------------------------------------------------------------------
// Web Push Subscription
// ----------------------------------------------------------------------------
app.post('/api/push/subscribe', (req, res) => {
  const subscription = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid push subscription' });
  }
  addPushSubscription(subscription);
  res.status(201).json({ success: true });
});

// ----------------------------------------------------------------------------
// Health & Status
// ----------------------------------------------------------------------------
app.get('/api/status', (req, res) => {
  const now = Date.now();
  const lastSeen = memoryStore.deviceStatus.lastSeen;
  const secondsSinceLastReading = lastSeen 
    ? Math.round((now - new Date(lastSeen).getTime()) / 1000)
    : null;

  res.json({
    device_id: memoryStore.config.device_id,
    online: memoryStore.deviceStatus.online,
    lastSeen: memoryStore.deviceStatus.lastSeen,
    secondsSinceLastReading,
    valveState: memoryStore.deviceStatus.valveState,
    rssi: memoryStore.deviceStatus.rssi,
    uptime: memoryStore.deviceStatus.uptime,
    firmware_version: memoryStore.deviceStatus.firmware_version,
    sms_last_status: memoryStore.deviceStatus.sms_last_status || 'none',
    warming_up: Boolean(memoryStore.deviceStatus.warming_up),
    activeAlertsCount: memoryStore.alerts.filter(a => a.status === 'active').length,
    pendingCommandsCount: memoryStore.commands.filter(c => c.status === 'pending').length
  });
});

// ----------------------------------------------------------------------------
// Sensor Readings Ingestion (From ESP32)
// ----------------------------------------------------------------------------
app.post('/api/readings', async (req, res) => {
  try {
    const { gas, smoke, temperature, humidity, rssi, uptime, firmware_version } = req.body;

    if (gas === undefined || temperature === undefined) {
      return res.status(400).json({ error: 'Missing required reading fields: gas and temperature' });
    }

    const now = new Date();
    const config = memoryStore.config;

    // Check if device was previously offline
    const wasOffline = !memoryStore.deviceStatus.online;
    memoryStore.deviceStatus.online = true;
    memoryStore.deviceStatus.lastSeen = now.toISOString();
    if (rssi !== undefined) memoryStore.deviceStatus.rssi = Number(rssi);
    if (uptime !== undefined) memoryStore.deviceStatus.uptime = Number(uptime);
    if (firmware_version) memoryStore.deviceStatus.firmware_version = firmware_version;
    if (req.body.valve_closed !== undefined) {
      memoryStore.deviceStatus.valveState = req.body.valve_closed ? 'closed' : 'open';
    }
    if (req.body.sms_last_status !== undefined) {
      memoryStore.deviceStatus.sms_last_status = req.body.sms_last_status;
    }
    if (req.body.warming_up !== undefined) {
      memoryStore.deviceStatus.warming_up = req.body.warming_up;
    }

    if (wasOffline) {
      console.log('💚 ESP32 Device is now ONLINE and reporting readings.');
      const onlineEvent = {
        id: `evt-${Date.now()}`,
        created_at: now.toISOString(),
        event_type: 'device_online',
        severity: 'info',
        summary: 'ESP32 Device reconnected and resumed sensor transmissions.',
        details: { rssi, uptime },
        actor: 'device'
      };
      memoryStore.events.unshift(onlineEvent);

      // Auto-resolve any active device_offline alert
      for (const alert of memoryStore.alerts) {
        if (alert.sensor_type === 'device_offline' && alert.status === 'active') {
          alert.status = 'resolved';
          alert.resolved_at = now.toISOString();
        }
      }

      if (supabase) {
        await supabase.from('events').insert([onlineEvent]);
      }
    }

    const readingRecord = {
      id: Date.now(),
      created_at: now.toISOString(),
      device_id: config.device_id,
      gas_ppm: Number(gas),
      smoke_level: Number(smoke || 0),
      temperature: Number(temperature),
      humidity: humidity !== undefined ? Number(humidity) : 55,
      rssi: Number(rssi || memoryStore.deviceStatus.rssi),
      uptime: Number(uptime || memoryStore.deviceStatus.uptime),
      firmware_version: firmware_version || memoryStore.deviceStatus.firmware_version
    };

    memoryStore.readings.unshift(readingRecord);
    if (memoryStore.readings.length > 500) {
      memoryStore.readings.pop();
    }

    // Threshold Safety Checks
    const isGasDanger = readingRecord.gas_ppm >= config.gas_danger_threshold;
    const isTempDanger = readingRecord.temperature >= config.temp_danger_threshold;
    const isSmokeDanger = readingRecord.smoke_level >= (config.smoke_danger_threshold || 250);
    const isGasWatch = readingRecord.gas_ppm >= config.gas_watch_threshold;
    const isTempWatch = readingRecord.temperature >= config.temp_watch_threshold;
    const isSmokeWatch = readingRecord.smoke_level >= (config.smoke_watch_threshold || 100);

    if (isGasDanger || isTempDanger || isSmokeDanger) {
      // Danger Alert Trigger
      const sensorType = isGasDanger ? 'gas' : (isSmokeDanger ? 'smoke' : 'temperature');
      const reason = isGasDanger 
        ? `MQ-2 LPG Gas level reached ${readingRecord.gas_ppm} PPM (Danger threshold: ${config.gas_danger_threshold} PPM)`
        : (isSmokeDanger 
            ? `MQ-2 Smoke level reached ${readingRecord.smoke_level} PPM (Danger threshold: ${config.smoke_danger_threshold || 250} PPM)`
            : `DHT11 High temperature reached ${readingRecord.temperature}°C (Danger threshold: ${config.temp_danger_threshold}°C)`);

      console.warn(`🚨 DANGER TRIGGERED: ${reason}`);

      // Check if active alert already exists to prevent alert spamming
      const existingActive = memoryStore.alerts.find(a => 
        a.status === 'active' && 
        a.level === 'danger' && 
        a.sensor_type === sensorType
      );

      if (!existingActive) {
        const dangerAlert = {
          id: `alert-danger-${Date.now()}`,
          device_id: config.device_id,
          created_at: now.toISOString(),
          level: 'danger',
          sensor_type: isGasDanger ? 'gas' : 'temperature',
          value_recorded: isGasDanger ? readingRecord.gas_ppm : readingRecord.temperature,
          threshold_value: isGasDanger ? config.gas_danger_threshold : config.temp_danger_threshold,
          message: reason,
          status: 'active',
          acknowledged_by: null,
          acknowledged_at: null,
          escalated_at: null,
          is_false_alarm: false
        };
        memoryStore.alerts.unshift(dangerAlert);

        // Danger Event
        const dangerEvent = {
          id: `evt-${Date.now()}`,
          created_at: now.toISOString(),
          event_type: 'danger_alert',
          severity: 'danger',
          summary: reason,
          details: { reading: readingRecord },
          actor: 'system'
        };
        memoryStore.events.unshift(dangerEvent);

        // Threshold breached: Dispatches push notification alert without turning off hardware components
        console.log(`📢 [THRESHOLD PUSH ALERT] Limit breached (${reason}). Dispatching push notification to user.`);

        if (supabase) {
          await supabase.from('alerts').insert([dangerAlert]);
          await supabase.from('events').insert([dangerEvent]);
        }

        // Dispatch Web Push Notification to active browsers
        dispatchWebPushAlert(dangerAlert).catch(err => console.error('Push error:', err));

        // Immediately dispatch SMS to Primary Emergency Contacts (priority === 1)
        const primaryContacts = (memoryStore.contacts || []).filter(c => c.is_active !== false && Number(c.priority) === 1 && c.phone_number);
        console.log(`📡 [PRIMARY DISPATCH] Danger detected. Iterating over ${primaryContacts.length} primary contact(s)...`);
        for (const contact of primaryContacts) {
          dispatchSMSEscalation(contact, dangerAlert).catch(err => console.error('Primary SMS dispatch error:', err));
        }
      }
    } else if (isGasWatch || isTempWatch) {
      // Watch Alert Trigger
      const reason = isGasWatch
        ? `Elevated gas level at ${readingRecord.gas_ppm} PPM (Watch threshold: ${config.gas_watch_threshold} PPM)`
        : `Elevated temperature at ${readingRecord.temperature}°C (Watch threshold: ${config.temp_watch_threshold}°C)`;

      const existingActive = memoryStore.alerts.find(a => 
        a.status === 'active' && 
        a.sensor_type === (isGasWatch ? 'gas' : 'temperature')
      );

      if (!existingActive) {
        const watchAlert = {
          id: `alert-watch-${Date.now()}`,
          device_id: config.device_id,
          created_at: now.toISOString(),
          level: 'watch',
          sensor_type: isGasWatch ? 'gas' : 'temperature',
          value_recorded: isGasWatch ? readingRecord.gas_ppm : readingRecord.temperature,
          threshold_value: isGasWatch ? config.gas_watch_threshold : config.temp_watch_threshold,
          message: reason,
          status: 'active',
          acknowledged_by: null,
          acknowledged_at: null,
          escalated_at: null,
          is_false_alarm: false
        };
        memoryStore.alerts.unshift(watchAlert);

        const watchEvent = {
          id: `evt-${Date.now()}`,
          created_at: now.toISOString(),
          event_type: 'watch_alert',
          severity: 'warning',
          summary: reason,
          details: { reading: readingRecord },
          actor: 'system'
        };
        memoryStore.events.unshift(watchEvent);

        if (supabase) {
          await supabase.from('alerts').insert([watchAlert]);
          await supabase.from('events').insert([watchEvent]);
        }

        // Dispatch Web Push Notification to active browsers
        dispatchWebPushAlert(watchAlert).catch(err => console.error('Push error:', err));
      }
    }

    if (supabase) {
      await supabase.from('readings').insert([readingRecord]);
    }

    res.status(201).json({
      success: true,
      valveState: memoryStore.deviceStatus.valveState,
      hasPendingCommands: memoryStore.commands.some(c => c.status === 'pending')
    });
  } catch (err) {
    console.error('Error handling reading:', err);
    res.status(500).json({ error: err.message });
  }
});

// Fetch recent readings
app.get('/api/readings', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  res.json(memoryStore.readings.slice(0, limit));
});

// ----------------------------------------------------------------------------
// Device Commands Contract (Polled by ESP32 & Queued by PWA Admin)
// ----------------------------------------------------------------------------

// ESP32 polls this endpoint for pending commands
app.get('/api/commands', (req, res) => {
  // Find oldest pending command
  const pending = [...memoryStore.commands].reverse().find(c => c.status === 'pending');
  if (pending) {
    pending.status = 'sent';
    pending.sent_at = new Date().toISOString();
    return res.json({ command: pending });
  }
  res.json({ command: null });
});

// Admin queues a new command from PWA
app.post('/api/commands', async (req, res) => {
  try {
    const { command, requested_by = 'admin', payload = {} } = req.body;
    const validCommands = ['close_valve', 'open_valve', 'calibrate_sensor', 'reboot_device', 'send_sms'];

    if (!validCommands.includes(command)) {
      return res.status(400).json({ error: `Invalid command. Allowed: ${validCommands.join(', ')}` });
    }

    const newCmd = {
      id: `cmd-${Date.now()}`,
      device_id: memoryStore.config.device_id,
      command,
      status: 'pending',
      requested_by,
      requested_at: new Date().toISOString(),
      payload
    };

    memoryStore.commands.unshift(newCmd);

    // Log event
    const event = {
      id: `evt-${Date.now()}`,
      created_at: new Date().toISOString(),
      event_type: 'valve_command_queued',
      severity: command === 'close_valve' ? 'warning' : 'info',
      summary: `Command queued: ${command.replace('_', ' ').toUpperCase()} by ${requested_by}`,
      details: { command, payload },
      actor: requested_by
    };
    memoryStore.events.unshift(event);

    if (supabase) {
      await supabase.from('commands').insert([newCmd]);
      await supabase.from('events').insert([event]);
    }

    res.status(201).json({ success: true, command: newCmd });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ESP32 reports execution result of a command
app.post('/api/commands/:id/result', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, error_message } = req.body;

    const cmd = memoryStore.commands.find(c => c.id === id);
    if (!cmd) {
      return res.status(404).json({ error: 'Command not found' });
    }

    cmd.status = status || 'executed';
    cmd.executed_at = new Date().toISOString();
    if (error_message) cmd.error_message = error_message;

    // Update system valve state based on command executed
    if (cmd.command === 'close_valve' && cmd.status === 'executed') {
      memoryStore.deviceStatus.valveState = 'closed';
      memoryStore.config.valve_state = 'closed';
      const event = {
        id: `evt-${Date.now()}`,
        created_at: new Date().toISOString(),
        event_type: 'valve_closed',
        severity: 'danger',
        summary: `Solenoid Valve successfully CLOSED by ${cmd.requested_by}`,
        details: { commandId: id },
        actor: 'device'
      };
      memoryStore.events.unshift(event);
      if (supabase) await supabase.from('events').insert([event]);
    } else if (cmd.command === 'open_valve' && cmd.status === 'executed') {
      memoryStore.deviceStatus.valveState = 'open';
      memoryStore.config.valve_state = 'open';
      const event = {
        id: `evt-${Date.now()}`,
        created_at: new Date().toISOString(),
        event_type: 'valve_opened',
        severity: 'info',
        summary: `Solenoid Valve REOPENED by ${cmd.requested_by}`,
        details: { commandId: id },
        actor: 'device'
      };
      memoryStore.events.unshift(event);
      if (supabase) await supabase.from('events').insert([event]);
    }

    res.json({ success: true, command: cmd, valveState: memoryStore.deviceStatus.valveState });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------------
// Config (Device Thresholds & Settings)
// ----------------------------------------------------------------------------
app.get('/api/config', (req, res) => {
  res.json({
    ...memoryStore.config,
    gas_adc_danger_threshold: memoryStore.config.gas_adc_danger_threshold || memoryStore.config.gas_danger_threshold
  });
});

app.put('/api/config', async (req, res) => {
  try {
    const updates = req.body;
    Object.assign(memoryStore.config, updates, { updated_at: new Date().toISOString() });

    const event = {
      id: `evt-${Date.now()}`,
      created_at: new Date().toISOString(),
      event_type: 'config_updated',
      severity: 'info',
      summary: `System thresholds and configuration updated by Admin`,
      details: updates,
      actor: updates.updated_by || 'admin'
    };
    memoryStore.events.unshift(event);

    if (supabase) {
      await supabase.from('config').update(updates).eq('id', 1);
      await supabase.from('events').insert([event]);
    }

    res.json({ success: true, config: memoryStore.config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------------
// Alerts & Acknowledgment Flow
// ----------------------------------------------------------------------------
app.get('/api/alerts', (req, res) => {
  res.json(memoryStore.alerts);
});

app.post('/api/alerts/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const { acknowledged_by = 'admin' } = req.body;

    const alert = memoryStore.alerts.find(a => a.id === id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    alert.status = 'acknowledged';
    alert.acknowledged_by = acknowledged_by;
    alert.acknowledged_at = new Date().toISOString();

    const event = {
      id: `evt-${Date.now()}`,
      created_at: new Date().toISOString(),
      event_type: 'alert_acknowledged',
      severity: 'info',
      summary: `Alert (${alert.sensor_type}: ${alert.message}) acknowledged by ${acknowledged_by}. Escalation cancelled.`,
      details: { alertId: id, acknowledged_by },
      actor: acknowledged_by
    };
    memoryStore.events.unshift(event);

    if (supabase) {
      await supabase.from('alerts').update({
        status: 'acknowledged',
        acknowledged_by,
        acknowledged_at: alert.acknowledged_at
      }).eq('id', id);
      await supabase.from('events').insert([event]);
    }

    res.json({ success: true, alert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark alert as false alarm
app.post('/api/alerts/:id/false-alarm', async (req, res) => {
  try {
    const { id } = req.params;
    const { note = 'Normal cooking smoke' } = req.body;

    const alert = memoryStore.alerts.find(a => a.id === id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    alert.is_false_alarm = true;
    alert.false_alarm_note = note;
    alert.status = 'resolved';
    alert.resolved_at = new Date().toISOString();

    res.json({ success: true, alert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------------
// Events Timeline
// ----------------------------------------------------------------------------
app.get('/api/events', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  res.json(memoryStore.events.slice(0, limit));
});

// ----------------------------------------------------------------------------
// Emergency Contacts
// ----------------------------------------------------------------------------
app.get('/api/contacts', async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('contacts').select('*').order('priority', { ascending: true });
      if (!error && data && data.length > 0) {
        memoryStore.contacts = data;
      }
    } catch (e) {
      console.warn('Supabase contacts fetch fallback:', e.message);
    }
  }
  // Sort contacts by priority ascending (1 = Primary, 2+ = Secondary)
  const sorted = [...(memoryStore.contacts || [])].sort((a, b) => (Number(a.priority) || 99) - (Number(b.priority) || 99));
  res.json(sorted);
});

app.post('/api/contacts', async (req, res) => {
  const { name, phone_number, relationship, priority = 1, is_active = true } = req.body;
  if (!name || !phone_number) {
    return res.status(400).json({ error: 'Name and phone number are required' });
  }

  let cleanPhone = String(phone_number).trim();
  if (cleanPhone.startsWith('09')) {
    cleanPhone = '+63' + cleanPhone.substring(1);
  }

  const contactPriority = Number(priority) || (memoryStore.contacts.length === 0 ? 1 : 2);
  const defaultRel = contactPriority === 1 ? 'Primary Safety Contact' : 'Secondary Escalation Contact';

  const contact = {
    id: `contact-${Date.now()}`,
    name: String(name).trim(),
    phone_number: cleanPhone,
    relationship: relationship?.trim() || defaultRel,
    priority: contactPriority,
    is_active: is_active !== false
  };

  memoryStore.contacts = memoryStore.contacts || [];
  memoryStore.contacts.push(contact);

  if (supabase) {
    try {
      await supabase.from('contacts').insert([contact]);
    } catch (e) {
      console.warn('Supabase contact insert note:', e.message);
    }
  }

  res.status(201).json(contact);
});

app.patch('/api/contacts/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  memoryStore.contacts = memoryStore.contacts || [];
  const idx = memoryStore.contacts.findIndex(c => String(c.id) === String(id));
  if (idx === -1) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  if (updates.phone_number) {
    let cleanPhone = String(updates.phone_number).trim();
    if (cleanPhone.startsWith('09')) {
      cleanPhone = '+63' + cleanPhone.substring(1);
    }
    updates.phone_number = cleanPhone;
  }

  if (updates.priority !== undefined) {
    updates.priority = Number(updates.priority);
  }

  memoryStore.contacts[idx] = {
    ...memoryStore.contacts[idx],
    ...updates
  };

  if (supabase) {
    try {
      await supabase.from('contacts').update(updates).eq('id', id);
    } catch (e) {
      console.warn('Supabase contact update note:', e.message);
    }
  }

  res.json(memoryStore.contacts[idx]);
});

app.delete('/api/contacts/:id', async (req, res) => {
  const { id } = req.params;

  memoryStore.contacts = memoryStore.contacts || [];
  const initialLength = memoryStore.contacts.length;
  memoryStore.contacts = memoryStore.contacts.filter(c => String(c.id) !== String(id));

  if (supabase) {
    try {
      await supabase.from('contacts').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase contact delete note:', e.message);
    }
  }

  if (memoryStore.contacts.length === initialLength) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  console.log(`🗑️ Emergency contact deleted: ${id}`);
  res.json({ success: true, deletedId: id });
});

// ----------------------------------------------------------------------------
// AI Diagnostic & Assistant Endpoints
// ----------------------------------------------------------------------------
app.get('/api/ai/summary', (req, res) => {
  const summary = generateIncidentSummary(memoryStore.readings, memoryStore.alerts);
  res.json(summary);
});

app.post('/api/ai/chat', async (req, res) => {
  const { prompt, clientContext } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }
  const reply = await handleAIChatQuery(prompt, clientContext);
  res.json({ reply, timestamp: new Date().toISOString() });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Gas & Fire Monitor API running on http://localhost:${PORT}`);
});

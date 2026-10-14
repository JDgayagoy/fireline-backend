import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { memoryStore, supabase } from './db.js';
import { startWatchdogs } from './watchdog.js';
import { generateIncidentSummary, handleAIChatQuery } from './ai.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Start safety watchdogs
startWatchdogs();

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
    activeAlertsCount: memoryStore.alerts.filter(a => a.status === 'active').length,
    pendingCommandsCount: memoryStore.commands.filter(c => c.status === 'pending').length
  });
});

// ----------------------------------------------------------------------------
// Sensor Readings Ingestion (From ESP32)
// ----------------------------------------------------------------------------
app.post('/api/readings', async (req, res) => {
  try {
    const { gas, smoke, temperature, rssi, uptime, firmware_version } = req.body;

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
    const isGasWatch = readingRecord.gas_ppm >= config.gas_watch_threshold;
    const isTempWatch = readingRecord.temperature >= config.temp_watch_threshold;

    if (isGasDanger || isTempDanger) {
      // Danger Alert Trigger
      const reason = isGasDanger 
        ? `LPG Gas level reached ${readingRecord.gas_ppm} PPM (Danger threshold: ${config.gas_danger_threshold} PPM)`
        : `High temperature reached ${readingRecord.temperature}°C (Danger threshold: ${config.temp_danger_threshold}°C)`;

      console.warn(`🚨 DANGER TRIGGERED: ${reason}`);

      // Check if active alert already exists to prevent alert spamming
      const existingActive = memoryStore.alerts.find(a => 
        a.status === 'active' && 
        a.level === 'danger' && 
        a.sensor_type === (isGasDanger ? 'gas' : 'temperature')
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

        // Auto-close valve safety command if not already closed
        if (memoryStore.deviceStatus.valveState !== 'closed') {
          const autoCloseCmd = {
            id: `cmd-${Date.now()}`,
            device_id: config.device_id,
            command: 'close_valve',
            status: 'pending',
            requested_by: 'system_auto_shutoff',
            requested_at: now.toISOString(),
            payload: { trigger: reason }
          };
          memoryStore.commands.unshift(autoCloseCmd);
          console.warn('🔒 Auto-shutoff command queued: close_valve');
        }

        if (supabase) {
          await supabase.from('alerts').insert([dangerAlert]);
          await supabase.from('events').insert([dangerEvent]);
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
    const validCommands = ['close_valve', 'open_valve', 'calibrate_sensor', 'reboot_device'];

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
  res.json(memoryStore.config);
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
app.get('/api/contacts', (req, res) => {
  res.json(memoryStore.contacts);
});

app.post('/api/contacts', (req, res) => {
  const { name, phone_number, relationship, priority = 1 } = req.body;
  if (!name || !phone_number) {
    return res.status(400).json({ error: 'Name and phone number are required' });
  }
  const contact = {
    id: `contact-${Date.now()}`,
    name,
    phone_number,
    relationship: relationship || 'Emergency Contact',
    priority: Number(priority),
    is_active: true
  };
  memoryStore.contacts.push(contact);
  res.status(201).json(contact);
});

// ----------------------------------------------------------------------------
// AI Diagnostic & Assistant Endpoints
// ----------------------------------------------------------------------------
app.get('/api/ai/summary', (req, res) => {
  const summary = generateIncidentSummary(memoryStore.readings, memoryStore.alerts);
  res.json(summary);
});

app.post('/api/ai/chat', (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }
  const reply = handleAIChatQuery(prompt);
  res.json({ reply, timestamp: new Date().toISOString() });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Gas & Fire Monitor API running on http://localhost:${PORT}`);
});

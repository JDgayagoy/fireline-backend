import { memoryStore, supabase } from './db.js';
import { dispatchSMSEscalation } from './notifications.js';

export function startWatchdogs() {
  console.log('🛡️ Starting Safety Watchdogs (60s Device Offline & Alert Escalation)...');

  // Check every 5 seconds
  setInterval(async () => {
    try {
      const now = Date.now();
      const config = memoryStore.config;
      const timeoutMs = (config.offline_timeout_seconds || 60) * 1000;
      const lastSeen = memoryStore.deviceStatus.lastSeen;

      // 1. Device Offline Watchdog
      if (lastSeen) {
        const diffMs = now - new Date(lastSeen).getTime();
        if (diffMs > timeoutMs && memoryStore.deviceStatus.online) {
          // Device has gone offline!
          memoryStore.deviceStatus.online = false;
          console.warn(`⚠️ ESP32 Device OFFLINE! No reading received for ${Math.round(diffMs / 1000)}s.`);

          // Log offline event
          const offlineEvent = {
            id: `evt-${Date.now()}`,
            created_at: new Date().toISOString(),
            event_type: 'device_offline',
            severity: 'warning',
            summary: `Device offline: No sensor reading received for ${Math.round(diffMs / 1000)} seconds.`,
            details: { lastSeen, elapsedSeconds: Math.round(diffMs / 1000) },
            actor: 'watchdog'
          };
          memoryStore.events.unshift(offlineEvent);

          // Create alert
          const offlineAlert = {
            id: `alert-offline-${Date.now()}`,
            device_id: config.device_id,
            created_at: new Date().toISOString(),
            level: 'watch',
            sensor_type: 'device_offline',
            value_recorded: Math.round(diffMs / 1000),
            threshold_value: config.offline_timeout_seconds,
            message: 'ESP32 Device is offline. Sensors are currently not reporting.',
            status: 'active',
            acknowledged_by: null,
            acknowledged_at: null,
            escalated_at: null,
            is_false_alarm: false
          };
          memoryStore.alerts.unshift(offlineAlert);

          if (supabase) {
            await supabase.from('events').insert([offlineEvent]);
            await supabase.from('alerts').insert([offlineAlert]);
          }
        }
      }

      // 2. Alert Escalation Watchdog
      const ackTimeoutMs = (config.ack_timeout_seconds || 120) * 1000;
      for (const alert of memoryStore.alerts) {
        if (alert.status === 'active' && alert.level === 'danger' && !alert.escalated_at) {
          const alertAgeMs = now - new Date(alert.created_at).getTime();
          if (alertAgeMs > ackTimeoutMs) {
            alert.escalated_at = new Date().toISOString();
            console.warn(`🚨 Alert ${alert.id} NOT acknowledged within ${config.ack_timeout_seconds}s! Escalating to secondary emergency contact...`);

            const escalationEvent = {
              id: `evt-esc-${Date.now()}`,
              created_at: new Date().toISOString(),
              event_type: 'alert_escalated',
              severity: 'danger',
              summary: `ESCALATION: Danger alert for ${alert.sensor_type} unacknowledged. Dispatching SMS to escalation contacts.`,
              details: { alertId: alert.id, alertType: alert.sensor_type, value: alert.value_recorded },
              actor: 'watchdog'
            };
            memoryStore.events.unshift(escalationEvent);

            // Iterate over emergency escalation contacts (secondary contacts priority > 1, or all active)
            const secondaryContacts = (memoryStore.contacts || []).filter(c => c.is_active !== false && c.priority > 1 && c.phone_number);
            const targets = secondaryContacts.length > 0 
              ? secondaryContacts 
              : (memoryStore.contacts || []).filter(c => c.is_active !== false && c.phone_number);

            console.log(`📡 [ESCALATION] Alert unacknowledged. Iterating over ${targets.length} emergency escalation contact(s)...`);
            for (const contact of targets) {
              await dispatchSMSEscalation(contact, alert);
            }

            if (supabase) {
              await supabase.from('alerts').update({ escalated_at: alert.escalated_at }).eq('id', alert.id);
              await supabase.from('events').insert([escalationEvent]);
            }
          }
        }
      }
    } catch (err) {
      console.error('Watchdog error:', err.message);
    }
  }, 5000);
}

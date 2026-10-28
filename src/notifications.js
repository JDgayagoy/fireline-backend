import webpush from 'web-push';
import dotenv from 'dotenv';
import { memoryStore, persistStore, supabase } from './db.js';

dotenv.config();

// VAPID keys for Web Push
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('🔔 Web Push Notifications initialized with VAPID keys.');
} else {
  console.log('ℹ️ Web Push VAPID keys not set. Push notifications will run in simulation mode.');
}

// Push subscriptions (browsers subscribed to alerts, restored from persistent store)
export const pushSubscriptions = new Set(
  Array.isArray(memoryStore.pushSubscriptions) ? memoryStore.pushSubscriptions : []
);

export function addPushSubscription(subscription) {
  const subStr = JSON.stringify(subscription);
  pushSubscriptions.add(subStr);
  memoryStore.pushSubscriptions = Array.from(pushSubscriptions);
  persistStore();
  console.log(`📱 New browser subscribed to Web Push. Total active subscribers: ${pushSubscriptions.size}`);
}

export function removePushSubscription(subscription) {
  const subStr = JSON.stringify(subscription);
  pushSubscriptions.delete(subStr);
  memoryStore.pushSubscriptions = Array.from(pushSubscriptions);
  persistStore();
}

/**
 * Dispatches Web Push notification to all active browser sessions
 */
export async function dispatchWebPushAlert(alert) {
  const payload = JSON.stringify({
    title: alert.level === 'danger' ? '🚨 DANGER: Gas/Fire Alert' : '⚠️ WATCH: Elevated Sensor Reading',
    body: `${alert.message} (${new Date(alert.created_at).toLocaleTimeString()})`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: alert.id,
    data: {
      alertId: alert.id,
      url: '/'
    }
  });

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || pushSubscriptions.size === 0) {
    console.log(`[PUSH SIMULATION] Dispatched Web Push to ${pushSubscriptions.size} browsers:`, alert.message);
    return;
  }

  const sends = Array.from(pushSubscriptions).map(async (subStr) => {
    try {
      const sub = JSON.parse(subStr);
      await webpush.sendNotification(sub, payload, {
        TTL: 60,
        urgency: 'high'
      });
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        // Expired subscription
        pushSubscriptions.delete(subStr);
        memoryStore.pushSubscriptions = Array.from(pushSubscriptions);
        persistStore();
      } else {
        console.warn('Web push send error:', err.message);
      }
    }
  });

  await Promise.allSettled(sends);
}

/**
 * Dispatches Emergency SMS Escalation to contacts
 * Triggered when a Danger alert is unacknowledged past the timeout window
 */
export async function dispatchSMSEscalation(contact, alert) {
  const alertDate = alert?.created_at ? new Date(alert.created_at) : new Date();
  const validDate = isNaN(alertDate.getTime()) ? new Date() : alertDate;
  const timestamp = validDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const message = `WARNING: GAS LEAK DETECTED! LPG valve and main electrical power shut off as a precaution. Please check immediately. (${timestamp})`;

  console.log(`📱 [SMS ESCALATION DISPATCH] Sending SMS to ${contact.name} (${contact.phone_number}): "${message}"`);

  // Queue hardware command for ESP32 SIM800L module
  const command = {
    id: `cmd-sms-${Date.now()}`,
    device_id: memoryStore.config?.device_id || 'esp32_main',
    command: 'send_sms',
    status: 'pending',
    requested_by: 'system_watchdog',
    requested_at: new Date().toISOString(),
    payload: {
      phone: contact.phone_number,
      message
    }
  };

  memoryStore.commands = memoryStore.commands || [];
  memoryStore.commands.unshift(command);

  if (supabase) {
    try {
      await supabase.from('commands').insert([command]);
    } catch (e) {
      console.warn('Failed to insert SMS command to Supabase:', e.message);
    }
  }

  console.log(`📡 [GSM SIM800L] Escalation SMS command queued for ESP32: ${contact.phone_number}`);
}

// Siren/alarm unit: sent on every danger event, ignores SMS cooldown
export const SIREN_PHONE = "+639774719787";
export const SIREN_CMD   = "1234#ON#";

/**
 * Dispatches Siren/Alarm trigger SMS command to the hardware.
 * Sent alongside primary emergency contacts on every danger event.
 */
export async function dispatchSirenSMS(alert) {
  console.log(`🚨 [SIREN SMS DISPATCH] Queuing siren trigger command to hardware: ${SIREN_PHONE} ("${SIREN_CMD}")`);

  const command = {
    id: `cmd-siren-${Date.now()}`,
    device_id: memoryStore.config?.device_id || 'esp32_main',
    command: 'send_sms',
    status: 'pending',
    requested_by: 'system_danger_siren',
    requested_at: new Date().toISOString(),
    payload: {
      phone: SIREN_PHONE,
      message: SIREN_CMD
    }
  };

  memoryStore.commands = memoryStore.commands || [];
  memoryStore.commands.unshift(command);

  if (supabase) {
    try {
      await supabase.from('commands').insert([command]);
    } catch (e) {
      console.warn('Failed to insert Siren command to Supabase:', e.message);
    }
  }

  console.log(`📡 [GSM SIM800L] Siren alarm command queued for ESP32: ${SIREN_PHONE} -> "${SIREN_CMD}"`);
  return command;
}

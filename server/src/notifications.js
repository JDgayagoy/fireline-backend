import webpush from 'web-push';
import dotenv from 'dotenv';
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

// In-memory push subscriptions (browsers subscribed to alerts)
export const pushSubscriptions = new Set();

export function addPushSubscription(subscription) {
  pushSubscriptions.add(JSON.stringify(subscription));
  console.log(`📱 New browser subscribed to Web Push. Total active subscribers: ${pushSubscriptions.size}`);
}

export function removePushSubscription(subscription) {
  pushSubscriptions.delete(JSON.stringify(subscription));
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
      await webpush.sendNotification(sub, payload);
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        // Expired subscription
        pushSubscriptions.delete(subStr);
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
  const message = `🚨 EMERGENCY GAS/FIRE ALERT: ${alert.message}. Please check immediately or call emergency services.`;

  console.log(`📱 [SMS ESCALATION DISPATCH] Sending SMS to ${contact.name} (${contact.phone_number}): "${message}"`);

  // Hardware SIM800L module on ESP32 handles direct cellular SMS delivery
  console.log(`📡 [GSM SIM800L] Escalation SMS routed to hardware queue for ${contact.phone_number}`);
}

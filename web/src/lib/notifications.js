/**
 * Browser Web Push & System Native Popup Notification Service
 * Supports OS desktop / mobile banners even when PWA is minimized or closed.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check current system notification permission state
 */
export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

/**
 * Register Service Worker and subscribe to Web Push & Native Popups
 */
export async function enableWebPushNotifications() {
  if (typeof window === 'undefined') return { success: false };

  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    throw new Error('System popup notifications are not supported by this browser.');
  }

  // 1. Request native OS permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was denied. Please allow notifications in browser site settings.');
  }

  // 2. Register Service Worker
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  let subscription = null;

  // 3. Subscribe to Web Push if VAPID key is configured
  if (VAPID_PUBLIC_KEY && 'PushManager' in window) {
    try {
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      // Post subscription to backend API
      await fetch(`${API_BASE}/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      }).catch((e) => console.warn('Failed to register subscription with backend:', e.message));
    } catch (pushErr) {
      console.warn('Push subscription note:', pushErr.message);
    }
  }

  // 4. Send an immediate native OS test popup confirmation
  await showSystemPopupNotification({
    title: '🔔 FireLine Safety Popups Active',
    body: 'You will now receive instant system banners even when the app is minimized or running in the background.',
    tag: 'fireline-welcome'
  });

  return { success: true, permission, subscription };
}

/**
 * Displays an immediate Native OS System Popup Banner
 * (Windows Action Center banner / Android lockscreen / macOS notification)
 */
export async function showSystemPopupNotification({
  title = '🚨 Gas & Fire Safety Alert',
  body = 'Elevated sensor reading recorded.',
  icon = '/icon-192.png',
  badge = '/icon-192.png',
  tag = 'fireline-alert',
  requireInteraction = true,
  data = { url: '/' }
} = {}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;

  if (Notification.permission !== 'granted') {
    return false;
  }

  const options = {
    body,
    icon,
    badge,
    tag,
    vibrate: [400, 150, 400, 150, 400],
    requireInteraction, // Keeps notification on screen until user acts
    renotify: true,
    data
  };

  // Method 1: Use Service Worker registration (Works reliably in background / PWA mode)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options);
        return true;
      }
    } catch (swErr) {
      console.warn('Service worker notification fallback:', swErr);
    }
  }

  // Method 2: Standard Notification constructor fallback
  try {
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch (err) {
    console.warn('Notification constructor error:', err);
    return false;
  }
}

/**
 * Synthesizes a loud, repeating safety alarm chime using the Web Audio API
 */
let audioCtx = null;
let alarmInterval = null;

export function playEmergencyAlarmChime() {
  if (alarmInterval) return; // Already chiming

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const triggerTone = () => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.15); // Ramp to A6

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    };

    triggerTone();
    alarmInterval = setInterval(triggerTone, 500);
  } catch (err) {
    console.warn('Audio chime error:', err);
  }
}

export function stopEmergencyAlarmChime() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
}

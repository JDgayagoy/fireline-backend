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

  if (!('Notification' in window)) {
    throw new Error('System popup notifications are not supported by this browser.');
  }

  // 1. Request native OS permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was denied. Please allow notifications in site settings or Android app permissions.');
  }

  // 2. Register Service Worker
  let registration = null;
  if ('serviceWorker' in navigator) {
    registration = await navigator.serviceWorker.register('/sw.js');
    try {
      await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((resolve) => setTimeout(resolve, 2500))
      ]);
    } catch (e) {
      // Non-fatal
    }
  }

  let subscription = null;

  // 3. Subscribe to Web Push if VAPID key is configured
  if (registration && VAPID_PUBLIC_KEY && 'PushManager' in window) {
    try {
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });
      }

      // Post subscription to backend API
      if (subscription) {
        await fetch(`${API_BASE}/push/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        }).catch((e) => console.warn('Failed to register subscription with backend:', e.message));
      }
    } catch (pushErr) {
      console.warn('Push subscription note:', pushErr.message);
    }
  }

  // 4. Send an immediate native OS test popup confirmation via Service Worker (Android compatible)
  const origin = window.location.origin;
  if (registration && registration.showNotification) {
    try {
      await registration.showNotification('🔔 FireLine Safety Popups Active', {
        body: 'You will now receive instant system banners even when the app is minimized or running in the background.',
        icon: `${origin}/icon-192.png`,
        badge: `${origin}/icon-192.png`,
        tag: 'fireline-welcome',
        vibrate: [300, 100, 300]
      });
    } catch (swErr) {
      console.warn('SW welcome notification note:', swErr);
    }
  } else {
    await showSystemPopupNotification({
      title: '🔔 FireLine Safety Popups Active',
      body: 'You will now receive instant system banners even when the app is minimized or running in the background.',
      tag: 'fireline-welcome'
    });
  }

  return { success: true, permission, subscription };
}

/**
 * Synchronize push subscription with backend on page mount
 */
export async function syncPushSubscription(registration) {
  if (!registration || !('pushManager' in registration) || !VAPID_PUBLIC_KEY) return;
  try {
    let sub = await registration.pushManager.getSubscription();
    if (!sub) {
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
    }
    if (sub) {
      await fetch(`${API_BASE}/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub)
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('Auto-sync subscription note:', err);
  }
}

/**
 * Displays an immediate Native OS System Popup Banner
 * (Windows Action Center banner / Android lockscreen & status bar / macOS notification)
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
  if (typeof window === 'undefined') return false;

  if (!('Notification' in window)) {
    console.warn('Notifications not supported by this browser.');
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const origin = window.location.origin;
  const fullIcon = icon.startsWith('http') ? icon : `${origin}${icon}`;
  const fullBadge = badge.startsWith('http') ? badge : `${origin}${badge}`;

  const options = {
    body,
    icon: fullIcon,
    badge: fullBadge,
    tag: String(tag || 'fireline-alert'),
    vibrate: [500, 200, 500, 200, 500],
    renotify: true,
    data: data || { url: '/' }
  };

  // Method 1: Use Service Worker registration (Mandatory on Android Chrome)
  if ('serviceWorker' in navigator) {
    try {
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js');
      }

      if (reg) {
        if (!reg.active) {
          await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((resolve) => setTimeout(resolve, 2000))
          ]);
        }

        if (reg.showNotification) {
          await reg.showNotification(title, options);
          return true;
        }
      }
    } catch (swErr) {
      console.warn('Service worker showNotification fallback:', swErr);
    }
  }

  // Method 2: Standard Notification constructor fallback (Desktop Chrome/Firefox/Safari)
  // Note: On Android Chrome, calling new Notification() throws TypeError by browser design
  try {
    if (typeof Notification === 'function') {
      const notification = new Notification(title, options);
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      return true;
    }
  } catch (err) {
    console.warn('Notification constructor fallback failed (expected on Android Chrome):', err.message);
  }

  return false;
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

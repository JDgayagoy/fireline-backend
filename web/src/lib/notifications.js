/**
 * Browser Web Push & Acoustic Alarm chime synthesizer
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
 * Register Service Worker and subscribe to Web Push
 */
export async function enableWebPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported by this browser.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was denied.');
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  if (!VAPID_PUBLIC_KEY) {
    console.log('Push permission granted (local mode).');
    return { success: true, localOnly: true };
  }

  const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey
  });

  // Post subscription to backend
  await fetch(`${API_BASE}/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription)
  });

  return { success: true, subscription };
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

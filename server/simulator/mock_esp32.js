/**
 * ESP32 Hardware Simulator for Gas & Fire Monitor IoT System
 * 
 * Emulates the physical ESP32 with:
 * - MQ-2 Gas & Smoke sensor readings
 * - Ambient temperature readings
 * - Wi-Fi RSSI & uptime tracking
 * - Solenoid Valve relay actuation
 * - Cloud polling for commands
 * - Autonomous edge fail-safe shutoff
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3001/api';

let valveState = 'open'; // 'open' | 'closed'
let uptimeSeconds = 120;
let mode = 'normal'; // 'normal' | 'leak' | 'fire' | 'offline'

// Check CLI arguments for mode
const args = process.argv.slice(2);
if (args.includes('--leak')) mode = 'leak';
if (args.includes('--fire')) mode = 'fire';
if (args.includes('--offline')) mode = 'offline';

console.log('=====================================================');
console.log('🤖 ESP32 Hardware Simulator starting...');
console.log(`📡 Target API: ${API_BASE}`);
console.log(`⚙️ Simulation Mode: ${mode.toUpperCase()} (options: --leak, --fire, --offline)`);
console.log('=====================================================');

let config = {
  gas_danger_threshold: 300,
  temp_danger_threshold: 60,
  clean_air_baseline: 85
};

// 1. Fetch initial config from server
async function fetchConfig() {
  try {
    const res = await fetch(`${API_BASE}/config`);
    if (res.ok) {
      config = await res.json();
      console.log(`📋 Config synced: Gas Danger > ${config.gas_danger_threshold} PPM, Temp Danger > ${config.temp_danger_threshold}°C`);
    }
  } catch (err) {
    console.warn('⚠️ Could not sync config, using local defaults.');
  }
}

// 2. Poll for pending commands
async function pollCommands() {
  try {
    const res = await fetch(`${API_BASE}/commands`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.command) {
      const cmd = data.command;
      console.log(`\n📥 [COMMAND RECEIVED] ESP32 received: ${cmd.command} (ID: ${cmd.id})`);

      if (cmd.command === 'close_valve') {
        console.log('⚡ Actuating Relay CW-025 (12V) -> SOLENOID VALVE CLOSED!');
        valveState = 'closed';
      } else if (cmd.command === 'open_valve') {
        console.log('⚡ Actuating Relay CW-025 (12V) -> SOLENOID VALVE OPENED!');
        valveState = 'open';
      } else if (cmd.command === 'calibrate_sensor') {
        console.log('⚖️ Calibrating clean-air baseline R0...');
      }

      // Report result back to API
      await fetch(`${API_BASE}/commands/${cmd.id}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'executed' })
      });
      console.log(`✅ Reported execution status for command ${cmd.id}`);
    }
  } catch (err) {
    // Silent on network blip
  }
}

// 3. Generate sensor readings based on current mode
function generateReading() {
  uptimeSeconds += 3;
  const jitter = (Math.random() - 0.5) * 4;

  let gas = config.clean_air_baseline + jitter;
  let smoke = 45 + jitter;
  let temp = 26.5 + (Math.random() - 0.5);

  if (mode === 'leak') {
    // Accelerate gas concentration
    gas = 345 + (Math.random() * 20);
    smoke = 85 + jitter;
  } else if (mode === 'fire') {
    // High temperature and smoke
    gas = 280 + jitter;
    smoke = 320 + (Math.random() * 30);
    temp = 68.5 + (Math.random() * 3);
  }

  // Edge autonomous safety rule: shut valve locally if danger threshold breached
  if ((gas >= config.gas_danger_threshold || temp >= config.temp_danger_threshold) && valveState === 'open') {
    console.log('\n🚨 [AUTONOMOUS EDGE FAIL-SAFE ACTIVATED] Sensor breached danger threshold!');
    console.log(`   Gas: ${gas.toFixed(1)} PPM (Limit: ${config.gas_danger_threshold}), Temp: ${temp.toFixed(1)}°C`);
    console.log('   -> Relay CW-025 IMMEDIATELY TRIPPED. Valve CLOSED locally on device.');
    valveState = 'closed';
  }

  return {
    gas: Number(gas.toFixed(1)),
    smoke: Number(smoke.toFixed(1)),
    temperature: Number(temp.toFixed(1)),
    rssi: -62 + Math.floor((Math.random() - 0.5) * 6),
    uptime: uptimeSeconds,
    firmware_version: 'v1.0.0-esp32'
  };
}

// 4. Send readings loop
async function sendReadings() {
  if (mode === 'offline') {
    console.log('💤 [OFFLINE MODE] ESP32 is silent. Test the 60s offline watchdog!');
    return;
  }

  const payload = generateReading();

  try {
    const res = await fetch(`${API_BASE}/readings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      process.stdout.write(`\r📊 [${new Date().toLocaleTimeString()}] Gas: ${payload.gas} PPM | Smoke: ${payload.smoke} | Temp: ${payload.temperature}°C | Valve: ${valveState.toUpperCase()} | RSSI: ${payload.rssi} dBm `);
    } else {
      console.error(`\n❌ Failed to post readings: HTTP ${res.status}`);
    }
  } catch (err) {
    console.error(`\n❌ Network error posting readings: ${err.message}`);
  }
}

// Main execution
async function main() {
  await fetchConfig();

  // Polling loop
  setInterval(async () => {
    await sendReadings();
    await pollCommands();
  }, 3000);
}

main();

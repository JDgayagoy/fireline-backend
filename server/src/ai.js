import { memoryStore } from './db.js';

/**
 * Generates an intelligent plain-language summary of recent readings and incidents.
 */
export function generateIncidentSummary(recentReadings = [], activeAlerts = []) {
  if (!recentReadings || recentReadings.length === 0) {
    return {
      summary: "System is operating normally. No sensor readings recorded yet.",
      risk_level: "safe",
      recommendation: "Ensure the ESP32 device is powered and reporting readings."
    };
  }

  // Analyze readings trends
  const latest = recentReadings[0];
  const oldest = recentReadings[Math.min(recentReadings.length - 1, 20)];
  const gasDelta = latest.gas_ppm - oldest.gas_ppm;
  const tempDelta = latest.temperature - oldest.temperature;
  const timeSpanMinutes = Math.max(1, Math.round((new Date(latest.created_at) - new Date(oldest.created_at)) / 60000));
  const gasRateOfRise = (gasDelta / timeSpanMinutes).toFixed(1);

  // Check for active alerts
  const dangerAlert = activeAlerts.find(a => a.level === 'danger' && a.status === 'active');
  const watchAlert = activeAlerts.find(a => a.level === 'watch' && a.status === 'active');

  if (dangerAlert) {
    if (dangerAlert.sensor_type === 'gas' && tempDelta < 3) {
      return {
        summary: `CRITICAL: Gas surged to ${latest.gas_ppm} PPM (+${gasDelta.toFixed(0)} PPM over ${timeSpanMinutes} min, ~${gasRateOfRise} PPM/min) while temperature stayed stable at ${latest.temperature}°C. This is consistent with a direct LPG gas leak.`,
        risk_level: "danger",
        recommendation: "Emergency valve closed. Ventilate the area immediately. Do not switch any electrical switches or open flames."
      };
    } else if (dangerAlert.sensor_type === 'temperature' || (latest.temperature > 55 && latest.smoke_level > 200)) {
      return {
        summary: `CRITICAL FIRE RISK: Temperature escalated to ${latest.temperature}°C with elevated smoke (${latest.smoke_level}) and gas (${latest.gas_ppm} PPM). Indications strongly suggest active combustion or fire.`,
        risk_level: "danger",
        recommendation: "Evacuate premises immediately and contact local emergency fire services."
      };
    } else {
      return {
        summary: `DANGER ALERT: ${dangerAlert.message} recorded value: ${dangerAlert.value_recorded}.`,
        risk_level: "danger",
        recommendation: "Inspect monitored zone and confirm safety."
      };
    }
  }

  if (watchAlert) {
    return {
      summary: `Warning: Elevating readings detected (${watchAlert.sensor_type} reached ${watchAlert.value_recorded}). Rate of rise is ${gasRateOfRise} PPM/min.`,
      risk_level: "watch",
      recommendation: "Monitor closely. Verify whether normal cooking activities or ventilation changes are occurring."
    };
  }

  // Normal / Drift analysis
  const baseline = memoryStore.config.clean_air_baseline || 85;
  if (latest.gas_ppm > baseline + 30) {
    return {
      summary: `Atmosphere is generally stable at ${latest.gas_ppm} PPM gas and ${latest.temperature}°C. Minor elevation above clean-air baseline (${baseline} PPM) noted.`,
      risk_level: "safe",
      recommendation: "If ambient air is fresh, consider triggering sensor clean-air recalibration."
    };
  }

  return {
    summary: `Normal conditions. Gas level is at a clean ${latest.gas_ppm} PPM, smoke level is ${latest.smoke_level}, and temperature is normal at ${latest.temperature}°C. Wi-Fi signal is ${latest.rssi} dBm.`,
    risk_level: "safe",
    recommendation: "System operating within safe baseline parameters."
  };
}

/**
 * AI Assistant to answer user questions about system history and safety status
 */
export function handleAIChatQuery(prompt) {
  const query = prompt.toLowerCase();
  const readings = memoryStore.readings;
  const alerts = memoryStore.alerts;
  const events = memoryStore.events;
  const status = memoryStore.deviceStatus;
  const config = memoryStore.config;

  if (query.includes('status') || query.includes('how is') || query.includes('current')) {
    const latest = readings[0];
    if (!status.online) {
      return `The ESP32 monitor is currently **OFFLINE**. Last reading was received at ${status.lastSeen || 'Unknown'}. Please check device power and Wi-Fi connection.`;
    }
    return `The system is currently **ONLINE** and operational.
- **Gas Level:** ${latest?.gas_ppm ?? 'N/A'} PPM (Danger threshold: ${config.gas_danger_threshold} PPM)
- **Temperature:** ${latest?.temperature ?? 'N/A'}°C (Danger threshold: ${config.temp_danger_threshold}°C)
- **Smoke Index:** ${latest?.smoke_level ?? 'N/A'}
- **Gas Valve:** ${status.valveState.toUpperCase()}
- **Wi-Fi Signal:** ${latest?.rssi ?? status.rssi} dBm
- **Uptime:** ${Math.floor((status.uptime || 0) / 60)} minutes`;
  }

  if (query.includes('valve') || query.includes('shut off') || query.includes('closed')) {
    return `The emergency solenoid valve is currently **${status.valveState.toUpperCase()}**.
- Remote shutoff can be executed at any time from the dashboard with safety confirmation.
- The ESP32 is programmed with autonomous fail-safe: if gas exceeds ${config.gas_danger_threshold} PPM or temp exceeds ${config.temp_danger_threshold}°C, it shuts the valve instantly even if offline.`;
  }

  if (query.includes('alert') || query.includes('spike') || query.includes('danger') || query.includes('happen')) {
    if (alerts.length === 0) {
      return "There are no active or recent alerts recorded in the system. Everything has been within safe thresholds.";
    }
    const recent = alerts.slice(0, 3).map(a => 
      `- **${a.level.toUpperCase()}** (${a.sensor_type}): ${a.message} (Status: ${a.status}, Recorded at ${new Date(a.created_at).toLocaleTimeString()})`
    ).join('\n');
    return `Here are the latest recorded alerts:\n${recent}`;
  }

  if (query.includes('threshold') || query.includes('config') || query.includes('setting')) {
    return `Current safety configuration:
- **Gas Watch / Danger:** ${config.gas_watch_threshold} PPM / ${config.gas_danger_threshold} PPM
- **Temperature Watch / Danger:** ${config.temp_watch_threshold}°C / ${config.temp_danger_threshold}°C
- **Clean Air Baseline:** ${config.clean_air_baseline} PPM
- **Device Offline Timeout:** ${config.offline_timeout_seconds} seconds
- **Alert Escalation Timeout:** ${config.ack_timeout_seconds} seconds`;
  }

  // Fallback helpful assistant response
  return `I am your IoT Safety Assistant. You can ask me:
- *"What is the current safety status?"*
- *"Are there any active alerts or spikes?"*
- *"Is the emergency valve open or closed?"*
- *"What are the current thresholds?"*
- *"Explain the latest incident summary."*`;
}

import { memoryStore } from './db.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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
        summary: `CRITICAL: Gas surged to ${latest.gas_ppm} PPM (+${gasDelta.toFixed(0)} PPM over ${timeSpanMinutes} min, ~${gasRateOfRise} PPM/min) while temperature stayed stable at ${latest.temperature}°C. This signature is consistent with a direct LPG gas leak.`,
        risk_level: "danger",
        recommendation: "Emergency valve closed. Ventilate the area immediately. Do not switch any electrical switches or open flames."
      };
    } else if (dangerAlert.sensor_type === 'temperature' || (latest.temperature > 55 && latest.smoke_level > 200)) {
      return {
        summary: `CRITICAL FIRE RISK: Temperature escalated to ${latest.temperature}°C with elevated smoke (${latest.smoke_level}) and gas (${latest.gas_ppm} PPM). Indications strongly suggest active combustion or thermal fire.`,
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
  const baseline = memoryStore.config?.clean_air_baseline || 85;
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
 * Builds the comprehensive RAG retrieval context from the live system memory store
 */
export function buildRetrievalContext(clientContext = null) {
  const readings = (clientContext?.readings && clientContext.readings.length > 0)
    ? clientContext.readings 
    : (memoryStore.readings || []);
  
  const alerts = (clientContext?.alerts && clientContext.alerts.length > 0)
    ? clientContext.alerts
    : (memoryStore.alerts || []);

  const config = clientContext?.config || memoryStore.config || {};
  const status = clientContext?.status || memoryStore.deviceStatus || {};
  const events = (clientContext?.events && clientContext.events.length > 0)
    ? clientContext.events
    : (memoryStore.events || []);

  const contacts = (clientContext?.contacts && clientContext.contacts.length > 0)
    ? clientContext.contacts
    : (memoryStore.contacts || []);

  // 1. Telemetry Snapshot & Trend Analysis
  const latest = readings[0] || { gas_ppm: 0, smoke_level: 0, temperature: 0, humidity: 0, rssi: 0 };
  const oldest = readings[Math.min(readings.length - 1, 20)] || latest;
  const timeSpanMinutes = Math.max(1, Math.round((new Date(latest.created_at || Date.now()) - new Date(oldest.created_at || Date.now())) / 60000));
  const gasDelta = (latest.gas_ppm || 0) - (oldest.gas_ppm || 0);
  const tempDelta = (latest.temperature || 0) - (oldest.temperature || 0);
  const gasRateOfRise = (gasDelta / timeSpanMinutes).toFixed(2);

  // 2. Incident Summary Generation
  const incidentAnalysis = generateIncidentSummary(readings, alerts);

  // 3. Active & Recent Alerts
  const activeAlerts = alerts.filter(a => a.status === 'active');
  const resolvedAlerts = alerts.filter(a => a.status !== 'active').slice(0, 5);

  // 4. Emergency Escalation Contacts
  const primaryContacts = contacts.filter(c => Number(c.priority) === 1 && c.is_active !== false);
  const secondaryContacts = contacts.filter(c => Number(c.priority) > 1 && c.is_active !== false);

  // 5. Recent Safety & Command Events
  const recentEvents = events.slice(0, 8);

  return {
    system_status: {
      online: status.online !== false,
      valve_state: status.valveState || config.valve_state || 'open',
      last_seen: status.lastSeen || 'Just now',
      rssi: latest.rssi ?? status.rssi ?? -65,
      uptime_seconds: status.uptime || 0,
      firmware_version: status.firmware_version || 'v1.2.0-esp32'
    },
    current_sensors: {
      gas_ppm: latest.gas_ppm,
      smoke_level: latest.smoke_level,
      temperature_celsius: latest.temperature,
      humidity_rh: latest.humidity,
      gas_rate_of_rise_ppm_per_min: gasRateOfRise,
      temperature_delta_celsius: tempDelta.toFixed(1),
      clean_air_baseline_ppm: config.clean_air_baseline || 85
    },
    thresholds: {
      gas_watch_ppm: config.gas_watch_threshold || 150,
      gas_danger_ppm: config.gas_danger_threshold || 300,
      temp_watch_celsius: config.temp_watch_threshold || 45,
      temp_danger_celsius: config.temp_danger_threshold || 60,
      smoke_watch: config.smoke_watch_threshold || 100,
      smoke_danger: config.smoke_danger_threshold || 250,
      offline_timeout_seconds: config.offline_timeout_seconds || 60,
      escalation_ack_timeout_seconds: config.ack_timeout_seconds || 120
    },
    incident_analysis: incidentAnalysis,
    active_alerts: activeAlerts,
    recent_alerts: resolvedAlerts,
    contacts: {
      primary: primaryContacts,
      secondary_escalation: secondaryContacts
    },
    recent_events: recentEvents
  };
}

/**
 * Deterministic Grounded RAG Synthesizer (Reliable fallback if Gemini API is unreachable)
 */
function synthesizeDeterministicRAG(prompt, context) {
  const query = prompt.toLowerCase();

  if (query.includes('incident') || query.includes('summary') || query.includes('what happened') || query.includes('explain')) {
    const isDanger = context.incident_analysis.risk_level === 'danger';
    const isWatch = context.incident_analysis.risk_level === 'watch';
    const badge = isDanger ? '🚨 CRITICAL RISK' : isWatch ? '⚠️ ADVISORY WARNING' : '✅ SAFE & STABLE';

    return `### ${badge}: Incident & Safety Diagnostics

**Diagnostic Finding:**
${context.incident_analysis.summary}

**Telemetry Grounding:**
- **MQ-2 Gas Sensor:** Current **${context.current_sensors.gas_ppm} PPM** (Baseline: ${context.current_sensors.clean_air_baseline_ppm} PPM, Danger Limit: ${context.thresholds.gas_danger_ppm} PPM)
- **Atmospheric Trend:** Rate of rise is **${context.current_sensors.gas_rate_of_rise_ppm_per_min} PPM/min**
- **DHT11 Temperature:** **${context.current_sensors.temperature_celsius}°C** (Danger Limit: ${context.thresholds.temp_danger_celsius}°C)
- **Emergency Valve Status:** Solenoid valve is currently **${context.system_status.valve_state.toUpperCase()}**

**Recommended Action:**
${context.incident_analysis.recommendation}`;
  }

  if (query.includes('valve') || query.includes('shut off') || query.includes('open') || query.includes('closed') || query.includes('solenoid')) {
    const state = context.system_status.valve_state.toUpperCase();
    return `### 🛑 Emergency Solenoid Valve Status: **${state}**

- **Physical Valve State:** The motorized safety valve is currently **${state}**.
- **Automated Threshold Protection:** The valve is linked to safety rules: if gas breaches **${context.thresholds.gas_danger_ppm} PPM** or temperature breaches **${context.thresholds.temp_danger_celsius}°C**, emergency shutoff is triggered.
- **Manual Control:** Authorized administrators can manually command valve shutoff or reopening from the dashboard.
- **Node Link:** ESP32 hardware is **${context.system_status.online ? 'ONLINE' : 'OFFLINE'}** (${context.system_status.firmware_version}).`;
  }

  if (query.includes('gas') || query.includes('smoke') || query.includes('mq-2') || query.includes('temp') || query.includes('dht11') || query.includes('reading') || query.includes('level') || query.includes('status')) {
    return `### 📊 Real-Time Sensor Telemetry & Node Health

- **Hardware Node:** **${context.system_status.online ? 'ONLINE' : 'OFFLINE'}** (RSSI: ${context.system_status.rssi} dBm, Last Seen: ${context.system_status.last_seen})
- **MQ-2 Gas Level:** **${context.current_sensors.gas_ppm} PPM**
  * Rate of Change: ${context.current_sensors.gas_rate_of_rise_ppm_per_min} PPM/min
  * Clean-Air Baseline: ${context.current_sensors.clean_air_baseline_ppm} PPM
  * Watch / Danger Limits: ${context.thresholds.gas_watch_ppm} PPM / ${context.thresholds.gas_danger_ppm} PPM
- **MQ-2 Smoke Index:** **${context.current_sensors.smoke_level}**
- **DHT11 Temperature:** **${context.current_sensors.temperature_celsius}°C** (Danger Limit: ${context.thresholds.temp_danger_celsius}°C)
- **DHT11 Humidity:** **${context.current_sensors.humidity_rh}% RH**
- **Emergency Valve:** **${context.system_status.valve_state.toUpperCase()}**`;
  }

  if (query.includes('threshold') || query.includes('config') || query.includes('setting') || query.includes('limit')) {
    return `### ⚙️ Configured Safety Limits & Threshold Rules

- **MQ-2 Gas Watch Threshold:** **${context.thresholds.gas_watch_ppm} PPM** (Advisory push notification)
- **MQ-2 Gas Danger Threshold:** **${context.thresholds.gas_danger_ppm} PPM** (Emergency shutoff & SMS alert)
- **DHT11 Temperature Watch:** **${context.thresholds.temp_watch_celsius}°C**
- **DHT11 Temperature Danger:** **${context.thresholds.temp_danger_celsius}°C** (Thermal fire emergency)
- **Clean Air Baseline:** **${context.thresholds.clean_air_baseline_ppm} PPM**
- **Device Offline Timeout:** **${context.thresholds.offline_timeout_seconds}s**
- **Alert Escalation Timeout:** **${context.thresholds.escalation_ack_timeout_seconds}s**`;
  }

  if (query.includes('contact') || query.includes('sms') || query.includes('escalat') || query.includes('phone')) {
    const primaryStr = context.contacts.primary.map(c => `- **${c.name}** (${c.phone_number}) - ${c.relationship}`).join('\n') || '- None configured';
    const secStr = context.contacts.secondary_escalation.map(c => `- **${c.name}** (${c.phone_number}) - ${c.relationship}`).join('\n') || '- None configured';

    return `### 📱 Emergency Escalation Directory

**★ Primary Immediate Responders (Dispatched instantly upon danger trip):**
${primaryStr}

**⏱ Secondary Escalation Responders (Dispatched if unacknowledged after ${context.thresholds.escalation_ack_timeout_seconds}s):**
${secStr}`;
  }

  // General Grounded Safety Summary
  return `### 🛡️ FireLine Safety Assistant Overview

- **Overall Condition:** ${context.incident_analysis.summary}
- **Current Atmosphere:** Gas **${context.current_sensors.gas_ppm} PPM**, Temperature **${context.current_sensors.temperature_celsius}°C**, Smoke **${context.current_sensors.smoke_level}**
- **Emergency Solenoid Valve:** **${context.system_status.valve_state.toUpperCase()}**
- **Active Alerts:** ${context.active_alerts.length > 0 ? `⚠️ ${context.active_alerts.length} active alert(s) requiring attention` : '✅ No active alerts'}

You can ask me to:
- *"Explain latest incident summary"*
- *"Is the emergency valve open or closed?"*
- *"What are the current sensor readings and rates of rise?"*
- *"Show configured safety thresholds"*
- *"Who are the emergency escalation contacts?"*`;
}

/**
 * AI Assistant with Retrieval-Augmented Generation (RAG)
 * Retrieves real-time IoT state and augments with Gemini 2.5 Flash
 */
export async function handleAIChatQuery(prompt, clientContext = null) {
  const context = buildRetrievalContext(clientContext);

  const systemInstruction = `You are the FireLine Safety AI Assistant, an expert in IoT gas leak detection, LPG fire safety, and emergency response systems.
You are equipped with real-time Retrieval-Augmented Generation (RAG) context directly grounded on the user's ESP32 IoT node (MQ-2 gas/smoke sensor, DHT11 temperature/humidity sensor, motorized emergency solenoid valve, SIM800L GSM SMS escalation module).

=== RETRIEVED REAL-TIME IOT TELEMETRY & SYSTEM STATE ===
- Hardware Link Status: ${context.system_status.online ? 'ONLINE' : 'OFFLINE'} (Last seen: ${context.system_status.last_seen}, Firmware: ${context.system_status.firmware_version}, RSSI: ${context.system_status.rssi} dBm)
- Emergency Solenoid Valve: ${context.system_status.valve_state.toUpperCase()}
- Current MQ-2 Gas Reading: ${context.current_sensors.gas_ppm} PPM (Clean-air baseline: ${context.current_sensors.clean_air_baseline_ppm} PPM, Rate of rise: ${context.current_sensors.gas_rate_of_rise_ppm_per_min} PPM/min)
- Current MQ-2 Smoke Level: ${context.current_sensors.smoke_level}
- Current DHT11 Temperature: ${context.current_sensors.temperature_celsius}°C (Delta: ${context.current_sensors.temperature_delta_celsius}°C)
- Current DHT11 Humidity: ${context.current_sensors.humidity_rh}% RH
- Configured Safety Rules & Thresholds:
  * Gas Watch Limit: ${context.thresholds.gas_watch_ppm} PPM | Gas Danger Limit: ${context.thresholds.gas_danger_ppm} PPM
  * Temp Watch Limit: ${context.thresholds.temp_watch_celsius}°C | Temp Danger Limit: ${context.thresholds.temp_danger_celsius}°C
  * Alert Ack Escalation Timeout: ${context.thresholds.escalation_ack_timeout_seconds} seconds
- Incident Summary & Diagnostics:
  * Risk Level: ${context.incident_analysis.risk_level.toUpperCase()}
  * Diagnostic Summary: ${context.incident_analysis.summary}
  * Safety Recommendation: ${context.incident_analysis.recommendation}
- Active Alerts (${context.active_alerts.length}):
${context.active_alerts.map(a => `  * [${a.level.toUpperCase()}] ${a.message} (Value: ${a.value_recorded}, Started: ${a.created_at})`).join('\n') || '  * None. Atmosphere within normal bounds.'}
- Emergency Escalation Contacts:
  * Primary Immediate Responders: ${context.contacts.primary.map(c => `${c.name} (${c.phone_number})`).join(', ') || 'None set'}
  * Secondary Escalation Responders: ${context.contacts.secondary_escalation.map(c => `${c.name} (${c.phone_number})`).join(', ') || 'None set'}
- Recent Safety Audit Events:
${context.recent_events.map(e => `  * ${e.created_at}: [${e.event_type}] ${e.summary} (Actor: ${e.actor})`).join('\n') || '  * No recent events'}

=== DOMAIN LPG & FIRE SAFETY KNOWLEDGE ===
- LPG (Propane/Butane) is heavier than air (vapor density ~1.5 to 2.0) and accumulates near floors, crawlspaces, and enclosed cabinets.
- Lower Explosive Limit (LEL) of LPG is ~2.1% (~2,100 PPM).
- In any gas leak or fire emergency:
  1. Solenoid valve must be closed immediately to stop fuel flow.
  2. Do NOT turn on or off electrical switches, appliances, or lights (avoids electric arc sparks).
  3. Open doors and windows from the bottom up to ventilate floor-level gas.
  4. Evacuate premises immediately and alert emergency contacts.

=== INSTRUCTIONS ===
1. Answer the user's specific prompt directly and accurately using the RETRIEVED REAL-TIME CONTEXT above.
2. If asked "Explain latest incident summary" or "what happened", explain the exact incident analysis, rate of rise, timestamps, sensor values, and valve response.
3. If asked about the valve, explicitly state whether it is OPEN or CLOSED and explain safety recommendations.
4. If asked about thresholds, contacts, or readings, provide the exact numbers retrieved from the system.
5. Use clean markdown formatting (bolding, lists). Be clear, concise, and helpful.`;

  // Attempt Generation via Gemini 2.5 Flash
  if (GEMINI_API_KEY) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction }]
          },
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 800
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (generatedText && generatedText.trim().length > 0) {
          return generatedText.trim();
        }
      } else {
        console.warn('Gemini API HTTP status:', response.status);
      }
    } catch (apiErr) {
      console.warn('Gemini API call failed, falling back to deterministic RAG:', apiErr.message);
    }
  }

  // Fallback to grounded deterministic RAG synthesizer
  return synthesizeDeterministicRAG(prompt, context);
}

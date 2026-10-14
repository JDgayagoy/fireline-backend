# Gas & Fire Monitor PWA

An IoT monitoring system for gas, smoke, and temperature. An ESP32 reads the sensors and posts readings to an Express API. The API stores them in Supabase and runs AI analysis. A Progressive Web App (PWA) shows live status, sends alerts, and lets the admin shut off the gas remotely.

---

## 1. Overview

| Item | Detail |
| --- | --- |
| Goal | Detect gas leaks and fire risk early, alert people, and cut the gas supply when needed |
| Device | One ESP32 (single device, single location) |
| Users | One admin and one regular user |
| Priority | Safety first. Monitoring and AI come second. |

### Scope decisions

- **Single device.** There is no multi-device or multi-room support. No `devices` table is needed beyond one config row.
- **Two accounts only.** One admin (control and settings) and one viewer (read-only). No self-signup, no role management UI.

---

## 2. Tech Stack

| Layer | Technology |
| --- | --- |
| Firmware | ESP32 (Arduino framework) |
| Sensors | MQ-2 (gas/smoke), temperature sensor |
| Actuators | Relay (CW-025, 12V) driving a solenoid valve on the LPG line |
| GSM | SIM800L (SMS alerts) |
| API | Node.js + Express (hosted on Render) |
| Database / Auth | Supabase (Postgres, Auth, Realtime) |
| Frontend | Next.js PWA |
| AI | LLM-based analysis of readings and alerts |

---

## 3. Architecture

```
ESP32 (MQ-2, temp, relay, SIM800L)
   |  POST /api/readings        (every few seconds)
   |  GET  /api/commands        (poll for valve commands)
   |  GET  /api/config          (thresholds, calibration)
   v
Express API (Render)
   |-- Supabase (readings, alerts, events, commands, config)
   |-- AI analysis (summaries, anomalies, predictions)
   |-- Alert dispatcher (Web Push, SMS, email/Telegram)
   v
Next.js PWA (live dashboard, controls, history, chat)
```

### Device and API contract

- **Readings payload:** `date`, `time`, `gas`, `smoke`, `temperature`, plus `rssi`, `uptime`, `firmware_version`.
- **Commands:** the API queues a command (e.g. `close_valve`). The ESP32 polls `GET /api/commands`, executes it, then reports the result.
- **Config:** thresholds and the clean-air baseline live in the database. The device fetches them on boot and periodically, so no reflashing is needed.

---

## 4. Features

### 4.1 Safety (highest value)

- **Remote valve control.** A "Shut off gas" button in the PWA. The API queues the command, the ESP32 polls for it and triggers the relay. Requires a confirmation step. Every action is logged.
- **Auto-shutoff with alert.** When the rules reach "danger", the device closes the valve on its own. The PWA shows exactly what triggered it.
- **Multi-channel alerts.** Web Push first, then SMS through the SIM800L, then email or Telegram if nobody acknowledges within a set time.
- **Acknowledge and escalate.** An alert stays loud until someone taps "Acknowledge". If no one does, it escalates to a second contact.
- **Device offline alert.** If no reading arrives for 60 seconds, notify the user. A silent sensor is a safety problem too.

### 4.2 Monitoring and data

- **Live dashboard.** Gauges for gas, smoke, and temperature with color zones: safe, watch, danger.
- **History charts.** Hourly, daily, and weekly views with threshold lines.
- **Event timeline.** One feed of reading spikes, alerts, valve actions, and acknowledgments.
- **Calibration screen.** Set the clean-air baseline and alert thresholds from the app.
- **Export.** CSV or PDF incident reports.
- **Device health.** Wi-Fi signal strength, uptime, last seen, firmware version.

### 4.3 AI features

- **Plain-language incident summaries.** Example: "Gas rose from 90 to 340 over 4 minutes while temperature stayed flat, which is consistent with a slow leak."
- **Anomaly and drift detection.** Flag slow MQ-2 drift, which usually means recalibration or replacement is needed.
- **False-alarm learning.** Users mark an alert as "false alarm" (e.g. cooking smoke). Those labels feed back so the AI can tell normal cooking patterns from real events.
- **Chat assistant.** Answers questions like "What happened last night around 2 AM?" from the readings and alerts tables.
- **Predictive trends.** Estimate how long until a rising value crosses the danger threshold.
- **Daily or weekly digest.** A short AI-written summary of how the environment behaved.

### 4.4 PWA and user experience

- **Offline support.** Cache the last readings and show an "offline, last updated at..." banner.
- **Installable.** Install prompt, home-screen icon, and dark mode.
- **Two roles.** Supabase Auth with one admin (control and settings) and one viewer (read-only).
- **Emergency contacts.** One-tap call button and a list of numbers that receive SMS alerts.
- **Quiet hours / maintenance mode.** Pause non-critical notifications while testing. Danger alerts are never paused.
- **Language options.** English and Filipino, if users would benefit.

---

## 5. Data Model (draft)

| Table | Purpose |
| --- | --- |
| `readings` | Timestamped gas, smoke, temperature, rssi, uptime |
| `alerts` | Level (watch/danger), trigger reason, status, acknowledged_by, acknowledged_at, false_alarm flag |
| `events` | Unified timeline: spikes, alerts, valve actions, acknowledgments, offline/online |
| `commands` | Queued device commands, status (pending/sent/done/failed), requested_by |
| `config` | Single row: thresholds, clean-air baseline, quiet hours, offline timeout |
| `contacts` | Emergency numbers and escalation order |
| `profiles` | User role: `admin` or `viewer` |

Use Row Level Security so viewers have read-only access and only the admin can write commands and config.

---

## 6. Build Order

1. **Device offline detection and the acknowledge flow**
2. **Remote valve control with a log**
3. **Editable thresholds and calibration**
4. **Event timeline and AI incident summaries**
5. **Roles (admin and viewer)**

After step 5: anomaly detection, false-alarm learning, chat assistant, predictions, digests, exports, and language options.

---

## 7. Safety Principles

- The device must be able to close the valve on its own if the network or API is down. Cloud control is an extra, not a dependency.
- Danger alerts bypass quiet hours and maintenance mode.
- Every valve action and config change is logged with who and when.
- AI output is advisory. Threshold rules decide alerts and shutoffs, not the model.
- Test with a safe gas source or simulated readings before connecting to a live LPG line.

---

## 8. Open Questions

- Alert acknowledgment timeout before escalation (e.g. 2 minutes?)
- Who is the second escalation contact?
- Reopening the valve: remote, or physical-only after a danger shutoff?
- Reading interval and retention period for raw data

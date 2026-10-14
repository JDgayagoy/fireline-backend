# 🔥 Gas & Fire Monitor PWA

An IoT safety and environmental monitoring system for gas leaks, smoke, and fire risk. An **ESP32** reads sensor telemetry, enforces local autonomous safety rules, and posts readings to an **Express API** on Render and **Supabase**. A responsive **Next.js Progressive Web App (PWA)** provides real-time status gauges, an emergency LPG valve remote shutoff, multi-channel alerts, and conversational AI diagnostics.

Designed strictly according to [`Project.md`](./Project.md) and the UX/UI guidelines in [`ui.md`](./ui.md).

---

## 🏗️ System Architecture

```text
ESP32 (MQ-2, Temp, CW-025 Relay, SIM800L)
   │  POST /api/readings        (every 3 seconds)
   │  GET  /api/commands        (polls for valve commands)
   │  GET  /api/config          (thresholds, baseline)
   ▼
Express API (Render-ready Node.js)
   ├── Supabase (PostgreSQL, RLS, Auth, Realtime)
   ├── 60-Second Offline Watchdog & Escalation Engine
   └── AI Incident Diagnostics & Safety Assistant
   ▼
Next.js PWA (Mobile-first, shadcn/ui tokens, dark mode)
   ├── Status at a glance banner (Safe, Watch, Danger, Offline)
   ├── Live Sensor Gauges (Gas PPM, Smoke, Temp) with Sparklines
   ├── Remote Emergency Solenoid Valve Control (Hold-to-Confirm)
   ├── Unified Safety Event Timeline & History Analytics
   └── Conversational Safety Assistant (AI)
```

---

## 🚀 Quick Start (Local Run)

### 1. Start the Express API Server
In a terminal:
```bash
npm run server
```
Server starts on **http://localhost:3001**.
*(Includes in-memory fallback store and 60-second offline watchdog out of the box).*

### 2. Start the Next.js PWA Frontend
In a second terminal:
```bash
npm run web
```
Open **http://localhost:3000** in your browser or install on mobile.

### 3. Launch the ESP32 Hardware Simulator
Test the full pipeline without physical wiring:
```bash
# Normal telemetry (Gas ~85 PPM, Temp ~26.5°C)
npm run simulate

# Simulate a sudden LPG gas leak (triggers Danger alert & auto shutoff)
npm run simulate:leak

# Simulate fire combustion (high smoke & thermal surge)
npm run simulate:fire

# Test the 60s offline watchdog (silent sensor)
npm run simulate:offline
```

---

## 🛡️ Critical Safety & UI Features

| Feature | Implementation | UI Guideline Adherence |
| :--- | :--- | :--- |
| **Status at a glance** | `StatusBanner` at the top of every screen | Color + Icon + Text together (`ShieldCheck`, `TriangleAlert`, `Flame`, `WifiOff`) |
| **Danger is unmistakable** | High-contrast red banner with audible chime option and auto-scroll | Never relies on color alone |
| **Critical valve shutoff** | Admin-only button with `HoldToConfirmButton` (1.5s hold) | Prevents accidental shutoff, logs actor and timestamp |
| **Acknowledge & Escalate** | Single-tap acknowledge button with countdown timer | Automatically escalates to secondary emergency contact if unacknowledged |
| **60s Offline Watchdog** | Server background interval evaluates keep-alive packet age | Connection badge turns gray `Offline`, gauges dim and show clock |
| **Autonomous Edge Safety** | Local C++ threshold evaluation in ESP32 firmware | Trips CW-025 relay locally even if Wi-Fi or API is completely down |
| **AI Incident Summaries** | Analyzes reading rate-of-rise and thermal correlation | Plain-language diagnostics (distinguishes LPG leak from cooking vapor) |

---

## 🗄️ Database Setup (Supabase)

1. Open your **Supabase Dashboard** -> **SQL Editor**.
2. Run [`supabase/migrations/001_initial_schema.sql`](./supabase/migrations/001_initial_schema.sql) to create all tables and Row-Level Security (RLS) policies.
3. Run [`supabase/seed.sql`](./supabase/seed.sql) to populate initial thresholds and emergency contacts.
4. Set environment variables in `server/.env`:
   ```env
   PORT=3001
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

---

## 🔌 ESP32 Hardware Wiring Reference

| Component | ESP32 Pin | Details |
| :--- | :--- | :--- |
| **MQ-2 Gas Sensor** | GPIO 34 (ADC1_CH6) | Analog output (AOUT), powered by 5V |
| **Temperature Sensor** | GPIO 35 (ADC1_CH7) | Analog output (LM35 / NTC thermistor) |
| **CW-025 Relay (12V)** | GPIO 26 | Digital output triggering LPG Solenoid Valve |
| **Buzzer / Piezo** | GPIO 27 | Local acoustic alarm |
| **SIM800L GSM (RX)** | GPIO 17 (TX2) | Serial AT command interface |
| **SIM800L GSM (TX)** | GPIO 16 (RX2) | Serial AT command interface |

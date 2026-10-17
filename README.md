# 🔥 FireLine Gas & Fire Monitor API

Express backend API and IoT telemetry ingestion engine for the **FireLine Gas & Fire Safety System**.

## 🚀 Features
- **IoT Telemetry Ingestion:** Receives MQ-2 and DHT11 readings (`/api/readings`) from ESP32 nodes.
- **Safety Watchdogs:** 60-second offline detection and alert escalation engine.
- **Web Push Notifications:** Standard VAPID push alerts dispatched to connected PWA browsers on threshold breaches.
- **Actuator Commands:** Queues and audits remote solenoid valve commands (`/api/commands`).
- **AI Diagnostics:** Conversational assistant and incident summarization.
- **Database:** Supabase PostgreSQL with transparent in-memory fallback.

## 🛠️ Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your keys:
```bash
cp .env.example .env
```

### 3. Run Server Locally
```bash
# Start server (default: port 3001)
npm start

# Development mode with file watching
npm run dev
```

### 4. Run Sensor Simulator
```bash
npm run simulate
```

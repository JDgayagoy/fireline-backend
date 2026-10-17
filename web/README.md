# 🔥 FireLine Gas & Fire Safety PWA

A mobile-first, high-performance Progressive Web App (PWA) built with **Next.js (Turbopack)** and **Tailwind CSS** for real-time monitoring of LPG gas leaks (MQ-2) and environmental temperature/humidity (DHT11), with remote solenoid valve safety controls.

## 🚀 Features
- **Live Environmental Gauges:** Instant telemetry for MQ-2 gas, MQ-2 smoke, and DHT11 temp & humidity.
- **Safety Status Banner:** Real-time Danger, Watch, Safe, and Offline status indicator.
- **Remote Actuator Control:** Hold-to-confirm emergency LPG solenoid valve remote shutoff.
- **Device Health & Telemetry:** Monitors ESP32 MCU link, Wi-Fi RSSI, uptime, and SIM800L cellular readiness.
- **AI Safety Assistant:** Incident summarization and conversational safety diagnostics.
- **PWA Installation:** Installable on iOS (Safari Add to Home Screen) and Android (Chrome PWA) with Web Push notification support.

## 🛠️ Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in:
```env
NEXT_PUBLIC_API_URL=https://fireline-backend-2jhp.onrender.com/api
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm start
```

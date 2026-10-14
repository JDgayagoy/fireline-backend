-- ============================================================================
-- Gas & Fire Monitor PWA: Initial Schema
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Admin vs Viewer roles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'viewer')) DEFAULT 'viewer',
    full_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. System Configuration (Single row design: id = 1)
CREATE TABLE IF NOT EXISTS public.config (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    device_id TEXT NOT NULL DEFAULT 'esp32_main',
    gas_watch_threshold NUMERIC NOT NULL DEFAULT 150.0,      -- PPM
    gas_danger_threshold NUMERIC NOT NULL DEFAULT 300.0,     -- PPM
    smoke_watch_threshold NUMERIC NOT NULL DEFAULT 100.0,    -- Raw ADC / index
    smoke_danger_threshold NUMERIC NOT NULL DEFAULT 250.0,
    temp_watch_threshold NUMERIC NOT NULL DEFAULT 45.0,      -- Celsius
    temp_danger_threshold NUMERIC NOT NULL DEFAULT 60.0,     -- Celsius
    clean_air_baseline NUMERIC NOT NULL DEFAULT 85.0,        -- Calibrated R0 or baseline PPM
    offline_timeout_seconds INTEGER NOT NULL DEFAULT 60,     -- Seconds before declaring device offline
    ack_timeout_seconds INTEGER NOT NULL DEFAULT 120,        -- Seconds before alert escalates
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
    quiet_hours_start TIME WITHOUT TIME ZONE DEFAULT '22:00:00',
    quiet_hours_end TIME WITHOUT TIME ZONE DEFAULT '07:00:00',
    maintenance_mode BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_by UUID REFERENCES public.profiles(id)
);

-- 3. Sensor Readings (Time-series data from ESP32)
CREATE TABLE IF NOT EXISTS public.readings (
    id BIGSERIAL PRIMARY KEY,
    device_id TEXT NOT NULL DEFAULT 'esp32_main',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    gas_ppm NUMERIC NOT NULL,
    smoke_level NUMERIC NOT NULL,
    temperature NUMERIC NOT NULL,
    rssi INTEGER,                                            -- Wi-Fi signal strength in dBm
    uptime BIGINT,                                           -- ESP32 uptime in seconds
    firmware_version TEXT DEFAULT 'v1.0.0'
);

CREATE INDEX IF NOT EXISTS idx_readings_created_at ON public.readings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_device_id ON public.readings (device_id);

-- 4. Alerts Table
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id TEXT NOT NULL DEFAULT 'esp32_main',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    level TEXT NOT NULL CHECK (level IN ('watch', 'danger')),
    sensor_type TEXT NOT NULL CHECK (sensor_type IN ('gas', 'smoke', 'temperature', 'device_offline')),
    value_recorded NUMERIC,
    threshold_value NUMERIC,
    message TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'acknowledged', 'resolved')) DEFAULT 'active',
    acknowledged_by UUID REFERENCES public.profiles(id),
    acknowledged_at TIMESTAMPTZ,
    escalated_at TIMESTAMPTZ,
    is_false_alarm BOOLEAN NOT NULL DEFAULT false,
    false_alarm_note TEXT,
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts (status);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts (created_at DESC);

-- 5. Commands Table (Remote device actions queue)
CREATE TABLE IF NOT EXISTS public.commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id TEXT NOT NULL DEFAULT 'esp32_main',
    command TEXT NOT NULL CHECK (command IN ('close_valve', 'open_valve', 'calibrate_sensor', 'reboot_device')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'executed', 'failed')) DEFAULT 'pending',
    requested_by UUID REFERENCES public.profiles(id),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    sent_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    error_message TEXT,
    payload JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_commands_device_status ON public.commands (device_id, status);

-- 6. Emergency Contacts Table
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    relationship TEXT,                                       -- e.g. 'Primary Admin', 'Building Security', 'Fire Station'
    priority INTEGER NOT NULL DEFAULT 1,                     -- 1 = primary, 2 = escalation
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Unified Event Timeline
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    event_type TEXT NOT NULL CHECK (event_type IN (
        'reading_spike', 'danger_alert', 'watch_alert', 'alert_acknowledged',
        'alert_escalated', 'valve_closed', 'valve_opened', 'valve_command_queued',
        'device_offline', 'device_online', 'config_updated', 'calibration'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'danger')),
    summary TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    actor TEXT DEFAULT 'system'                              -- 'system', 'device', or user profile email
);

CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events (created_at DESC);

-- ============================================================================
-- Row Level Security (RLS) Setup
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Helper to check if current authenticated user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Users can view all profiles, only admin or self can update
CREATE POLICY "View all profiles" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update self or admin can update" ON public.profiles FOR UPDATE USING (
    auth.uid() = id OR public.is_admin()
);

-- Config: Viewers can read, only admin can update
CREATE POLICY "Authenticated users can view config" ON public.config FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Only admin can update config" ON public.config FOR UPDATE USING (public.is_admin());

-- Readings: Authenticated users can read
CREATE POLICY "Authenticated users can view readings" ON public.readings FOR SELECT USING (auth.role() = 'authenticated');

-- Alerts: Authenticated users can view, authenticated can acknowledge, admin can update/resolve
CREATE POLICY "Authenticated users can view alerts" ON public.alerts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can acknowledge alerts" ON public.alerts FOR UPDATE USING (auth.role() = 'authenticated');

-- Commands: Authenticated users can view commands, only admin can insert commands
CREATE POLICY "Authenticated users can view commands" ON public.commands FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Only admin can queue commands" ON public.commands FOR INSERT WITH CHECK (public.is_admin());

-- Contacts: Authenticated users can view, only admin can manage
CREATE POLICY "Authenticated users can view contacts" ON public.contacts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can manage contacts" ON public.contacts FOR ALL USING (public.is_admin());

-- Events: Authenticated users can view events
CREATE POLICY "Authenticated users can view events" ON public.events FOR SELECT USING (auth.role() = 'authenticated');

-- Enable Supabase Realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.readings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.commands;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.config;

-- ============================================================================
-- Gas & Fire Monitor PWA: Seed Data
-- ============================================================================

-- 1. Insert default system configuration (Single row: id = 1)
INSERT INTO public.config (
    id,
    device_id,
    gas_watch_threshold,
    gas_danger_threshold,
    smoke_watch_threshold,
    smoke_danger_threshold,
    temp_watch_threshold,
    temp_danger_threshold,
    clean_air_baseline,
    offline_timeout_seconds,
    ack_timeout_seconds,
    quiet_hours_enabled,
    quiet_hours_start,
    quiet_hours_end,
    maintenance_mode
) VALUES (
    1,
    'esp32_main',
    150.0,
    300.0,
    100.0,
    250.0,
    45.0,
    60.0,
    85.0,
    60,
    120,
    false,
    '22:00:00',
    '07:00:00',
    false
) ON CONFLICT (id) DO NOTHING;

-- 2. Insert emergency contacts
INSERT INTO public.contacts (id, name, phone_number, relationship, priority, is_active)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Primary Admin (Home)', '+639171234567', 'Primary Safety Operator', 1, true),
    ('22222222-2222-2222-2222-222222222222', 'Secondary Emergency / Building Guard', '+639189876543', 'Escalation Contact', 2, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Initial Baseline Event
INSERT INTO public.events (event_type, severity, summary, details, actor)
VALUES (
    'config_updated',
    'info',
    'System configuration initialized with safety thresholds: Gas Danger > 300 PPM, Temp Danger > 60°C',
    '{"gas_danger": 300, "temp_danger": 60, "offline_timeout": 60}'::jsonb,
    'system'
);

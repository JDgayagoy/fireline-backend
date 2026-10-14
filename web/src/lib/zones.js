/**
 * Single source of truth for turning a reading and thresholds into:
 * 'safe' | 'watch' | 'danger' | 'offline'
 * 
 * Used across StatusBanner, SensorCard, ConnectionBadge, and charts
 * so colors and status labels never disagree.
 */

export function getOverallZone({
  isDeviceOnline = true,
  secondsSinceLastReading = 0,
  offlineTimeoutSeconds = 60,
  gasPPM = 0,
  temperature = 0,
  smokeLevel = 0,
  config = {}
}) {
  // 1. Check Offline / Staleness
  if (!isDeviceOnline || (secondsSinceLastReading !== null && secondsSinceLastReading > offlineTimeoutSeconds)) {
    return {
      zone: 'offline',
      label: 'Offline',
      icon: 'WifiOff',
      message: `Device offline. No reading for ${secondsSinceLastReading ?? offlineTimeoutSeconds}s.`,
      bgClass: 'bg-offline/15',
      borderClass: 'border-offline/40',
      textClass: 'text-offline',
      badgeClass: 'bg-zinc-800 text-zinc-300 border-zinc-700'
    };
  }

  const gasDanger = config.gas_danger_threshold || 300;
  const tempDanger = config.temp_danger_threshold || 60;
  const gasWatch = config.gas_watch_threshold || 150;
  const tempWatch = config.temp_watch_threshold || 45;

  // 2. Check Danger Thresholds
  if (gasPPM >= gasDanger || temperature >= tempDanger) {
    const trigger = gasPPM >= gasDanger
      ? `Gas level reached ${gasPPM} PPM (limit: ${gasDanger})`
      : `Temperature reached ${temperature}°C (limit: ${tempDanger}°C)`;

    return {
      zone: 'danger',
      label: 'Danger',
      icon: 'Flame',
      trigger,
      message: `CRITICAL RISK: ${trigger}`,
      bgClass: 'bg-red-500/15',
      borderClass: 'border-red-500',
      textClass: 'text-red-500',
      badgeClass: 'bg-red-600 text-white border-red-700'
    };
  }

  // 3. Check Watch Thresholds
  if (gasPPM >= gasWatch || temperature >= tempWatch) {
    const trigger = gasPPM >= gasWatch
      ? `Gas elevated at ${gasPPM} PPM (watch: ${gasWatch})`
      : `Temperature elevated at ${temperature}°C (watch: ${tempWatch}°C)`;

    return {
      zone: 'watch',
      label: 'Watch',
      icon: 'TriangleAlert',
      trigger,
      message: `Warning: ${trigger}`,
      bgClass: 'bg-amber-500/15',
      borderClass: 'border-amber-500',
      textClass: 'text-amber-500',
      badgeClass: 'bg-amber-500 text-zinc-950 border-amber-600 font-semibold'
    };
  }

  // 4. Safe State
  return {
    zone: 'safe',
    label: 'Safe',
    icon: 'ShieldCheck',
    message: 'All clear. Sensors operating normally within safe baselines.',
    bgClass: 'bg-emerald-500/15',
    borderClass: 'border-emerald-500/40',
    textClass: 'text-emerald-500',
    badgeClass: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40'
  };
}

export function getSensorZone(value, watchThreshold, dangerThreshold, isStale = false) {
  if (isStale) {
    return {
      zone: 'offline',
      label: 'Stale',
      progressPercent: 0,
      color: '#71717a'
    };
  }

  const num = Number(value) || 0;
  const progressPercent = Math.min(100, Math.round((num / dangerThreshold) * 100));

  if (num >= dangerThreshold) {
    return {
      zone: 'danger',
      label: 'Danger',
      progressPercent,
      color: '#ef4444'
    };
  }
  if (num >= watchThreshold) {
    return {
      zone: 'watch',
      label: 'Watch',
      progressPercent,
      color: '#f59e0b'
    };
  }
  return {
    zone: 'safe',
    label: 'Safe',
    progressPercent,
    color: '#10b981'
  };
}

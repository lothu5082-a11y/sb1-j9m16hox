// ---------------------------------------------------------------------------
// batteryMonitor.ts
// Vexsora — battery and thermal monitoring for power-aware LLM operation
// ---------------------------------------------------------------------------

import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// expo-battery dynamic import — graceful fallback
// ---------------------------------------------------------------------------

type BatteryModuleShape = {
  getBatteryLevelAsync(): Promise<number>;
  getBatteryStateAsync(): Promise<number>;
  // BatteryState enum values: UNKNOWN=0, UNPLUGGED=1, CHARGING=2, FULL=3
};

// expo-battery BatteryState enum values
const BATTERY_STATE_CHARGING = 2;
const BATTERY_STATE_FULL = 3;

let _battery: BatteryModuleShape | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  _battery = require('expo-battery') as BatteryModuleShape;
} catch {
  _battery = null;
}

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

const THRESHOLD_LOW_POWER = 0.15; // 15 %
const THRESHOLD_CRITICAL = 0.05;  // 5 %
const THERMAL_HIGH_CELSIUS = 45;   // °C — switch to low-power above this

const POLL_INTERVAL_MS = 30_000; // 30 seconds

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BatteryProfile = 'normal' | 'low_power' | 'critical';

export interface BatteryState {
  level: number;         // 0..1
  isCharging: boolean;
  profile: BatteryProfile;
  temperatureCelsius: number | null; // null when unavailable
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _deriveProfile(
  level: number,
  isCharging: boolean,
  temp: number | null
): BatteryProfile {
  // When charging we never throttle inference
  if (isCharging) return 'normal';
  if (level <= THRESHOLD_CRITICAL) return 'critical';
  if (level <= THRESHOLD_LOW_POWER) return 'low_power';
  if (temp !== null && temp > THERMAL_HIGH_CELSIUS) return 'low_power';
  return 'normal';
}

// ---------------------------------------------------------------------------
// BatteryMonitor
// ---------------------------------------------------------------------------

class BatteryMonitor {
  private _state: BatteryState = {
    level: 1,
    isCharging: false,
    profile: 'normal',
    temperatureCelsius: null,
  };

  private _intervalId: ReturnType<typeof setInterval> | null = null;
  private _onProfileChange: ((profile: BatteryProfile) => void) | null = null;

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Begin polling battery status every 30 seconds.
   *
   * Only active on Android (Platform.OS === 'android'). On other platforms
   * (iOS, web) the callback will never fire but the service stays inert.
   *
   * @param onProfileChange - Called whenever the {@link BatteryProfile} changes.
   */
  start(onProfileChange: (profile: BatteryProfile) => void): void {
    if (Platform.OS !== 'android') return;

    this._onProfileChange = onProfileChange;

    // Immediate first poll
    this._poll().catch(() => {});

    // Periodic polls
    this._intervalId = setInterval(() => {
      this._poll().catch(() => {});
    }, POLL_INTERVAL_MS);
  }

  /** Stop polling and remove the profile-change callback. */
  stop(): void {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    this._onProfileChange = null;
  }

  /** Return the most recently sampled battery state. */
  getCurrentState(): BatteryState {
    return { ...this._state };
  }

  /**
   * Recommended `n_threads` value for the LLM based on the current profile.
   *
   * | Profile    | Threads |
   * |------------|---------|
   * | normal     | 4       |
   * | low_power  | 2       |
   * | critical   | 1       |
   */
  getRecommendedThreads(): number {
    switch (this._state.profile) {
      case 'critical':
        return 1;
      case 'low_power':
        return 2;
      case 'normal':
      default:
        return 4;
    }
  }

  /**
   * Recommended `n_predict` (max new tokens) for the LLM based on current profile.
   *
   * | Profile    | n_predict |
   * |------------|-----------|
   * | normal     | 200       |
   * | low_power  | 100       |
   * | critical   | 50        |
   */
  getRecommendedNPredict(): number {
    switch (this._state.profile) {
      case 'critical':
        return 50;
      case 'low_power':
        return 100;
      case 'normal':
      default:
        return 200;
    }
  }

  // -------------------------------------------------------------------------
  // Internal polling
  // -------------------------------------------------------------------------

  private async _poll(): Promise<void> {
    if (!_battery) {
      // Native module unavailable — keep stub state
      return;
    }

    try {
      const [level, batteryStateCode] = await Promise.all([
        _battery.getBatteryLevelAsync(),
        _battery.getBatteryStateAsync(),
      ]);

      const isCharging =
        batteryStateCode === BATTERY_STATE_CHARGING ||
        batteryStateCode === BATTERY_STATE_FULL;

      // Temperature is not exposed by expo-battery; reserved for future use
      // via a device-specific native call or react-native-device-info.
      const temperatureCelsius: number | null = null;

      const profile = _deriveProfile(level, isCharging, temperatureCelsius);
      const prevProfile = this._state.profile;

      this._state = { level, isCharging, profile, temperatureCelsius };

      if (profile !== prevProfile && this._onProfileChange) {
        this._onProfileChange(profile);
      }
    } catch {
      // Silently ignore individual poll failures — stale state is acceptable.
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const batteryMonitor = new BatteryMonitor();

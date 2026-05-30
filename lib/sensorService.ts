// ---------------------------------------------------------------------------
// sensorService.ts
// Vexsora — accelerometer-based gesture detection
//   • Double-shake  → wake / activate voice input
//   • Flip face-down → mute / stop output
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// expo-sensors dynamic import — graceful fallback
// ---------------------------------------------------------------------------

type AccelerometerSubscription = { remove(): void };

type AccelerometerModuleShape = {
  setUpdateInterval(ms: number): void;
  addListener(cb: (data: { x: number; y: number; z: number }) => void): AccelerometerSubscription;
};

let _Accelerometer: AccelerometerModuleShape | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sensors = require('expo-sensors');
  _Accelerometer = (sensors.Accelerometer ?? null) as AccelerometerModuleShape | null;
} catch {
  _Accelerometer = null;
}

// ---------------------------------------------------------------------------
// Tuning constants
// ---------------------------------------------------------------------------

/** Minimum instantaneous acceleration magnitude (m/s²) to count as a shake peak. */
const SHAKE_THRESHOLD = 18;

/** Maximum time (ms) between two shake peaks to count as a double-shake. */
const DOUBLE_SHAKE_WINDOW_MS = 800;

/** Accelerometer polling interval (ms). */
const POLL_INTERVAL_MS = 100;

/** How long (ms) Z < FACE_DOWN_Z_THRESHOLD must be sustained to fire the face-down event. */
const FACE_DOWN_SUSTAIN_MS = 500;

/** Z-axis value below which the device is considered face-down. */
const FACE_DOWN_Z_THRESHOLD = -8;

// ---------------------------------------------------------------------------
// SensorService
// ---------------------------------------------------------------------------

export interface SensorCallbacks {
  onDoubleShake: () => void;
  onFaceDown: () => void;
}

class SensorService {
  private _subscription: AccelerometerSubscription | null = null;
  private _callbacks: SensorCallbacks | null = null;

  // Double-shake detection state
  private _lastShakeTime = 0;
  private _shakePeakCount = 0;

  // Face-down detection state
  private _faceDownSince: number | null = null;
  private _faceDownFired = false;

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Subscribe to the accelerometer and begin gesture detection.
   *
   * If expo-sensors is not available the method returns silently without
   * throwing — callers do not need to guard the call.
   *
   * @param callbacks.onDoubleShake - Fires when two large acceleration peaks
   *   occur within {@link DOUBLE_SHAKE_WINDOW_MS} ms.
   * @param callbacks.onFaceDown    - Fires when the device has been face-down
   *   (Z < {@link FACE_DOWN_Z_THRESHOLD}) for at least {@link FACE_DOWN_SUSTAIN_MS} ms.
   */
  start(callbacks: SensorCallbacks): void {
    if (!_Accelerometer) return;
    if (this._subscription) this.stop();

    this._callbacks = callbacks;
    this._resetState();

    try {
      _Accelerometer.setUpdateInterval(POLL_INTERVAL_MS);
      this._subscription = _Accelerometer.addListener((data) =>
        this._handleSample(data)
      );
    } catch {
      this._subscription = null;
    }
  }

  /** Unsubscribe from the accelerometer and clear all state. */
  stop(): void {
    if (this._subscription) {
      try {
        this._subscription.remove();
      } catch {
        // Safe to ignore
      }
      this._subscription = null;
    }
    this._callbacks = null;
    this._resetState();
  }

  /** Returns true when the sensor subscription is active. */
  isActive(): boolean {
    return this._subscription !== null;
  }

  // -------------------------------------------------------------------------
  // Sample processing
  // -------------------------------------------------------------------------

  private _handleSample(data: { x: number; y: number; z: number }): void {
    const now = Date.now();
    this._detectDoubleShake(data, now);
    this._detectFaceDown(data, now);
  }

  /**
   * Double-shake detection algorithm:
   *  1. Compute the magnitude of the acceleration vector.
   *  2. If magnitude > SHAKE_THRESHOLD, record a peak timestamp.
   *  3. If a second peak arrives within DOUBLE_SHAKE_WINDOW_MS, fire the callback.
   *  4. Reset peak count after the window expires.
   */
  private _detectDoubleShake(
    { x, y, z }: { x: number; y: number; z: number },
    now: number
  ): void {
    const magnitude = Math.sqrt(x * x + y * y + z * z);

    if (magnitude < SHAKE_THRESHOLD) return;

    const timeSinceLast = now - this._lastShakeTime;

    if (timeSinceLast > DOUBLE_SHAKE_WINDOW_MS) {
      // First peak (or previous window expired) — start a new window
      this._shakePeakCount = 1;
      this._lastShakeTime = now;
      return;
    }

    // Second (or more) peak within the window
    this._shakePeakCount += 1;

    if (this._shakePeakCount >= 2) {
      // Fire and reset so the gesture doesn't re-trigger immediately
      this._shakePeakCount = 0;
      this._lastShakeTime = 0;
      try {
        this._callbacks?.onDoubleShake();
      } catch {
        // Protect sensor loop from callback exceptions
      }
    }
  }

  /**
   * Face-down detection algorithm:
   *  1. When Z drops below FACE_DOWN_Z_THRESHOLD, record the start time.
   *  2. If Z stays below threshold for FACE_DOWN_SUSTAIN_MS, fire the callback once.
   *  3. Once the device is lifted (Z rises back above threshold), reset so the
   *     event can fire again next time the device is flipped.
   */
  private _detectFaceDown(
    { z }: { x: number; y: number; z: number },
    now: number
  ): void {
    const isFaceDown = z < FACE_DOWN_Z_THRESHOLD;

    if (isFaceDown) {
      if (this._faceDownSince === null) {
        // Device just went face-down
        this._faceDownSince = now;
        this._faceDownFired = false;
      } else if (
        !this._faceDownFired &&
        now - this._faceDownSince >= FACE_DOWN_SUSTAIN_MS
      ) {
        this._faceDownFired = true;
        try {
          this._callbacks?.onFaceDown();
        } catch {
          // Protect sensor loop from callback exceptions
        }
      }
    } else {
      // Device lifted — allow the gesture to fire again next time
      this._faceDownSince = null;
      this._faceDownFired = false;
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private _resetState(): void {
    this._lastShakeTime = 0;
    this._shakePeakCount = 0;
    this._faceDownSince = null;
    this._faceDownFired = false;
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const sensorService = new SensorService();

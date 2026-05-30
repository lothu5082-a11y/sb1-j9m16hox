// ---------------------------------------------------------------------------
// sensorService.ts
// Vexsora — accelerometer-based gesture detection
//   • Double-shake  → wake / activate voice input
//   • Flip face-down → mute / stop output
//
// Uses the native VexsoraSensor module (SensorModule.kt) which emits
// "VexsoraAccelerometer" events via RCTDeviceEventEmitter.
// Falls back to a no-op on web / when native module is unavailable.
// ---------------------------------------------------------------------------

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Tuning constants
// ---------------------------------------------------------------------------

const SHAKE_THRESHOLD = 18;
const DOUBLE_SHAKE_WINDOW_MS = 800;
const FACE_DOWN_Z_THRESHOLD = -8;
const FACE_DOWN_SUSTAIN_MS = 500;

// ---------------------------------------------------------------------------
// SensorService
// ---------------------------------------------------------------------------

export interface SensorCallbacks {
  onDoubleShake: () => void;
  onFaceDown: () => void;
}

class SensorService {
  private _subscription: { remove(): void } | null = null;
  private _callbacks: SensorCallbacks | null = null;

  // Double-shake state
  private _lastShakeTime = 0;
  private _shakePeakCount = 0;

  // Face-down state
  private _faceDownSince: number | null = null;
  private _faceDownFired = false;

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  start(callbacks: SensorCallbacks): void {
    if (Platform.OS !== 'android') return;

    const nativeModule = NativeModules.VexsoraSensor;
    if (!nativeModule) return;

    if (this._subscription) this.stop();
    this._callbacks = callbacks;
    this._resetState();

    try {
      nativeModule.startAccelerometer?.();
      const emitter = new NativeEventEmitter(nativeModule);
      this._subscription = emitter.addListener(
        'VexsoraAccelerometer',
        (data: { x: number; y: number; z: number }) => this._handleSample(data)
      );
    } catch {
      this._subscription = null;
    }
  }

  stop(): void {
    try {
      this._subscription?.remove();
      NativeModules.VexsoraSensor?.stopAccelerometer?.();
    } catch {
      // safe to ignore
    }
    this._subscription = null;
    this._callbacks = null;
    this._resetState();
  }

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

  private _detectDoubleShake(
    { x, y, z }: { x: number; y: number; z: number },
    now: number
  ): void {
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    if (magnitude < SHAKE_THRESHOLD) return;

    const timeSinceLast = now - this._lastShakeTime;
    if (timeSinceLast > DOUBLE_SHAKE_WINDOW_MS) {
      this._shakePeakCount = 1;
      this._lastShakeTime = now;
      return;
    }

    this._shakePeakCount += 1;
    if (this._shakePeakCount >= 2) {
      this._shakePeakCount = 0;
      this._lastShakeTime = 0;
      try { this._callbacks?.onDoubleShake(); } catch { /* protect loop */ }
    }
  }

  private _detectFaceDown(
    { z }: { x: number; y: number; z: number },
    now: number
  ): void {
    const isFaceDown = z < FACE_DOWN_Z_THRESHOLD;
    if (isFaceDown) {
      if (this._faceDownSince === null) {
        this._faceDownSince = now;
        this._faceDownFired = false;
      } else if (!this._faceDownFired && now - this._faceDownSince >= FACE_DOWN_SUSTAIN_MS) {
        this._faceDownFired = true;
        try { this._callbacks?.onFaceDown(); } catch { /* protect loop */ }
      }
    } else {
      this._faceDownSince = null;
      this._faceDownFired = false;
    }
  }

  private _resetState(): void {
    this._lastShakeTime = 0;
    this._shakePeakCount = 0;
    this._faceDownSince = null;
    this._faceDownFired = false;
  }
}

export const sensorService = new SensorService();

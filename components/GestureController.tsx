import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

interface GestureControllerProps {
  onShake?: () => void;
  onVolumeUp?: () => void;
  onVolumeDown?: () => void;
  onCameraWave?: () => void;
  cameraGestureEnabled?: boolean;
}

export default function GestureController({
  onShake,
  onVolumeUp,
  onVolumeDown,
  onCameraWave,
  cameraGestureEnabled = false,
}: GestureControllerProps) {
  const lastAccRef   = useRef({ x: 0, y: 0, z: 0 });
  const shakeTimeRef = useRef(0);
  const waveTimeRef  = useRef(0);
  const streamRef    = useRef<MediaStream | null>(null);
  const rafRef       = useRef<number>(0);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);

  // ── Shake + volume keys ─────────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      const x = acc.x ?? 0, y = acc.y ?? 0, z = acc.z ?? 0;
      const prev = lastAccRef.current;
      const delta = Math.sqrt((x - prev.x) ** 2 + (y - prev.y) ** 2 + (z - prev.z) ** 2);
      lastAccRef.current = { x, y, z };
      const now = Date.now();
      if (delta > 20 && now - shakeTimeRef.current > 1200) {
        shakeTimeRef.current = now;
        onShake?.();
      }
    };
    window.addEventListener('devicemotion', handleMotion as any);

    const handleKey = (e: KeyboardEvent) => {
      const k = e.key || e.code;
      if (k === 'AudioVolumeUp' || k === 'VolumeUp') {
        e.preventDefault();
        onVolumeUp?.();
      } else if (k === 'AudioVolumeDown' || k === 'VolumeDown') {
        e.preventDefault();
        onVolumeDown?.();
      }
    };
    window.addEventListener('keydown', handleKey);

    // MediaSession for headset / Bluetooth media buttons
    if ('mediaSession' in navigator) {
      try {
        (navigator as any).mediaSession.setActionHandler('nexttrack', () => onVolumeUp?.());
        (navigator as any).mediaSession.setActionHandler('previoustrack', () => onVolumeDown?.());
      } catch {}
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotion as any);
      window.removeEventListener('keydown', handleKey);
      try {
        (navigator as any).mediaSession.setActionHandler('nexttrack', null);
        (navigator as any).mediaSession.setActionHandler('previoustrack', null);
      } catch {}
    };
  }, [onShake, onVolumeUp, onVolumeDown]);

  // ── Camera motion / wave gesture ────────────────────────────────────────────
  useEffect(() => {
    if (!cameraGestureEnabled || Platform.OS !== 'web' || typeof window === 'undefined') return;

    let alive = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 64 }, height: { ideal: 48 } },
        });
        if (!alive) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        await video.play();

        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 48;
        const ctx = canvas.getContext('2d')!;

        const detect = () => {
          if (!alive) return;
          ctx.drawImage(video, 0, 0, 64, 48);
          const { data } = ctx.getImageData(0, 0, 64, 48);
          const prev = prevFrameRef.current;
          if (prev) {
            let diff = 0;
            for (let i = 0; i < data.length; i += 4) diff += Math.abs(data[i] - prev[i]);
            const avgDiff = diff / (data.length / 4);
            const now = Date.now();
            if (avgDiff > 28 && now - waveTimeRef.current > 1500) {
              waveTimeRef.current = now;
              onCameraWave?.();
            }
          }
          prevFrameRef.current = new Uint8ClampedArray(data);
          rafRef.current = requestAnimationFrame(detect);
        };
        detect();
      } catch { /* no camera permission */ }
    };

    startCamera();

    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      prevFrameRef.current = null;
    };
  }, [cameraGestureEnabled, onCameraWave]);

  return null;
}

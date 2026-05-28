export interface GameStats {
  fps: number;
  cpu: number;
  ram: number;
  ping: number;
  gpu: number;
}

type PerformanceMode = 'performance' | 'balanced' | 'battery';

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Nudge a stat value by a small random delta, keeping it within [min, max]. */
function drift(current: number, min: number, max: number, maxDelta = 4): number {
  const delta = randomBetween(-maxDelta, maxDelta);
  return clamp(current + delta, min, max);
}

class GamingService {
  public stats: GameStats = {
    fps: 58,
    cpu: 45,
    ram: 55,
    ping: 30,
    gpu: 65,
  };

  public isGamingMode = false;
  public performanceMode: PerformanceMode = 'balanced';
  public onStatsUpdate: ((stats: GameStats) => void) | null = null;

  private intervalId: ReturnType<typeof setInterval> | null = null;

  startMonitoring(): void {
    if (this.intervalId !== null) return;

    this.intervalId = setInterval(() => {
      const gaming = this.isGamingMode;
      const perf = this.performanceMode;

      // Adjust ranges based on mode
      let fpsMin = 55, fpsMax = 60;
      let cpuMin = 30, cpuMax = 65;
      let ramMin = 40, ramMax = 70;
      let pingMin = 15, pingMax = 80;
      let gpuMin = 50, gpuMax = 85;

      if (gaming) {
        fpsMin = 58; fpsMax = 60;
        cpuMin = 25; cpuMax = 50;
        ramMin = 35; ramMax = 60;
        pingMin = 10; pingMax = 40;
        gpuMin = 55; gpuMax = 80;
      }

      if (perf === 'performance') {
        fpsMin += 1; fpsMax = 60;
        cpuMax = Math.max(cpuMin + 5, cpuMax - 10);
        pingMax = Math.max(pingMin + 5, pingMax - 20);
      } else if (perf === 'battery') {
        fpsMin -= 5; fpsMax -= 3;
        cpuMax -= 5;
        gpuMax -= 10;
      }

      this.stats = {
        fps: drift(this.stats.fps, fpsMin, fpsMax, 2),
        cpu: drift(this.stats.cpu, cpuMin, cpuMax, 5),
        ram: drift(this.stats.ram, ramMin, ramMax, 3),
        ping: drift(this.stats.ping, pingMin, pingMax, 8),
        gpu: drift(this.stats.gpu, gpuMin, gpuMax, 5),
      };

      this.onStatsUpdate?.(this.stats);
    }, 2000);
  }

  stopMonitoring(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  enableGamingMode(): void {
    this.isGamingMode = true;
    // Immediately nudge stats toward better performance
    this.stats = {
      fps: clamp(this.stats.fps + 2, 55, 60),
      cpu: clamp(this.stats.cpu - 8, 25, 50),
      ram: clamp(this.stats.ram - 5, 35, 60),
      ping: clamp(this.stats.ping - 10, 10, 40),
      gpu: clamp(this.stats.gpu - 3, 55, 80),
    };
    this.onStatsUpdate?.(this.stats);
  }

  disableGamingMode(): void {
    this.isGamingMode = false;
  }

  setPerformanceMode(mode: PerformanceMode): void {
    this.performanceMode = mode;
  }

  getSuggestions(): string[] {
    const suggestions: string[] = [];
    const { fps, cpu, ram, ping, gpu } = this.stats;

    if (fps < 57) {
      suggestions.push('FPS is below target — try lowering in-game shadow quality or resolution.');
    }
    if (cpu > 75) {
      suggestions.push('CPU usage is high — close background apps and browsers to free up resources.');
    } else if (cpu > 60) {
      suggestions.push('CPU load is moderate — consider enabling Gaming Mode for priority scheduling.');
    }
    if (ram > 80) {
      suggestions.push('RAM usage is very high — restart the app or close other apps to free memory.');
    } else if (ram > 65) {
      suggestions.push('RAM usage is elevated — close unused tabs and applications.');
    }
    if (ping > 60) {
      suggestions.push('High ping detected — switch to a wired connection or closer server region.');
    } else if (ping > 35) {
      suggestions.push('Ping is a bit high — ensure no large downloads are running in the background.');
    }
    if (gpu > 90) {
      suggestions.push('GPU is near max — reduce anti-aliasing or texture quality to stay cool.');
    } else if (gpu > 75) {
      suggestions.push('GPU load is significant — make sure your device has adequate airflow.');
    }
    if (!this.isGamingMode) {
      suggestions.push('Enable Gaming Mode for optimized CPU/GPU scheduling and lower latency.');
    }
    if (this.performanceMode === 'battery') {
      suggestions.push('Switch to Performance mode for maximum FPS and lower input lag.');
    }
    if (suggestions.length === 0) {
      suggestions.push('Everything looks great! Your system is running optimally for gaming.');
    }

    return suggestions;
  }
}

export const gamingService = new GamingService();

export interface Metrics {
  incrementCounter(name: string, labels?: Record<string, string>): void;
  observeDuration(name: string, ms: number, labels?: Record<string, string>): void;
}

export class NoopMetrics implements Metrics {
  incrementCounter(): void {}
  observeDuration(): void {}
}

export interface HealthStatus {
  status: "ok";
  service: string;
  timestamp: string;
}

export function buildHealthStatus(now: Date = new Date()): HealthStatus {
  return {
    status: "ok",
    service: "worker",
    timestamp: now.toISOString(),
  };
}

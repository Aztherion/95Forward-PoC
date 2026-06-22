"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

interface JobSummary {
  id: string;
  prospectId: string;
  prospectName: string;
  status: "queued" | "researching" | "ready" | "reviewed";
}

interface DiscoverySummary {
  taskId: string;
  connectorName: string;
  status: "queued" | "researching" | "ready" | "reviewed";
}

interface TrayState {
  researching: JobSummary[];
  ready: JobSummary[];
  readyCount: number;
  discoveryResearching: DiscoverySummary[];
  discoveryReady: DiscoverySummary[];
  discoveryReadyCount: number;
}

const POLL_MS = 15000;

const EMPTY: TrayState = {
  researching: [],
  ready: [],
  readyCount: 0,
  discoveryResearching: [],
  discoveryReady: [],
  discoveryReadyCount: 0,
};

export function JobTray() {
  const [state, setState] = useState<TrayState>(EMPTY);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;
    const poll = async (): Promise<void> => {
      try {
        const res = await fetch("/api/jobs/status", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as TrayState;
        if (active) setState(data);
      } catch {
        // Polling is best-effort; a transient failure just retries on the next tick.
      }
    };
    const start = (): void => {
      if (timer) return;
      void poll();
      timer = setInterval(() => void poll(), POLL_MS);
    };
    const stop = (): void => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = (): void => {
      if (document.hidden) stop();
      else start();
    };
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const researchingCount = state.researching.length;
  const discoveryResearchingCount = state.discoveryResearching.length;
  const activeCount = researchingCount + discoveryResearchingCount;
  const readyTotal = state.readyCount + state.discoveryReadyCount;
  if (activeCount === 0 && readyTotal === 0) return null;

  const firstResearching = state.researching[0];
  const firstDiscovery = state.discoveryResearching[0];
  const firstReady = state.ready[0];
  const firstDiscoveryReady = state.discoveryReady[0];

  return (
    <aside className="f95-jobtray" data-testid="job-tray" aria-live="polite">
      <Sparkles size={15} strokeWidth={1.8} className="f95-jobtray__mark" aria-hidden />
      {researchingCount > 0 ? (
        <span className="f95-jobtray__item" data-testid="job-tray-researching">
          <span className="f95-jobtray__pulse" aria-hidden />
          Researching
          {firstResearching ? ` ${firstResearching.prospectName}` : ""}
          {researchingCount > 1 ? ` +${String(researchingCount - 1)}` : ""}
        </span>
      ) : null}
      {discoveryResearchingCount > 0 ? (
        <span className="f95-jobtray__item" data-testid="job-tray-discovery-researching">
          <span className="f95-jobtray__pulse" aria-hidden />
          Finding introductions
          {firstDiscovery ? ` via ${firstDiscovery.connectorName}` : ""}
          {discoveryResearchingCount > 1 ? ` +${String(discoveryResearchingCount - 1)}` : ""}
        </span>
      ) : null}
      {state.readyCount > 0 && firstReady ? (
        <Link
          href={`/95-forward/prospects/${firstReady.prospectId}?tab=knowledge`}
          className="f95-jobtray__ready"
          data-testid="job-tray-ready"
        >
          {state.readyCount} ready to review
        </Link>
      ) : null}
      {state.discoveryReadyCount > 0 && firstDiscoveryReady ? (
        <Link
          href="/95-forward/prospects/candidates"
          className="f95-jobtray__ready"
          data-testid="job-tray-discovery-ready"
        >
          {state.discoveryReadyCount} candidate{state.discoveryReadyCount === 1 ? "" : " batches"}{" "}
          ready
        </Link>
      ) : null}
    </aside>
  );
}

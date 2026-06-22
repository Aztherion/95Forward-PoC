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

interface TrayState {
  researching: JobSummary[];
  ready: JobSummary[];
  readyCount: number;
}

const POLL_MS = 15000;

const EMPTY: TrayState = { researching: [], ready: [], readyCount: 0 };

export function JobTray() {
  const [state, setState] = useState<TrayState>(EMPTY);

  useEffect(() => {
    let active = true;
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
    void poll();
    const timer = setInterval(() => void poll(), POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const researchingCount = state.researching.length;
  if (researchingCount === 0 && state.readyCount === 0) return null;

  const firstResearching = state.researching[0];
  const firstReady = state.ready[0];

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
      {state.readyCount > 0 && firstReady ? (
        <Link
          href={`/95-forward/prospects/${firstReady.prospectId}?tab=knowledge`}
          className="f95-jobtray__ready"
          data-testid="job-tray-ready"
        >
          {state.readyCount} ready to review
        </Link>
      ) : null}
    </aside>
  );
}

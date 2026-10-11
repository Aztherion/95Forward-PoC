import type { Database } from "@95forward/db";
import type { Providers } from "../types";
import { runResearchProspectJob, type ResearchJobPayload } from "./research-prospect";
import { runEmbedContentJob, type EmbedJobPayload } from "./embed-content";
import { runFollowUpDraftJob, type FollowUpDraftPayload } from "./draft-follow-up";
import { runDiscoveryJob, type DiscoveryJobPayload } from "./discovery-prospects";
import { runScoreMeetingJob, type ScoreMeetingJobPayload } from "./score-meeting";
import { DeterministicMeetingDecider, type MeetingDecider } from "../scorecards";

export const JOB_NAMES = {
  research: "research-prospect",
  embed: "embed-content",
  followUpDraft: "draft-follow-up",
  discovery: "discovery-prospects",
  scoreMeeting: "score-meeting",
  embedSweep: "embed-sweep",
} as const;

// Graphile's Task is (payload, helpers) => Promise<void>; we only need the payload here, so the
// task-list is expressed as plain handlers and adapted to Graphile's signature by the worker/runner.
export type JobHandler = (payload: unknown) => Promise<void>;

export interface JobRuntime {
  // The worker passes its app_user pool here; handlers wrap their own withTenant calls, so RLS is
  // enforced regardless of which process (worker or the e2e drain route) runs the task.
  db: Database;
  providers: Providers;
  // Tenant ids for cron sweeps that fan out across the whole org (resolved on the owner pool by
  // the caller, since a cron job has no tenant context of its own).
  listTenantIds: () => Promise<string[]>;
  liveFollowUpProviders?: Providers;
  /**
   * The Scorecard decision seam (I31).
   *
   * Injected by whoever owns the env — the worker reads WorkerEnv, the e2e drain route reads the
   * web Env, and neither schema is readable from in here. The DEFAULT IS THE DETERMINISTIC ONE:
   * a caller that forgets gets the key-free path, never an attempted live call.
   */
  decider?: MeetingDecider;
}

export function buildTaskList(runtime: JobRuntime): Record<string, JobHandler> {
  return {
    [JOB_NAMES.research]: async (payload) => {
      await runResearchProspectJob(payload as ResearchJobPayload, {
        db: runtime.db,
        providers: runtime.providers,
      });
    },
    [JOB_NAMES.embed]: async (payload) => {
      await runEmbedContentJob(payload as EmbedJobPayload, {
        db: runtime.db,
        providers: runtime.providers,
      });
    },
    [JOB_NAMES.followUpDraft]: async (payload) => {
      await runFollowUpDraftJob(payload as FollowUpDraftPayload, {
        db: runtime.db,
        liveProviders: runtime.liveFollowUpProviders,
      });
    },
    [JOB_NAMES.discovery]: async (payload) => {
      await runDiscoveryJob(payload as DiscoveryJobPayload, {
        db: runtime.db,
        providers: runtime.providers,
      });
    },
    [JOB_NAMES.scoreMeeting]: async (payload) => {
      await runScoreMeetingJob(payload as ScoreMeetingJobPayload, {
        db: runtime.db,
        decider: runtime.decider ?? new DeterministicMeetingDecider(),
      });
    },
    [JOB_NAMES.embedSweep]: async () => {
      const tenantIds = await runtime.listTenantIds();
      for (const tenantId of tenantIds) {
        await runEmbedContentJob({ tenantId }, { db: runtime.db, providers: runtime.providers });
      }
    },
  };
}

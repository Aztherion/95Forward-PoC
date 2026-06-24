import type { ComposedIssue } from "@95forward/shared";

export interface FeedbackState {
  ok?: boolean;
  error?: string;
  reference?: string;
  debugPayload?: ComposedIssue;
}

export const initialFeedbackState: FeedbackState = {};

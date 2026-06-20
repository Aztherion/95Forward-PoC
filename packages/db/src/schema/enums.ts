import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", [
  "major_gifts_officer",
  "gift_officer",
  "chief_development_officer",
]);

export const constituentTypeEnum = pgEnum("constituent_type", [
  "individual",
  "organization",
  "foundation",
]);

export const giftTypeEnum = pgEnum("gift_type", [
  "one_time",
  "recurring",
  "pledge",
  "planned",
  "corporate_grant",
  "in_kind",
]);

export const opportunityStageEnum = pgEnum("opportunity_stage", [
  "identification",
  "cultivation",
  "solicitation",
  "stewardship",
]);

export const fundingFrameEnum = pgEnum("funding_frame", ["today", "tomorrow", "forever"]);

export const qpiDimensionEnum = pgEnum("qpi_dimension", [
  "capacity",
  "relationship",
  "timing",
  "gift_history",
  "philanthropy",
]);

export const visitOutcomeEnum = pgEnum("visit_outcome", ["commitment", "decline", "roadmap"]);

export const askOutcomeEnum = pgEnum("ask_outcome", ["commitment", "decline", "roadmap"]);

export const marketingChannelEnum = pgEnum("marketing_channel", ["email", "appeal"]);

export const followUpStatusEnum = pgEnum("follow_up_status", ["open", "done"]);

export const discoveryStatusEnum = pgEnum("discovery_status", [
  "queued",
  "researching",
  "ready",
  "reviewed",
]);

export const candidateConfidenceEnum = pgEnum("candidate_confidence", ["low", "medium", "high"]);

export const candidateStatusEnum = pgEnum("candidate_status", [
  "suggested",
  "endorsed",
  "intro_requested",
  "promoted",
  "dismissed",
]);

export const powerQuestionCategoryEnum = pgEnum("power_question_category", [
  "opening",
  "dialogue",
  "others",
  "go_to_30k",
]);

export const prospectStatusEnum = pgEnum("prospect_status", [
  "research",
  "cultivation",
  "solicitation",
  "stewardship",
  "active",
]);

export const constituentProspectStatusEnum = pgEnum("constituent_prospect_status", [
  "none",
  "suspect",
  "prospect",
  "active",
  "donor",
]);

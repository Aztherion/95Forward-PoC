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

export const savedListRecordTypeEnum = pgEnum("saved_list_record_type", [
  "constituent",
  "gift",
  "interaction",
]);

// ---------------------------------------------------------------------------------------------
// 95 Forward — the opportunity-centric model (Initiative 18).
//
// NOTE the deliberate distinction from `opportunityStageEnum` above: that is the HOST CRM's
// four-value stage on its constituent-grain `opportunities` table. These are the add-on's six
// war-room stages on `forward_opportunities`. The two are different entities at different grains
// and must not be merged.
// ---------------------------------------------------------------------------------------------

export const forwardStageEnum = pgEnum("forward_stage", [
  "get_the_visit",
  "prep_the_visit",
  "visit_and_ask",
  "follow_up_and_close",
  "celebrate_steward",
  "repeat",
]);

export const dateConfidenceEnum = pgEnum("date_confidence", ["firm", "semi_firm", "loose"]);

export const probabilityBandEnum = pgEnum("probability_band", [
  "longshot",
  "medium",
  "high",
  "bookable",
  "lock",
]);

export const visitRatingEnum = pgEnum("visit_rating", ["poor", "mixed", "good", "strong"]);

export const forwardOpportunityStatusEnum = pgEnum("forward_opportunity_status", [
  "open",
  "won",
  "lost",
]);

export const milestoneSourceEnum = pgEnum("milestone_source", ["they_said", "we_said"]);

export const opportunityEventTypeEnum = pgEnum("opportunity_event_type", [
  "field_change",
  "contact_logged",
  "milestone_confirmed",
  "stage_change",
  "note",
]);

export const goalScopeEnum = pgEnum("goal_scope", ["org", "rep", "initiative"]);

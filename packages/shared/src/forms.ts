import { z } from "zod";

// These literal arrays MUST stay in sync with the pgEnum values in @95forward/db.
export const CONSTITUENT_TYPES = ["individual", "organization", "foundation"] as const;
export const CONSTITUENT_PROSPECT_STATUSES = [
  "none",
  "suspect",
  "prospect",
  "active",
  "donor",
] as const;
export const GIFT_TYPES = [
  "one_time",
  "recurring",
  "pledge",
  "planned",
  "corporate_grant",
  "in_kind",
] as const;
export const RECEIPT_STATUSES = ["unreceipted", "receipted"] as const;
export const SAVED_LIST_RECORD_TYPES = ["constituent", "gift", "interaction"] as const;

const optionalText = z.string().trim().max(500).optional();

export const constituentInputSchema = z.object({
  type: z.enum(CONSTITUENT_TYPES),
  displayName: z.string().trim().min(1, "A display name is required").max(200),
  firstName: optionalText,
  lastName: optionalText,
  organizationName: optionalText,
  email: z.string().trim().email("Enter a valid email").max(200).optional(),
  phone: optionalText,
  addressLine1: optionalText,
  addressLine2: optionalText,
  city: optionalText,
  region: optionalText,
  postalCode: z.string().trim().max(40).optional(),
  country: optionalText,
  prospectStatus: z.enum(CONSTITUENT_PROSPECT_STATUSES).default("none"),
  assignedUserId: z.string().uuid().optional(),
  boardMember: z.boolean().default(false),
  volunteer: z.boolean().default(false),
  wavemakerMonthly: z.boolean().default(false),
  legacy: z.boolean().default(false),
});
export type ConstituentInput = z.infer<typeof constituentInputSchema>;

export const giftInputSchema = z.object({
  constituentId: z.string().uuid("Select a constituent"),
  amountCents: z.number().int().positive("Amount must be greater than zero").max(100_000_000_00),
  giftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD format"),
  giftType: z.enum(GIFT_TYPES),
  fundId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  appealId: z.string().uuid().optional(),
  designation: optionalText,
  receiptStatus: z.enum(RECEIPT_STATUSES).default("unreceipted"),
});
export type GiftInput = z.infer<typeof giftInputSchema>;

export const namedRefInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  code: z.string().trim().max(60).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional(),
});
export type NamedRefInput = z.infer<typeof namedRefInputSchema>;

export const listFilterSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["eq", "neq", "contains", "gte", "lte", "in", "is_true", "is_false"]),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
});
export type ListFilter = z.infer<typeof listFilterSchema>;

export const savedListDefinitionSchema = z.object({
  filters: z.array(listFilterSchema).default([]),
  search: z.string().optional(),
  sort: z.object({ field: z.string(), dir: z.enum(["asc", "desc"]) }).optional(),
  columns: z.array(z.string()).optional(),
});
export type SavedListDefinition = z.infer<typeof savedListDefinitionSchema>;

export const savedListInputSchema = z.object({
  name: z.string().trim().min(1, "Name the list").max(120),
  recordType: z.enum(SAVED_LIST_RECORD_TYPES),
  definition: savedListDefinitionSchema,
});
export type SavedListInput = z.infer<typeof savedListInputSchema>;

export const INTERACTION_TYPES = ["call", "email", "meeting", "note"] as const;

export const interactionInputSchema = z.object({
  constituentId: z.string().uuid("Select a constituent"),
  type: z.enum(INTERACTION_TYPES),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD format"),
  summary: z.string().trim().max(2000).optional(),
  ownerUserId: z.string().uuid().optional(),
});
export type InteractionInput = z.infer<typeof interactionInputSchema>;

export const RELATIONSHIP_TYPES = [
  "connector",
  "colleague",
  "peer",
  "household",
  "board_contact",
  "staff_contact",
  "spouse",
  "family",
  "advisor",
  "other",
] as const;

export const relationshipInputSchema = z
  .object({
    fromConstituentId: z.string().uuid(),
    toConstituentId: z.string().uuid().optional(),
    externalName: z.string().trim().max(200).optional(),
    type: z.string().trim().min(1, "Choose a relationship type").max(60),
    note: z.string().trim().max(1000).optional(),
  })
  .refine((value) => Boolean(value.toConstituentId) || Boolean(value.externalName), {
    message: "Link a constituent or name an external contact",
    path: ["toConstituentId"],
  });
export type RelationshipInput = z.infer<typeof relationshipInputSchema>;

export const tagInputSchema = z
  .object({
    constituentId: z.string().uuid(),
    tagId: z.string().uuid().optional(),
    newTagName: z.string().trim().min(1).max(80).optional(),
  })
  .refine((value) => Boolean(value.tagId) || Boolean(value.newTagName), {
    message: "Pick a tag or name a new one",
    path: ["tagId"],
  });
export type TagInput = z.infer<typeof tagInputSchema>;

export const OPPORTUNITY_STAGES = [
  "identification",
  "cultivation",
  "solicitation",
  "stewardship",
] as const;

export const opportunityInputSchema = z.object({
  constituentId: z.string().uuid("Select a constituent"),
  stage: z.enum(OPPORTUNITY_STAGES),
  askAmountCents: z.number().int().positive().max(100_000_000_00).optional(),
  expectedAmountCents: z.number().int().positive().max(100_000_000_00).optional(),
  expectedCloseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional(),
  likelihoodPct: z.number().int().min(0).max(100).optional(),
  ownerUserId: z.string().uuid().optional(),
});
export type OpportunityInput = z.infer<typeof opportunityInputSchema>;

export const PROPOSAL_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "declined",
  "funded",
] as const;

export const proposalInputSchema = z.object({
  constituentId: z.string().uuid("Select a constituent"),
  purpose: z.string().trim().max(500).optional(),
  amountCents: z.number().int().positive().max(100_000_000_00).optional(),
  status: z.enum(PROPOSAL_STATUSES).default("draft"),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional(),
});
export type ProposalInput = z.infer<typeof proposalInputSchema>;

// A segment is a saved filter over constituents, so it reuses the saved-list definition shape.
export const segmentInputSchema = z.object({
  name: z.string().trim().min(1, "Name the segment").max(120),
  description: z.string().trim().max(500).optional(),
  definition: savedListDefinitionSchema,
});
export type SegmentInput = z.infer<typeof segmentInputSchema>;

// MARKETING_CHANNELS mirrors the marketing_channel pgEnum; the *_STATUSES and EVENT_TYPES below
// back text columns and are enforced only here.
export const MARKETING_CHANNELS = ["email", "appeal"] as const;
export const MARKETING_STATUSES = ["draft", "scheduled", "sent"] as const;

export const communicationInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name the communication").max(200),
    channel: z.enum(MARKETING_CHANNELS),
    segmentId: z.string().uuid().optional(),
    subject: z.string().trim().max(300).optional(),
    body: z.string().trim().max(20_000).optional(),
    status: z.enum(MARKETING_STATUSES).default("draft"),
    scheduledAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
      .optional(),
  })
  .refine((value) => value.status !== "scheduled" || Boolean(value.scheduledAt), {
    message: "A scheduled communication needs a scheduled date",
    path: ["scheduledAt"],
  });
export type CommunicationInput = z.infer<typeof communicationInputSchema>;

export const EVENT_TYPES = [
  "gala",
  "breakfast",
  "luncheon",
  "house_party",
  "site_visit",
  "webinar",
  "other",
] as const;

export const eventInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name the event").max(200),
    eventType: z.enum(EVENT_TYPES).default("other"),
    startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    endsAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
      .optional(),
    location: z.string().trim().max(300).optional(),
    capacity: z.number().int().positive().max(1_000_000).optional(),
    goalAmountCents: z.number().int().positive().max(100_000_000_00).optional(),
    description: z.string().trim().max(2000).optional(),
  })
  .refine((value) => !value.endsAt || value.endsAt >= value.startsAt, {
    message: "The end date cannot be before the start date",
    path: ["endsAt"],
  });
export type EventInput = z.infer<typeof eventInputSchema>;

export const REGISTRATION_STATUSES = ["registered", "waitlisted", "cancelled"] as const;

export const registrationInputSchema = z.object({
  eventId: z.string().uuid(),
  constituentId: z.string().uuid("Select a constituent"),
  status: z.enum(REGISTRATION_STATUSES).default("registered"),
  guestCount: z.number().int().min(0).max(100).default(0),
  feeAmountCents: z.number().int().min(0).max(100_000_000_00).optional(),
  attended: z.boolean().default(false),
});
export type RegistrationInput = z.infer<typeof registrationInputSchema>;

export const volunteerOpportunityInputSchema = z.object({
  name: z.string().trim().min(1, "Name the opportunity").max(200),
  startsAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional(),
  location: z.string().trim().max(300).optional(),
  capacity: z.number().int().positive().max(1_000_000).optional(),
  description: z.string().trim().max(2000).optional(),
});
export type VolunteerOpportunityInput = z.infer<typeof volunteerOpportunityInputSchema>;

export const volunteerHoursInputSchema = z.object({
  constituentId: z.string().uuid("Select a volunteer"),
  opportunityId: z.string().uuid("Select an opportunity"),
  hours: z.number().positive("Hours must be greater than zero").max(9999.99),
  loggedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD format"),
});
export type VolunteerHoursInput = z.infer<typeof volunteerHoursInputSchema>;

export const membershipTierInputSchema = z.object({
  name: z.string().trim().min(1, "Name the tier").max(120),
  level: z.number().int().min(0).max(100).optional(),
  amountCents: z.number().int().min(0).max(100_000_000_00).optional(),
  benefits: z.string().trim().max(2000).optional(),
});
export type MembershipTierInput = z.infer<typeof membershipTierInputSchema>;

export const MEMBERSHIP_STATUSES = ["active", "lapsed", "pending", "cancelled"] as const;

export const membershipInputSchema = z.object({
  constituentId: z.string().uuid("Select a constituent"),
  tierId: z.string().uuid("Select a tier"),
  status: z.enum(MEMBERSHIP_STATUSES).default("active"),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional(),
  renewalDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional(),
});
export type MembershipInput = z.infer<typeof membershipInputSchema>;

export const QPI_DIMENSION_VALUES = [
  "capacity",
  "relationship",
  "timing",
  "gift_history",
  "philanthropy",
] as const;

// A human override of one QPI dimension: either set a 1-5 rating with rationale, or mark it an
// unknown gap (rating omitted). The score then recomputes from the stored assessments.
export const qpiOverrideInputSchema = z
  .object({
    prospectId: z.string().uuid(),
    dimension: z.enum(QPI_DIMENSION_VALUES),
    isUnknown: z.boolean().default(false),
    rating: z.number().int().min(1).max(5).optional(),
    rationale: z.string().trim().max(1000).optional(),
    source: z.string().trim().max(200).optional(),
  })
  .refine((v) => v.isUnknown || v.rating !== undefined, {
    message: "Set a rating (1-5) or mark the dimension unknown",
    path: ["rating"],
  });
export type QpiOverrideInput = z.infer<typeof qpiOverrideInputSchema>;

export const naturalPartnerInputSchema = z
  .object({
    prospectId: z.string().uuid(),
    userId: z.string().uuid().optional(),
    constituentId: z.string().uuid().optional(),
    externalName: z.string().trim().max(200).optional(),
    role: z.string().trim().max(120).optional(),
    warmPathNote: z.string().trim().max(1000).optional(),
  })
  .refine((v) => Boolean(v.userId || v.constituentId || v.externalName), {
    message: "Link a staff member, a constituent, or name an external partner",
    path: ["externalName"],
  });
export type NaturalPartnerInput = z.infer<typeof naturalPartnerInputSchema>;

export const rmAssignInputSchema = z.object({
  prospectId: z.string().uuid(),
  rmUserId: z.string().uuid().optional(),
});
export type RmAssignInput = z.infer<typeof rmAssignInputSchema>;

// QPI weights edit: each dimension's 1-5 rating is multiplied by its weight, so the points must sum
// to 100 — i.e. the five weights must sum to 20 (× the max rating of 5).
export const qpiWeightsInputSchema = z
  .object({
    capacity: z.number().int().min(1).max(20),
    relationship: z.number().int().min(1).max(20),
    timing: z.number().int().min(1).max(20),
    gift_history: z.number().int().min(1).max(20),
    philanthropy: z.number().int().min(1).max(20),
  })
  .refine(
    (w) => (w.capacity + w.relationship + w.timing + w.gift_history + w.philanthropy) * 5 === 100,
    { message: "The dimension points must sum to 100", path: ["capacity"] },
  );
export type QpiWeightsInput = z.infer<typeof qpiWeightsInputSchema>;

export const copilotTogglesInputSchema = z.object({
  researchPublicSources: z.boolean(),
  proposeQpiUpdatesAutomatically: z.boolean(),
  draft24hFollowups: z.boolean(),
});
export type CopilotTogglesInput = z.infer<typeof copilotTogglesInputSchema>;

export const KNOWLEDGE_BASE_FIELD_VALUES = [
  "capacitySource",
  "relationshipToCause",
  "connectorsNote",
  "giftHistorySummary",
  "otherPhilanthropy",
  "timingNote",
] as const;

export const knowledgeBaseFieldInputSchema = z.object({
  prospectId: z.string().uuid(),
  field: z.enum(KNOWLEDGE_BASE_FIELD_VALUES),
  value: z.string().trim().max(2000).optional(),
  source: z.string().trim().max(200).optional(),
});
export type KnowledgeBaseFieldInput = z.infer<typeof knowledgeBaseFieldInputSchema>;

export const researchGapInputSchema = z.object({
  prospectId: z.string().uuid(),
  label: z.string().trim().min(1, "Name the thing worth researching").max(200),
});
export type ResearchGapInput = z.infer<typeof researchGapInputSchema>;

export const researchGapResolveInputSchema = z.object({
  gapId: z.string().uuid(),
  status: z.enum(["open", "resolved"]),
});
export type ResearchGapResolveInput = z.infer<typeof researchGapResolveInputSchema>;

export const PROSPECT_STRATEGY_FIELD_VALUES = [
  "relationshipGoals",
  "hooks",
  "objections",
  "predispositionPlan",
  "presentationDesign",
  "actionPlan",
] as const;

export const prospectStrategyFieldInputSchema = z.object({
  prospectId: z.string().uuid(),
  field: z.enum(PROSPECT_STRATEGY_FIELD_VALUES),
  value: z.string().trim().max(2000).optional(),
});
export type ProspectStrategyFieldInput = z.infer<typeof prospectStrategyFieldInputSchema>;

// A pre-visit plan: the visit is created in a planned state (no occurredAt/outcome — execution
// lands in a later initiative). Only the goal is required to commit a plan; the rest is optional.
export const visitPlanInputSchema = z.object({
  prospectId: z.string().uuid(),
  goal: z.string().trim().min(1, "Set a goal for the visit").max(1000),
  discoveryQuestions: z.string().trim().max(2000).optional(),
  team: z.string().trim().max(300).optional(),
  locationType: z.string().trim().max(120).optional(),
  engagementToolNote: z.string().trim().max(1000).optional(),
});
export type VisitPlanInput = z.infer<typeof visitPlanInputSchema>;

export const relationshipMapEntryInputSchema = z.object({
  prospectId: z.string().uuid(),
  name: z.string().trim().min(1, "Name the decision-maker").max(200),
  role: z.string().trim().max(160).optional(),
  decisionPower: z.string().trim().max(160).optional(),
  warmPathNote: z.string().trim().max(1000).optional(),
  source: z.string().trim().max(200).optional(),
});
export type RelationshipMapEntryInput = z.infer<typeof relationshipMapEntryInputSchema>;

export const relationshipMapEntryRemoveInputSchema = z.object({
  entryId: z.string().uuid(),
});
export type RelationshipMapEntryRemoveInput = z.infer<typeof relationshipMapEntryRemoveInputSchema>;

export const FUNDING_FRAME_VALUES = ["today", "tomorrow", "forever"] as const;

export const fundingInitiativeInputSchema = z.object({
  name: z.string().trim().min(1, "Name the initiative").max(200),
  frame: z.enum(FUNDING_FRAME_VALUES),
  story: z.string().trim().max(4000).optional(),
  goalAmountCents: z.number().int().min(0).optional(),
  timelineStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional(),
  timelineEnd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional(),
});
export type FundingInitiativeInput = z.infer<typeof fundingInitiativeInputSchema>;

// The copilot's funding rationale writes back the initiative's story field (a "human moment" case
// for support). Field-level write-back mirrors the I7/I8 strategy/KB pattern.
export const fundingInitiativeRationaleInputSchema = z.object({
  fundingInitiativeId: z.string().uuid(),
  story: z.string().trim().min(1).max(4000),
});
export type FundingInitiativeRationaleInput = z.infer<typeof fundingInitiativeRationaleInputSchema>;

// The cultivation association is a soft pipeline link — never a frame column on the prospect.
export const cultivationAssociationInputSchema = z.object({
  fundingInitiativeId: z.string().uuid(),
  prospectId: z.string().uuid(),
});
export type CultivationAssociationInput = z.infer<typeof cultivationAssociationInputSchema>;

export const ASK_OUTCOME_VALUES = ["commitment", "decline", "roadmap"] as const;
export const VISIT_OUTCOME_VALUES = ["commitment", "decline", "roadmap"] as const;

// An ask logged in the debrief or standalone. The frame is NOT here — it is derived from the linked
// initiative on read. The dialogue continues until one of the three outcomes; each carries its own
// detail: a commitment needs an amount, a roadmap needs next steps.
export const askInputSchema = z
  .object({
    prospectId: z.string().uuid(),
    visitId: z.string().uuid().optional(),
    fundingInitiativeId: z.string().uuid(),
    amountMinCents: z.number().int().min(0).optional(),
    amountMaxCents: z.number().int().min(0).optional(),
    askType: z.string().trim().max(120).optional(),
    numbersOnTable: z.boolean().default(false),
    outcome: z.enum(ASK_OUTCOME_VALUES).optional(),
    commitmentAmountCents: z.number().int().min(0).optional(),
    commitmentSchedule: z.string().trim().max(500).optional(),
    roadmapNextSteps: z.string().trim().max(2000).optional(),
  })
  .refine(
    (v) =>
      v.amountMaxCents == null || v.amountMinCents == null || v.amountMaxCents >= v.amountMinCents,
    {
      message: "The ask range maximum must be at least the minimum",
      path: ["amountMaxCents"],
    },
  )
  .refine((v) => v.outcome !== "commitment" || v.commitmentAmountCents != null, {
    message: "A commitment needs a committed amount",
    path: ["commitmentAmountCents"],
  })
  .refine((v) => v.outcome !== "roadmap" || Boolean(v.roadmapNextSteps), {
    message: "A roadmap needs the next steps",
    path: ["roadmapNextSteps"],
  });
export type AskInput = z.infer<typeof askInputSchema>;

// Debriefing a planned visit: sets the outcome + memo + next step, which transitions the visit from
// planned to executed (occurred_at is stamped server-side) and triggers the 24-hour follow-up.
export const visitDebriefInputSchema = z.object({
  visitId: z.string().uuid(),
  prospectId: z.string().uuid(),
  outcome: z.enum(VISIT_OUTCOME_VALUES).optional(),
  callMemo: z.string().trim().max(4000).optional(),
  nextStep: z.string().trim().max(1000).optional(),
});
export type VisitDebriefInput = z.infer<typeof visitDebriefInputSchema>;

export const followUpDoneInputSchema = z.object({
  followUpTaskId: z.string().uuid(),
});
export type FollowUpDoneInput = z.infer<typeof followUpDoneInputSchema>;

export const draftRequestSchema = z.object({
  prospectId: z.string().uuid(),
});
export type DraftRequestInput = z.infer<typeof draftRequestSchema>;

// Saving a user-edited copilot call-memo draft onto its visit. The memo length mirrors the
// visit debrief memo cap; visitId is UUID-validated like every other execution write.
export const saveCallMemoInputSchema = z.object({
  visitId: z.string().uuid(),
  callMemo: z.string().trim().max(4000),
});
export type SaveCallMemoInput = z.infer<typeof saveCallMemoInputSchema>;

export const referralInputSchema = z.object({
  sourceProspectId: z.string().uuid(),
  sourceVisitId: z.string().uuid().optional(),
  referredName: z.string().trim().min(1, "Name the person referred").max(200),
  mayUseName: z.boolean().default(false),
  willSendNote: z.boolean().default(false),
  relationshipNote: z.string().trim().max(1000).optional(),
});
export type ReferralInput = z.infer<typeof referralInputSchema>;

// Promote a captured referral into a real constituent + prospect, linking promoted_prospect_id back
// to the referral. The warm path is already known (the referent), so it carries over.
export const promoteReferralInputSchema = z.object({
  referralId: z.string().uuid(),
  displayName: z.string().trim().min(1, "Name the new prospect").max(200),
  type: z.enum(CONSTITUENT_TYPES).default("individual"),
});
export type PromoteReferralInput = z.infer<typeof promoteReferralInputSchema>;

// Initiative 12 — connector-based discovery. A discovery task is keyed on connector × initiative;
// the connector is an existing constituent OR a lightweight external name (the known contact often
// isn't a prospect themselves), so exactly one of the two must be supplied.
export const findIntroductionsInputSchema = z
  .object({
    fundingInitiativeId: z.string().uuid(),
    connectorConstituentId: z.string().uuid().optional(),
    connectorExternalName: z.string().trim().max(200).optional(),
  })
  .refine((v) => Boolean(v.connectorConstituentId || v.connectorExternalName), {
    message: "Pick a connector constituent or name an external connector",
    path: ["connectorConstituentId"],
  });
export type FindIntroductionsInput = z.infer<typeof findIntroductionsInputSchema>;

// The non-promotion candidate decisions. Promotion is a separate, heavier mutation (it creates a
// constituent + prospect + Natural Partner), so it has its own schema below.
export const CANDIDATE_DECISIONS = ["endorsed", "intro_requested", "dismissed"] as const;
export const candidateDecisionInputSchema = z.object({
  candidateId: z.string().uuid(),
  decision: z.enum(CANDIDATE_DECISIONS),
});
export type CandidateDecisionInput = z.infer<typeof candidateDecisionInputSchema>;

export const promoteCandidateInputSchema = z.object({
  candidateId: z.string().uuid(),
});
export type PromoteCandidateInput = z.infer<typeof promoteCandidateInputSchema>;

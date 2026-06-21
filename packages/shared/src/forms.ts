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

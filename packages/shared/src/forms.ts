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

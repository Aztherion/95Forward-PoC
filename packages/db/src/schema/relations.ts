import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";
import { constituents, constituentTags, interactions, relationships, tags } from "./constituents";
import { appeals, campaigns, funds, gifts } from "./revenue";
import { opportunities, proposals } from "./pipeline";
import {
  eventRegistrations,
  events,
  marketingMessages,
  memberships,
  membershipTiers,
  segments,
  volunteerHours,
  volunteerOpportunities,
} from "./engagement";
import { fundingInitiatives, prospectFundingInitiatives } from "./funding";
import {
  knowledgeBase,
  naturalPartners,
  prospects,
  prospectStrategy,
  qpiAssessments,
  relationshipMapEntries,
  researchGaps,
} from "./prospects";
import { asks, followUpTasks, referrals, visits } from "./execution";
import { candidates, discoveryTasks } from "./discovery";
import { researchJobs } from "./jobs";
import { powerQuestions, tenantSettings } from "./config";
import { savedLists } from "./lists";
import { copilotProposals } from "./ai";

export const tenantsRelations = relations(tenants, ({ many, one }) => ({
  users: many(users),
  constituents: many(constituents),
  prospects: many(prospects),
  fundingInitiatives: many(fundingInitiatives),
  settings: one(tenantSettings),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  assignedConstituents: many(constituents),
  managedProspects: many(prospects),
}));

export const constituentsRelations = relations(constituents, ({ one, many }) => ({
  tenant: one(tenants, { fields: [constituents.tenantId], references: [tenants.id] }),
  assignedUser: one(users, {
    fields: [constituents.assignedUserId],
    references: [users.id],
  }),
  gifts: many(gifts),
  interactions: many(interactions),
  constituentTags: many(constituentTags),
  relationshipsFrom: many(relationships, { relationName: "relationship_from" }),
  relationshipsTo: many(relationships, { relationName: "relationship_to" }),
  prospect: one(prospects),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  tenant: one(tenants, { fields: [tags.tenantId], references: [tenants.id] }),
  constituentTags: many(constituentTags),
}));

export const constituentTagsRelations = relations(constituentTags, ({ one }) => ({
  tenant: one(tenants, { fields: [constituentTags.tenantId], references: [tenants.id] }),
  constituent: one(constituents, {
    fields: [constituentTags.constituentId],
    references: [constituents.id],
  }),
  tag: one(tags, { fields: [constituentTags.tagId], references: [tags.id] }),
}));

export const relationshipsRelations = relations(relationships, ({ one }) => ({
  tenant: one(tenants, { fields: [relationships.tenantId], references: [tenants.id] }),
  fromConstituent: one(constituents, {
    fields: [relationships.fromConstituentId],
    references: [constituents.id],
    relationName: "relationship_from",
  }),
  toConstituent: one(constituents, {
    fields: [relationships.toConstituentId],
    references: [constituents.id],
    relationName: "relationship_to",
  }),
}));

export const interactionsRelations = relations(interactions, ({ one }) => ({
  tenant: one(tenants, { fields: [interactions.tenantId], references: [tenants.id] }),
  constituent: one(constituents, {
    fields: [interactions.constituentId],
    references: [constituents.id],
  }),
  owner: one(users, { fields: [interactions.ownerUserId], references: [users.id] }),
}));

export const fundsRelations = relations(funds, ({ one, many }) => ({
  tenant: one(tenants, { fields: [funds.tenantId], references: [tenants.id] }),
  gifts: many(gifts),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  tenant: one(tenants, { fields: [campaigns.tenantId], references: [tenants.id] }),
  gifts: many(gifts),
}));

export const appealsRelations = relations(appeals, ({ one, many }) => ({
  tenant: one(tenants, { fields: [appeals.tenantId], references: [tenants.id] }),
  gifts: many(gifts),
}));

export const giftsRelations = relations(gifts, ({ one }) => ({
  tenant: one(tenants, { fields: [gifts.tenantId], references: [tenants.id] }),
  constituent: one(constituents, {
    fields: [gifts.constituentId],
    references: [constituents.id],
  }),
  fund: one(funds, { fields: [gifts.fundId], references: [funds.id] }),
  campaign: one(campaigns, { fields: [gifts.campaignId], references: [campaigns.id] }),
  appeal: one(appeals, { fields: [gifts.appealId], references: [appeals.id] }),
  event: one(events, { fields: [gifts.eventId], references: [events.id] }),
}));

export const opportunitiesRelations = relations(opportunities, ({ one }) => ({
  tenant: one(tenants, { fields: [opportunities.tenantId], references: [tenants.id] }),
  constituent: one(constituents, {
    fields: [opportunities.constituentId],
    references: [constituents.id],
  }),
  owner: one(users, { fields: [opportunities.ownerUserId], references: [users.id] }),
}));

export const proposalsRelations = relations(proposals, ({ one }) => ({
  tenant: one(tenants, { fields: [proposals.tenantId], references: [tenants.id] }),
  constituent: one(constituents, {
    fields: [proposals.constituentId],
    references: [constituents.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  tenant: one(tenants, { fields: [events.tenantId], references: [tenants.id] }),
  registrations: many(eventRegistrations),
  gifts: many(gifts),
}));

export const eventRegistrationsRelations = relations(eventRegistrations, ({ one }) => ({
  tenant: one(tenants, { fields: [eventRegistrations.tenantId], references: [tenants.id] }),
  event: one(events, { fields: [eventRegistrations.eventId], references: [events.id] }),
  constituent: one(constituents, {
    fields: [eventRegistrations.constituentId],
    references: [constituents.id],
  }),
}));

export const volunteerOpportunitiesRelations = relations(
  volunteerOpportunities,
  ({ one, many }) => ({
    tenant: one(tenants, { fields: [volunteerOpportunities.tenantId], references: [tenants.id] }),
    hours: many(volunteerHours),
  }),
);

export const volunteerHoursRelations = relations(volunteerHours, ({ one }) => ({
  tenant: one(tenants, { fields: [volunteerHours.tenantId], references: [tenants.id] }),
  constituent: one(constituents, {
    fields: [volunteerHours.constituentId],
    references: [constituents.id],
  }),
  opportunity: one(volunteerOpportunities, {
    fields: [volunteerHours.opportunityId],
    references: [volunteerOpportunities.id],
  }),
}));

export const membershipTiersRelations = relations(membershipTiers, ({ one, many }) => ({
  tenant: one(tenants, { fields: [membershipTiers.tenantId], references: [tenants.id] }),
  memberships: many(memberships),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  tenant: one(tenants, { fields: [memberships.tenantId], references: [tenants.id] }),
  constituent: one(constituents, {
    fields: [memberships.constituentId],
    references: [constituents.id],
  }),
  tier: one(membershipTiers, {
    fields: [memberships.tierId],
    references: [membershipTiers.id],
  }),
}));

export const segmentsRelations = relations(segments, ({ one, many }) => ({
  tenant: one(tenants, { fields: [segments.tenantId], references: [tenants.id] }),
  messages: many(marketingMessages),
}));

export const marketingMessagesRelations = relations(marketingMessages, ({ one }) => ({
  tenant: one(tenants, { fields: [marketingMessages.tenantId], references: [tenants.id] }),
  segment: one(segments, {
    fields: [marketingMessages.segmentId],
    references: [segments.id],
  }),
}));

export const fundingInitiativesRelations = relations(fundingInitiatives, ({ one, many }) => ({
  tenant: one(tenants, { fields: [fundingInitiatives.tenantId], references: [tenants.id] }),
  asks: many(asks),
  discoveryTasks: many(discoveryTasks),
  prospectAssociations: many(prospectFundingInitiatives),
}));

export const prospectFundingInitiativesRelations = relations(
  prospectFundingInitiatives,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [prospectFundingInitiatives.tenantId],
      references: [tenants.id],
    }),
    prospect: one(prospects, {
      fields: [prospectFundingInitiatives.prospectId],
      references: [prospects.id],
    }),
    fundingInitiative: one(fundingInitiatives, {
      fields: [prospectFundingInitiatives.fundingInitiativeId],
      references: [fundingInitiatives.id],
    }),
  }),
);

export const prospectsRelations = relations(prospects, ({ one, many }) => ({
  tenant: one(tenants, { fields: [prospects.tenantId], references: [tenants.id] }),
  constituent: one(constituents, {
    fields: [prospects.constituentId],
    references: [constituents.id],
  }),
  rm: one(users, { fields: [prospects.rmUserId], references: [users.id] }),
  qpiAssessments: many(qpiAssessments),
  naturalPartners: many(naturalPartners),
  knowledgeBase: one(knowledgeBase),
  researchGaps: many(researchGaps),
  relationshipMapEntries: many(relationshipMapEntries),
  strategy: one(prospectStrategy),
  visits: many(visits),
  asks: many(asks),
  fundingInitiativeAssociations: many(prospectFundingInitiatives),
}));

export const qpiAssessmentsRelations = relations(qpiAssessments, ({ one }) => ({
  tenant: one(tenants, { fields: [qpiAssessments.tenantId], references: [tenants.id] }),
  prospect: one(prospects, {
    fields: [qpiAssessments.prospectId],
    references: [prospects.id],
  }),
  updatedBy: one(users, {
    fields: [qpiAssessments.updatedByUserId],
    references: [users.id],
  }),
}));

export const naturalPartnersRelations = relations(naturalPartners, ({ one }) => ({
  tenant: one(tenants, { fields: [naturalPartners.tenantId], references: [tenants.id] }),
  prospect: one(prospects, {
    fields: [naturalPartners.prospectId],
    references: [prospects.id],
  }),
  user: one(users, { fields: [naturalPartners.userId], references: [users.id] }),
  constituent: one(constituents, {
    fields: [naturalPartners.constituentId],
    references: [constituents.id],
  }),
}));

export const knowledgeBaseRelations = relations(knowledgeBase, ({ one }) => ({
  tenant: one(tenants, { fields: [knowledgeBase.tenantId], references: [tenants.id] }),
  prospect: one(prospects, {
    fields: [knowledgeBase.prospectId],
    references: [prospects.id],
  }),
}));

export const researchGapsRelations = relations(researchGaps, ({ one }) => ({
  tenant: one(tenants, { fields: [researchGaps.tenantId], references: [tenants.id] }),
  prospect: one(prospects, {
    fields: [researchGaps.prospectId],
    references: [prospects.id],
  }),
}));

export const relationshipMapEntriesRelations = relations(relationshipMapEntries, ({ one }) => ({
  tenant: one(tenants, { fields: [relationshipMapEntries.tenantId], references: [tenants.id] }),
  prospect: one(prospects, {
    fields: [relationshipMapEntries.prospectId],
    references: [prospects.id],
  }),
}));

export const prospectStrategyRelations = relations(prospectStrategy, ({ one }) => ({
  tenant: one(tenants, { fields: [prospectStrategy.tenantId], references: [tenants.id] }),
  prospect: one(prospects, {
    fields: [prospectStrategy.prospectId],
    references: [prospects.id],
  }),
}));

export const visitsRelations = relations(visits, ({ one, many }) => ({
  tenant: one(tenants, { fields: [visits.tenantId], references: [tenants.id] }),
  prospect: one(prospects, { fields: [visits.prospectId], references: [prospects.id] }),
  priorityDiscussedInitiative: one(fundingInitiatives, {
    fields: [visits.priorityDiscussedInitiativeId],
    references: [fundingInitiatives.id],
  }),
  asks: many(asks),
  referrals: many(referrals),
}));

export const asksRelations = relations(asks, ({ one }) => ({
  tenant: one(tenants, { fields: [asks.tenantId], references: [tenants.id] }),
  prospect: one(prospects, { fields: [asks.prospectId], references: [prospects.id] }),
  visit: one(visits, { fields: [asks.visitId], references: [visits.id] }),
  fundingInitiative: one(fundingInitiatives, {
    fields: [asks.fundingInitiativeId],
    references: [fundingInitiatives.id],
  }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  tenant: one(tenants, { fields: [referrals.tenantId], references: [tenants.id] }),
  sourceVisit: one(visits, { fields: [referrals.sourceVisitId], references: [visits.id] }),
  sourceProspect: one(prospects, {
    fields: [referrals.sourceProspectId],
    references: [prospects.id],
    relationName: "referral_source_prospect",
  }),
  promotedProspect: one(prospects, {
    fields: [referrals.promotedProspectId],
    references: [prospects.id],
    relationName: "referral_promoted_prospect",
  }),
}));

export const followUpTasksRelations = relations(followUpTasks, ({ one }) => ({
  tenant: one(tenants, { fields: [followUpTasks.tenantId], references: [tenants.id] }),
  visit: one(visits, { fields: [followUpTasks.visitId], references: [visits.id] }),
  ask: one(asks, { fields: [followUpTasks.askId], references: [asks.id] }),
  owner: one(users, { fields: [followUpTasks.ownerUserId], references: [users.id] }),
}));

export const discoveryTasksRelations = relations(discoveryTasks, ({ one, many }) => ({
  tenant: one(tenants, { fields: [discoveryTasks.tenantId], references: [tenants.id] }),
  connectorConstituent: one(constituents, {
    fields: [discoveryTasks.connectorConstituentId],
    references: [constituents.id],
  }),
  fundingInitiative: one(fundingInitiatives, {
    fields: [discoveryTasks.fundingInitiativeId],
    references: [fundingInitiatives.id],
  }),
  requestedBy: one(users, {
    fields: [discoveryTasks.requestedByUserId],
    references: [users.id],
  }),
  candidates: many(candidates),
}));

export const candidatesRelations = relations(candidates, ({ one }) => ({
  tenant: one(tenants, { fields: [candidates.tenantId], references: [tenants.id] }),
  discoveryTask: one(discoveryTasks, {
    fields: [candidates.discoveryTaskId],
    references: [discoveryTasks.id],
  }),
  promotedProspect: one(prospects, {
    fields: [candidates.promotedProspectId],
    references: [prospects.id],
  }),
}));

export const tenantSettingsRelations = relations(tenantSettings, ({ one }) => ({
  tenant: one(tenants, { fields: [tenantSettings.tenantId], references: [tenants.id] }),
}));

export const powerQuestionsRelations = relations(powerQuestions, ({ one }) => ({
  tenant: one(tenants, { fields: [powerQuestions.tenantId], references: [tenants.id] }),
}));

export const savedListsRelations = relations(savedLists, ({ one }) => ({
  tenant: one(tenants, { fields: [savedLists.tenantId], references: [tenants.id] }),
  owner: one(users, { fields: [savedLists.ownerUserId], references: [users.id] }),
}));

export const copilotProposalsRelations = relations(copilotProposals, ({ one }) => ({
  tenant: one(tenants, { fields: [copilotProposals.tenantId], references: [tenants.id] }),
  createdBy: one(users, {
    fields: [copilotProposals.createdByUserId],
    references: [users.id],
    relationName: "copilot_proposal_created_by",
  }),
  decidedBy: one(users, {
    fields: [copilotProposals.decidedByUserId],
    references: [users.id],
    relationName: "copilot_proposal_decided_by",
  }),
}));

export const researchJobsRelations = relations(researchJobs, ({ one }) => ({
  tenant: one(tenants, { fields: [researchJobs.tenantId], references: [tenants.id] }),
  prospect: one(prospects, { fields: [researchJobs.prospectId], references: [prospects.id] }),
  researchGap: one(researchGaps, {
    fields: [researchJobs.researchGapId],
    references: [researchGaps.id],
  }),
  requestedBy: one(users, {
    fields: [researchJobs.requestedByUserId],
    references: [users.id],
  }),
}));

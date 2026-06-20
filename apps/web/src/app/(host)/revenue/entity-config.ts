import type { RevenueEntity } from "@/server/data/revenue-config";
import type { RevenueSection } from "./RevenueNav";

export interface EntityMeta {
  entity: RevenueEntity;
  section: RevenueSection;
  singular: string;
  plural: string;
  basePath: string;
}

export const ENTITY_META: Record<RevenueEntity, EntityMeta> = {
  fund: {
    entity: "fund",
    section: "funds",
    singular: "Fund",
    plural: "Funds",
    basePath: "/revenue/funds",
  },
  campaign: {
    entity: "campaign",
    section: "campaigns",
    singular: "Campaign",
    plural: "Campaigns",
    basePath: "/revenue/campaigns",
  },
  appeal: {
    entity: "appeal",
    section: "appeals",
    singular: "Appeal",
    plural: "Appeals",
    basePath: "/revenue/appeals",
  },
};

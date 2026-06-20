import "server-only";
import type { SavedListDefinition, SavedListInput } from "@95forward/shared";
import { definitionToConstituentParams } from "@/lib/list-params";
import { definitionToGiftParams } from "@/lib/gift-params";
import { definitionToInteractionParams } from "@/lib/interaction-params";
import { getConstituentsList } from "./constituents";
import { getGiftsList } from "./gifts";
import { getInteractionsList } from "./interactions";

export type RecordType = SavedListInput["recordType"];

export interface RunListResult {
  recordType: RecordType;
  total: number;
}

export async function countList(
  tenantId: string,
  recordType: RecordType,
  definition: SavedListDefinition,
): Promise<number> {
  switch (recordType) {
    case "gift": {
      const result = await getGiftsList(tenantId, definitionToGiftParams(definition));
      return result.total;
    }
    case "interaction": {
      const result = await getInteractionsList(tenantId, definitionToInteractionParams(definition));
      return result.total;
    }
    case "constituent":
    default: {
      const result = await getConstituentsList(tenantId, definitionToConstituentParams(definition));
      return result.total;
    }
  }
}

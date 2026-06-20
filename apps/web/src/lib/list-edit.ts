import type { SavedListDefinition } from "@95forward/shared";
import type { RecordType } from "./list-fields";

export function encodeBuilderHref(recordType: RecordType, definition: SavedListDefinition): string {
  const sp = new URLSearchParams();
  sp.set("type", recordType);
  sp.set("def", JSON.stringify(definition));
  return `/lists/new?${sp.toString()}`;
}

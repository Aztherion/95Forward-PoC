import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./columns";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ...timestamps,
});

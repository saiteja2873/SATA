import {
  pgTable,
  serial,
  varchar,
  integer,
  text,
  doublePrecision,
  timestamp,
} from "drizzle-orm/pg-core";

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),

  placeName: varchar("place_name", { length: 150 }).notNull(),

  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  
  name: varchar("name", { length: 100 }).notNull(),
  rating: integer("rating").notNull(),
  review: text("review").notNull(),
  
  blockchainHash: varchar("blockchain_hash", { length: 64 }).notNull(),
  previousHash: varchar("previous_hash", { length: 64 }),

  createdAt: timestamp("created_at").defaultNow(),
});

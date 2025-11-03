import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  hasCompletedOnboarding: boolean("has_completed_onboarding").default(false).notNull(),
  measurements: jsonb("measurements"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const capsules = pgTable("capsules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  capsuleCategory: text("capsule_category").notNull().default("Clothing"),
  season: text("season"),
  climate: text("climate"),
  useCase: text("use_case"),
  style: text("style"),
  capsuleType: text("capsule_type").notNull(),
  totalSlots: integer("total_slots").notNull().default(30),
  categorySlots: jsonb("category_slots").notNull().default(sql`'{"Tops": 6, "Bottoms": 4, "Dresses": 2, "Outerwear": 2, "Shoes": 2, "Accessories": 2, "Extras": 2}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const shoppingLists = pgTable("shopping_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const items = pgTable("items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  capsuleId: varchar("capsule_id").notNull().references(() => capsules.id, { onDelete: "cascade" }),
  shoppingListId: varchar("shopping_list_id").references(() => shoppingLists.id, { onDelete: "set null" }),
  category: text("category").notNull(),
  name: text("name").notNull(),
  color: text("color"),
  size: text("size"),
  material: text("material"),
  washInstructions: text("wash_instructions"),
  description: text("description"),
  imageUrl: text("image_url"),
  productLink: text("product_link"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const capsuleFabrics = pgTable("capsule_fabrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  capsuleId: varchar("capsule_id").notNull().references(() => capsules.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const capsuleColors = pgTable("capsule_colors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  capsuleId: varchar("capsule_id").notNull().references(() => capsules.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const outfitPairings = pgTable("outfit_pairings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  capsuleId: varchar("capsule_id").notNull().references(() => capsules.id, { onDelete: "cascade" }),
  name: text("name"),
  outfitData: jsonb("outfit_data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCapsuleSchema = createInsertSchema(capsules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShoppingListSchema = createInsertSchema(shoppingLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  createdAt: true,
});

export const updateUserSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  measurements: z.record(z.string(), z.object({
    value: z.string(),
    unit: z.string().optional(),
  })).optional(),
});

export const insertCapsuleFabricSchema = createInsertSchema(capsuleFabrics).omit({
  id: true,
  createdAt: true,
});

export const insertCapsuleColorSchema = createInsertSchema(capsuleColors).omit({
  id: true,
  createdAt: true,
});

export const insertOutfitPairingSchema = createInsertSchema(outfitPairings).omit({
  id: true,
  createdAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type InsertCapsule = z.infer<typeof insertCapsuleSchema>;
export type Capsule = typeof capsules.$inferSelect;
export type InsertShoppingList = z.infer<typeof insertShoppingListSchema>;
export type ShoppingList = typeof shoppingLists.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof items.$inferSelect;
export type InsertCapsuleFabric = z.infer<typeof insertCapsuleFabricSchema>;
export type CapsuleFabric = typeof capsuleFabrics.$inferSelect;
export type InsertCapsuleColor = z.infer<typeof insertCapsuleColorSchema>;
export type CapsuleColor = typeof capsuleColors.$inferSelect;
export type InsertOutfitPairing = z.infer<typeof insertOutfitPairingSchema>;
export type OutfitPairing = typeof outfitPairings.$inferSelect;

export const CAPSULE_CATEGORIES = ["Clothing", "Jewelry"] as const;
export type CapsuleCategory = typeof CAPSULE_CATEGORIES[number];

export const CLOTHING_CATEGORIES = ["Tops", "Bottoms", "Dresses", "Outerwear", "Shoes", "Accessories", "Extras"] as const;
export type ClothingCategory = typeof CLOTHING_CATEGORIES[number];

export const JEWELRY_CATEGORIES = ["Rings", "Necklaces", "Bracelets", "Earrings", "Watches", "Cuff & Tie Accessories", "Statement Pieces"] as const;
export type JewelryCategory = typeof JEWELRY_CATEGORIES[number];

export type ItemCategory = ClothingCategory | JewelryCategory;
export const ITEM_CATEGORIES = [...CLOTHING_CATEGORIES, ...JEWELRY_CATEGORIES] as const;

export type CategorySlots = Partial<Record<ItemCategory, number>>;

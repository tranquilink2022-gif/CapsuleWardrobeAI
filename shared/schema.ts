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

// Age range options
export const AGE_RANGES = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"] as const;
export type AgeRange = typeof AGE_RANGES[number];

// Style preference options
export const STYLE_PREFERENCES = ["Women's", "Men's", "Mix"] as const;
export type StylePreference = typeof STYLE_PREFERENCES[number];

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  hasCompletedOnboarding: boolean("has_completed_onboarding").default(false).notNull(),
  ageRange: varchar("age_range"),
  stylePreference: varchar("style_preference"),
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

export const sharedExports = pgTable("shared_exports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  exportType: text("export_type").notNull(),
  exportData: jsonb("export_data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

export const savedSharedItems = pgTable("saved_shared_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sharedExportId: varchar("shared_export_id").notNull().references(() => sharedExports.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(),
  itemData: jsonb("item_data").notNull(),
  sourceUserName: text("source_user_name"),
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
  firstName: z.string().trim().min(1, "First name is required").optional(),
  lastName: z.string().trim().min(1, "Last name is required").optional(),
  ageRange: z.string().optional(),
  stylePreference: z.string().optional(),
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

export const insertSharedExportSchema = createInsertSchema(sharedExports).omit({
  id: true,
  createdAt: true,
});

export const insertSavedSharedItemSchema = createInsertSchema(savedSharedItems).omit({
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
export type InsertSharedExport = z.infer<typeof insertSharedExportSchema>;
export type SharedExport = typeof sharedExports.$inferSelect;
export type InsertSavedSharedItem = z.infer<typeof insertSavedSharedItemSchema>;
export type SavedSharedItem = typeof savedSharedItems.$inferSelect;

// The Vault - Affiliate Products
export const VAULT_CATEGORIES = ["Tops", "Bottoms", "Dresses", "Outerwear", "Shoes", "Accessories", "Jewelry", "Bags"] as const;
export type VaultCategory = typeof VAULT_CATEGORIES[number];

export const affiliateProducts = pgTable("affiliate_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  brand: text("brand"),
  category: text("category").notNull(),
  description: text("description"),
  price: text("price"),
  imageUrl: text("image_url"),
  affiliateUrl: text("affiliate_url").notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  clickCount: integer("click_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAffiliateProductSchema = createInsertSchema(affiliateProducts).omit({
  id: true,
  clickCount: true,
  createdAt: true,
});

export type InsertAffiliateProduct = z.infer<typeof insertAffiliateProductSchema>;
export type AffiliateProduct = typeof affiliateProducts.$inferSelect;

export const CAPSULE_CATEGORIES = ["Clothing", "Jewelry"] as const;
export type CapsuleCategory = typeof CAPSULE_CATEGORIES[number];

export const CLOTHING_CATEGORIES = ["Tops", "Bottoms", "Dresses", "Outerwear", "Shoes", "Accessories", "Extras"] as const;
export type ClothingCategory = typeof CLOTHING_CATEGORIES[number];

export const JEWELRY_CATEGORIES = ["Rings", "Necklaces", "Bracelets", "Earrings", "Watches", "Cuff & Tie Accessories", "Statement Pieces"] as const;
export type JewelryCategory = typeof JEWELRY_CATEGORIES[number];

export type ItemCategory = ClothingCategory | JewelryCategory;
export const ITEM_CATEGORIES = [...CLOTHING_CATEGORIES, ...JEWELRY_CATEGORIES] as const;

export type CategorySlots = Partial<Record<ItemCategory, number>>;

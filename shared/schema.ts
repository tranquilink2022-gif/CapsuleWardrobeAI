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

// Age range options (including kids)
export const AGE_RANGES = ["0-2", "3-5", "6-12", "13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"] as const;
export type AgeRange = typeof AGE_RANGES[number];

// Style preference options
export const STYLE_PREFERENCES = ["Women's", "Men's", "Mix"] as const;
export type StylePreference = typeof STYLE_PREFERENCES[number];

// Undertone options for color recommendations
export const UNDERTONES = ["Warm", "Cool", "Neutral", "Unknown"] as const;
export type Undertone = typeof UNDERTONES[number];

// Subscription tiers
export const SUBSCRIPTION_TIERS = ["free", "premium", "family", "professional"] as const;
export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[number];

// Subscription tier limits and features
// -1 means unlimited
export const TIER_LIMITS: Record<SubscriptionTier, {
  maxWardrobes: number;
  maxClothingCapsulesPerWardrobe: number;
  maxJewelryCapsulesPerWardrobe: number;
  jewelryCapsules: boolean;
  sharing: boolean;
  fullAI: boolean;
  priorityAI: boolean;
  clientManagement: boolean;
  exports: boolean;
  ads: boolean;
}> = {
  free: {
    maxWardrobes: 1,
    maxClothingCapsulesPerWardrobe: 6,
    maxJewelryCapsulesPerWardrobe: 0,
    jewelryCapsules: false,
    sharing: false,
    fullAI: false,
    priorityAI: false,
    clientManagement: false,
    exports: false,
    ads: true,
  },
  premium: {
    maxWardrobes: 1,
    maxClothingCapsulesPerWardrobe: 12,
    maxJewelryCapsulesPerWardrobe: 4,
    jewelryCapsules: true,
    sharing: true,
    fullAI: true,
    priorityAI: false,
    clientManagement: false,
    exports: false,
    ads: false,
  },
  family: {
    maxWardrobes: 5,
    maxClothingCapsulesPerWardrobe: 12,
    maxJewelryCapsulesPerWardrobe: 4,
    jewelryCapsules: true,
    sharing: true,
    fullAI: true,
    priorityAI: false,
    clientManagement: false,
    exports: false,
    ads: false,
  },
  professional: {
    maxWardrobes: -1,
    maxClothingCapsulesPerWardrobe: -1,
    maxJewelryCapsulesPerWardrobe: -1,
    jewelryCapsules: true,
    sharing: true,
    fullAI: true,
    priorityAI: true,
    clientManagement: true,
    exports: true,
    ads: false,
  },
};

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  hasCompletedOnboarding: boolean("has_completed_onboarding").default(false).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  previewTier: varchar("preview_tier"),
  adminFamilyViewMode: varchar("admin_family_view_mode"),
  adminProfessionalViewMode: varchar("admin_professional_view_mode"),
  ageRange: varchar("age_range"),
  stylePreference: varchar("style_preference"),
  undertone: varchar("undertone"),
  measurements: jsonb("measurements"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionTier: varchar("subscription_tier").default("free").notNull(),
  subscriptionStatus: varchar("subscription_status"),
  trialEndsAt: timestamp("trial_ends_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Wardrobes - containers for capsules with their own preferences and measurements
export const wardrobes = pgTable("wardrobes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  professionalClientId: varchar("professional_client_id"),
  name: text("name").notNull(),
  ageRange: varchar("age_range"),
  stylePreference: varchar("style_preference"),
  undertone: varchar("undertone"),
  measurements: jsonb("measurements"),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const capsules = pgTable("capsules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  wardrobeId: varchar("wardrobe_id").references(() => wardrobes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  capsuleCategory: text("capsule_category").notNull().default("Clothing"),
  season: text("season"),
  climate: text("climate"),
  useCase: text("use_case"),
  style: text("style"),
  capsuleType: text("capsule_type").notNull(),
  totalSlots: integer("total_slots").notNull().default(30),
  categorySlots: jsonb("category_slots").notNull().default(sql`'{"Tops": 6, "Bottoms": 4, "Layering Pieces": 3, "Dresses": 2, "Outerwear": 2, "Shoes": 2, "Accessories": 2, "Extras": 2}'::jsonb`),
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

export const insertWardrobeSchema = createInsertSchema(wardrobes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
  undertone: z.string().optional(),
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
export type InsertWardrobe = z.infer<typeof insertWardrobeSchema>;
export type Wardrobe = typeof wardrobes.$inferSelect;
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
export const VAULT_CATEGORIES = ["Tops", "Bottoms", "Dresses", "Outerwear", "Shoes", "Accessories", "Jewelry", "Bags", "Headwear", "Layering", "Swim", "Intimates", "Travel", "Other"] as const;
export type VaultCategory = typeof VAULT_CATEGORIES[number];

export const VAULT_DEMOGRAPHICS = ["Women", "Girls", "Men", "Boys"] as const;
export type VaultDemographic = typeof VAULT_DEMOGRAPHICS[number];

export const affiliateProducts = pgTable("affiliate_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  brand: text("brand"),
  categories: text("categories").array().default([]).notNull(),
  demographics: text("demographics").array().default([]).notNull(),
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

export const CLOTHING_CATEGORIES = ["Tops", "Bottoms", "Layering Pieces", "Dresses", "Outerwear", "Shoes", "Accessories", "Extras"] as const;
export type ClothingCategory = typeof CLOTHING_CATEGORIES[number];

export const JEWELRY_CATEGORIES = ["Rings", "Necklaces", "Bracelets", "Earrings", "Watches", "Cuff & Tie Accessories", "Statement Pieces"] as const;
export type JewelryCategory = typeof JEWELRY_CATEGORIES[number];

export type ItemCategory = ClothingCategory | JewelryCategory;
export const ITEM_CATEGORIES = [...CLOTHING_CATEGORIES, ...JEWELRY_CATEGORIES] as const;

export type CategorySlots = Partial<Record<ItemCategory, number>>;

// Sponsor Analytics - Track impressions and clicks for ethical brand sponsors
export const sponsorAnalytics = pgTable("sponsor_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sponsorId: varchar("sponsor_id").notNull(),
  placement: varchar("placement").notNull(),
  eventType: varchar("event_type").notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSponsorAnalyticsSchema = createInsertSchema(sponsorAnalytics).omit({
  id: true,
  createdAt: true,
});

export type InsertSponsorAnalytics = z.infer<typeof insertSponsorAnalyticsSchema>;
export type SponsorAnalytics = typeof sponsorAnalytics.$inferSelect;

// Family Accounts - Groups family members under a shared subscription
export const FAMILY_ROLES = ["manager", "member"] as const;
export type FamilyRole = typeof FAMILY_ROLES[number];

export const familyAccounts = pgTable("family_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().default("My Family"),
  primaryManagerId: varchar("primary_manager_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  maxMembers: integer("max_members").default(5).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Family Memberships - Links users to family accounts with roles
export const familyMemberships = pgTable("family_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyAccountId: varchar("family_account_id").notNull().references(() => familyAccounts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// Family Invites - Pending invitations to join a family account
export const familyInvites = pgTable("family_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyAccountId: varchar("family_account_id").notNull().references(() => familyAccounts.id, { onDelete: "cascade" }),
  invitedByUserId: varchar("invited_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  email: varchar("email").notNull(),
  role: varchar("role").notNull().default("member"),
  wardrobeName: text("wardrobe_name"),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFamilyAccountSchema = createInsertSchema(familyAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFamilyMembershipSchema = createInsertSchema(familyMemberships).omit({
  id: true,
  joinedAt: true,
});

export const insertFamilyInviteSchema = createInsertSchema(familyInvites).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
});

export type InsertFamilyAccount = z.infer<typeof insertFamilyAccountSchema>;
export type FamilyAccount = typeof familyAccounts.$inferSelect;
export type InsertFamilyMembership = z.infer<typeof insertFamilyMembershipSchema>;
export type FamilyMembership = typeof familyMemberships.$inferSelect;
export type InsertFamilyInvite = z.infer<typeof insertFamilyInviteSchema>;
export type FamilyInvite = typeof familyInvites.$inferSelect;

// Professional Accounts - Professional shoppers and their clients
export const PROFESSIONAL_ROLES = ["shopper", "client"] as const;
export type ProfessionalRole = typeof PROFESSIONAL_ROLES[number];

export const INVOICE_STATUS = ["draft", "sent", "paid", "cancelled"] as const;
export type InvoiceStatus = typeof INVOICE_STATUS[number];

// Professional Accounts - Stores professional shopper business info
export const professionalAccounts = pgTable("professional_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessName: text("business_name").notNull(),
  shopperId: varchar("shopper_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  hourlyRate: integer("hourly_rate"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Professional Clients - Links clients to professional shoppers
export const professionalClients = pgTable("professional_clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  professionalAccountId: varchar("professional_account_id").notNull().references(() => professionalAccounts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  budget: integer("budget"),
  notes: text("notes"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// Professional Invites - Pending client invitations
export const professionalInvites = pgTable("professional_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  professionalAccountId: varchar("professional_account_id").notNull().references(() => professionalAccounts.id, { onDelete: "cascade" }),
  invitedByUserId: varchar("invited_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  email: varchar("email").notNull(),
  wardrobeName: text("wardrobe_name"),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Receipts - Merchandise receipts uploaded by professional shoppers
export const receipts = pgTable("receipts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  professionalAccountId: varchar("professional_account_id").notNull().references(() => professionalAccounts.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => professionalClients.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: integer("amount").notNull(),
  imageUrl: text("image_url"),
  purchaseDate: timestamp("purchase_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Invoices - Invoices sent to clients
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  professionalAccountId: varchar("professional_account_id").notNull().references(() => professionalAccounts.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => professionalClients.id, { onDelete: "cascade" }),
  invoiceNumber: varchar("invoice_number").notNull(),
  description: text("description"),
  hoursWorked: integer("hours_worked"),
  hourlyRate: integer("hourly_rate"),
  serviceAmount: integer("service_amount").default(0).notNull(),
  merchandiseAmount: integer("merchandise_amount").default(0).notNull(),
  totalAmount: integer("total_amount").notNull(),
  status: varchar("status").notNull().default("draft"),
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Invoice Receipts - Links receipts to invoices
export const invoiceReceipts = pgTable("invoice_receipts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  receiptId: varchar("receipt_id").notNull().references(() => receipts.id, { onDelete: "cascade" }),
});

export const insertProfessionalAccountSchema = createInsertSchema(professionalAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProfessionalClientSchema = createInsertSchema(professionalClients).omit({
  id: true,
  joinedAt: true,
});

export const insertProfessionalInviteSchema = createInsertSchema(professionalInvites).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
});

export const insertReceiptSchema = createInsertSchema(receipts).omit({
  id: true,
  createdAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProfessionalAccount = z.infer<typeof insertProfessionalAccountSchema>;
export type ProfessionalAccount = typeof professionalAccounts.$inferSelect;
export type InsertProfessionalClient = z.infer<typeof insertProfessionalClientSchema>;
export type ProfessionalClient = typeof professionalClients.$inferSelect;
export type InsertProfessionalInvite = z.infer<typeof insertProfessionalInviteSchema>;
export type ProfessionalInvite = typeof professionalInvites.$inferSelect;
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receipts.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// ============================================
// Retailer Tier - Vault Partners
// ============================================

export const RETAILER_STATUS = ["pending", "approved", "rejected", "suspended"] as const;
export type RetailerStatus = typeof RETAILER_STATUS[number];

export const ECOMMERCE_PLATFORMS = ["shopify", "woocommerce", "bigcommerce", "magento", "custom", "other"] as const;
export type EcommercePlatform = typeof ECOMMERCE_PLATFORMS[number];

// Retailer Accounts - Main retailer entity
export const retailers = pgTable("retailers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessName: text("business_name").notNull(),
  contactEmail: varchar("contact_email").notNull(),
  contactName: text("contact_name"),
  website: text("website"),
  description: text("description"),
  logoUrl: text("logo_url"),
  ecommercePlatform: varchar("ecommerce_platform"),
  shopifyStoreUrl: text("shopify_store_url"),
  shopifyAccessToken: text("shopify_access_token"),
  revenueSharePercent: integer("revenue_share_percent").default(10).notNull(),
  status: varchar("status").notNull().default("pending"),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  totalClicks: integer("total_clicks").default(0).notNull(),
  totalConversions: integer("total_conversions").default(0).notNull(),
  totalRevenue: integer("total_revenue").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Retailer Users - Users who can log in to manage a retailer account
export const retailerUsers = pgTable("retailer_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  retailerId: varchar("retailer_id").notNull().references(() => retailers.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role").notNull().default("admin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Retailer Applications - Applications from retailers seeking to join
export const retailerApplications = pgTable("retailer_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessName: text("business_name").notNull(),
  contactEmail: varchar("contact_email").notNull(),
  contactName: text("contact_name"),
  website: text("website"),
  description: text("description"),
  ecommercePlatform: varchar("ecommerce_platform"),
  expectedProductCount: integer("expected_product_count"),
  status: varchar("status").notNull().default("pending"),
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  retailerId: varchar("retailer_id").references(() => retailers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Retailer Invites - Admin invitations to retailers
export const retailerInvites = pgTable("retailer_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessName: text("business_name").notNull(),
  contactEmail: varchar("contact_email").notNull(),
  contactName: text("contact_name"),
  invitedBy: varchar("invited_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token").notNull().unique(),
  proposedRevenueShare: integer("proposed_revenue_share").default(10),
  message: text("message"),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  retailerId: varchar("retailer_id").references(() => retailers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Retailer Products - Products synced from retailer inventory (extends affiliateProducts)
export const retailerProducts = pgTable("retailer_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  retailerId: varchar("retailer_id").notNull().references(() => retailers.id, { onDelete: "cascade" }),
  affiliateProductId: varchar("affiliate_product_id").references(() => affiliateProducts.id, { onDelete: "cascade" }),
  externalId: varchar("external_id"),
  name: text("name").notNull(),
  brand: text("brand"),
  categories: text("categories").array().default([]).notNull(),
  demographics: text("demographics").array().default([]).notNull(),
  description: text("description"),
  price: integer("price"),
  compareAtPrice: integer("compare_at_price"),
  currency: varchar("currency").default("USD"),
  imageUrl: text("image_url"),
  additionalImages: text("additional_images").array().default([]),
  affiliateUrl: text("affiliate_url").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isSponsored: boolean("is_sponsored").default(false).notNull(),
  inventoryQuantity: integer("inventory_quantity"),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Retailer Metrics - Analytics for retailer performance
export const retailerMetrics = pgTable("retailer_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  retailerId: varchar("retailer_id").notNull().references(() => retailers.id, { onDelete: "cascade" }),
  productId: varchar("product_id").references(() => retailerProducts.id, { onDelete: "cascade" }),
  eventType: varchar("event_type").notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  sessionId: varchar("session_id"),
  placement: varchar("placement"),
  revenue: integer("revenue"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Retailer Ad Placements - Paid ad placements for free tier
export const retailerAds = pgTable("retailer_ads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  retailerId: varchar("retailer_id").notNull().references(() => retailers.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(),
  title: text("title"),
  description: text("description"),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  productId: varchar("product_id").references(() => retailerProducts.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").default(true).notNull(),
  impressions: integer("impressions").default(0).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertRetailerSchema = createInsertSchema(retailers).omit({
  id: true,
  totalClicks: true,
  totalConversions: true,
  totalRevenue: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRetailerUserSchema = createInsertSchema(retailerUsers).omit({
  id: true,
  createdAt: true,
});

export const insertRetailerApplicationSchema = createInsertSchema(retailerApplications).omit({
  id: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
  reviewNotes: true,
  retailerId: true,
  createdAt: true,
});

export const insertRetailerInviteSchema = createInsertSchema(retailerInvites).omit({
  id: true,
  acceptedAt: true,
  retailerId: true,
  createdAt: true,
});

export const insertRetailerProductSchema = createInsertSchema(retailerProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRetailerMetricSchema = createInsertSchema(retailerMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertRetailerAdSchema = createInsertSchema(retailerAds).omit({
  id: true,
  impressions: true,
  clicks: true,
  createdAt: true,
});

// Types
export type InsertRetailer = z.infer<typeof insertRetailerSchema>;
export type Retailer = typeof retailers.$inferSelect;
export type InsertRetailerUser = z.infer<typeof insertRetailerUserSchema>;
export type RetailerUser = typeof retailerUsers.$inferSelect;
export type InsertRetailerApplication = z.infer<typeof insertRetailerApplicationSchema>;
export type RetailerApplication = typeof retailerApplications.$inferSelect;
export type InsertRetailerInvite = z.infer<typeof insertRetailerInviteSchema>;
export type RetailerInvite = typeof retailerInvites.$inferSelect;
export type InsertRetailerProduct = z.infer<typeof insertRetailerProductSchema>;
export type RetailerProduct = typeof retailerProducts.$inferSelect;
export type InsertRetailerMetric = z.infer<typeof insertRetailerMetricSchema>;
export type RetailerMetric = typeof retailerMetrics.$inferSelect;
export type InsertRetailerAd = z.infer<typeof insertRetailerAdSchema>;
export type RetailerAd = typeof retailerAds.$inferSelect;

import { db } from "./db";
import { users, wardrobes, capsules, items, shoppingLists, capsuleFabrics, capsuleColors, outfitPairings, sharedExports, savedSharedItems, affiliateProducts, sponsorAnalytics, familyAccounts, familyMemberships, familyInvites, professionalAccounts, professionalClients, professionalInvites, receipts, invoices, invoiceReceipts, type User, type UpsertUser, type Wardrobe, type InsertWardrobe, type Capsule, type InsertCapsule, type Item, type InsertItem, type ShoppingList, type InsertShoppingList, type CapsuleFabric, type InsertCapsuleFabric, type CapsuleColor, type InsertCapsuleColor, type OutfitPairing, type InsertOutfitPairing, type SharedExport, type InsertSharedExport, type SavedSharedItem, type InsertSavedSharedItem, type AffiliateProduct, type InsertAffiliateProduct, type InsertSponsorAnalytics, type SponsorAnalytics, type FamilyAccount, type InsertFamilyAccount, type FamilyMembership, type InsertFamilyMembership, type FamilyInvite, type InsertFamilyInvite, type ProfessionalAccount, type InsertProfessionalAccount, type ProfessionalClient, type InsertProfessionalClient, type ProfessionalInvite, type InsertProfessionalInvite, type Receipt, type InsertReceipt, type Invoice, type InsertInvoice } from "@shared/schema";
import { eq, and, desc, isNotNull, sql, gte, count, lt, arrayContains } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  markOnboardingComplete(userId: string): Promise<void>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  updateUserSubscription(userId: string, data: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string | null;
    subscriptionTier?: string;
    subscriptionStatus?: string | null;
    trialEndsAt?: Date | null;
  }): Promise<User | undefined>;
  
  getWardrobe(id: string): Promise<Wardrobe | undefined>;
  getWardrobesByUserId(userId: string): Promise<Wardrobe[]>;
  getDefaultWardrobe(userId: string): Promise<Wardrobe | undefined>;
  createWardrobe(wardrobe: InsertWardrobe): Promise<Wardrobe>;
  updateWardrobe(id: string, data: Partial<InsertWardrobe>): Promise<Wardrobe | undefined>;
  deleteWardrobe(id: string): Promise<void>;
  
  getCapsule(id: string): Promise<Capsule | undefined>;
  getCapsulesByUserId(userId: string): Promise<Capsule[]>;
  getCapsulesByWardrobeId(wardrobeId: string): Promise<Capsule[]>;
  createCapsule(capsule: InsertCapsule): Promise<Capsule>;
  updateCapsule(id: string, data: Partial<InsertCapsule>): Promise<Capsule | undefined>;
  deleteCapsule(id: string): Promise<void>;
  
  getItem(id: string): Promise<Item | undefined>;
  getItemsByCapsuleId(capsuleId: string): Promise<Item[]>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: string, data: Partial<InsertItem>): Promise<Item | undefined>;
  deleteItem(id: string): Promise<void>;
  
  getShoppingList(id: string): Promise<ShoppingList | undefined>;
  getShoppingListsByUserId(userId: string): Promise<ShoppingList[]>;
  createShoppingList(shoppingList: InsertShoppingList): Promise<ShoppingList>;
  updateShoppingList(id: string, data: Partial<InsertShoppingList>): Promise<ShoppingList | undefined>;
  deleteShoppingList(id: string): Promise<void>;
  getItemsByShoppingListId(shoppingListId: string): Promise<Item[]>;
  
  getFabricsByCapsuleId(capsuleId: string): Promise<CapsuleFabric[]>;
  getFabric(id: string): Promise<CapsuleFabric | undefined>;
  createFabric(fabric: InsertCapsuleFabric): Promise<CapsuleFabric>;
  deleteFabric(id: string): Promise<void>;
  
  getColorsByCapsuleId(capsuleId: string): Promise<CapsuleColor[]>;
  getColor(id: string): Promise<CapsuleColor | undefined>;
  createColor(color: InsertCapsuleColor): Promise<CapsuleColor>;
  deleteColor(id: string): Promise<void>;
  
  getOutfitPairingsByCapsuleId(capsuleId: string): Promise<OutfitPairing[]>;
  getOutfitPairing(id: string): Promise<OutfitPairing | undefined>;
  createOutfitPairing(pairing: InsertOutfitPairing): Promise<OutfitPairing>;
  deleteOutfitPairing(id: string): Promise<void>;
  
  getSharedExport(id: string): Promise<SharedExport | undefined>;
  createSharedExport(sharedExport: InsertSharedExport): Promise<SharedExport>;
  deleteSharedExport(id: string): Promise<void>;
  
  getSavedSharedItemsByUserId(userId: string): Promise<SavedSharedItem[]>;
  getSavedSharedItem(userId: string, sharedExportId: string): Promise<SavedSharedItem | undefined>;
  createSavedSharedItem(savedItem: InsertSavedSharedItem): Promise<SavedSharedItem>;
  deleteSavedSharedItem(id: string): Promise<void>;
  
  getAffiliateProducts(category?: string, demographic?: string): Promise<AffiliateProduct[]>;
  getAllAffiliateProducts(): Promise<AffiliateProduct[]>;
  getAffiliateProduct(id: string): Promise<AffiliateProduct | undefined>;
  createAffiliateProduct(product: InsertAffiliateProduct): Promise<AffiliateProduct>;
  updateAffiliateProduct(id: string, data: Partial<InsertAffiliateProduct>): Promise<AffiliateProduct | undefined>;
  deleteAffiliateProduct(id: string): Promise<void>;
  incrementAffiliateProductClicks(id: string): Promise<void>;
  
  trackSponsorEvent(event: InsertSponsorAnalytics): Promise<SponsorAnalytics>;
  getSponsorAnalytics(startDate?: Date): Promise<{
    sponsorId: string;
    impressions: number;
    clicks: number;
  }[]>;
  
  getFamilyAccount(id: string): Promise<FamilyAccount | undefined>;
  getFamilyAccountByPrimaryManager(userId: string): Promise<FamilyAccount | undefined>;
  createFamilyAccount(account: InsertFamilyAccount): Promise<FamilyAccount>;
  updateFamilyAccount(id: string, data: Partial<InsertFamilyAccount>): Promise<FamilyAccount | undefined>;
  deleteFamilyAccount(id: string): Promise<void>;
  
  getFamilyMembership(id: string): Promise<FamilyMembership | undefined>;
  getFamilyMembershipByUserId(userId: string): Promise<FamilyMembership | undefined>;
  getFamilyMembershipsByAccountId(accountId: string): Promise<FamilyMembership[]>;
  createFamilyMembership(membership: InsertFamilyMembership): Promise<FamilyMembership>;
  updateFamilyMembership(id: string, data: Partial<InsertFamilyMembership>): Promise<FamilyMembership | undefined>;
  deleteFamilyMembership(id: string): Promise<void>;
  countManagersInFamily(accountId: string): Promise<number>;
  
  getFamilyInvite(id: string): Promise<FamilyInvite | undefined>;
  getFamilyInviteByToken(token: string): Promise<FamilyInvite | undefined>;
  getFamilyInvitesByAccountId(accountId: string): Promise<FamilyInvite[]>;
  getPendingFamilyInvitesByEmail(email: string): Promise<FamilyInvite[]>;
  createFamilyInvite(invite: InsertFamilyInvite): Promise<FamilyInvite>;
  updateFamilyInvite(id: string, data: Partial<FamilyInvite>): Promise<FamilyInvite | undefined>;
  deleteFamilyInvite(id: string): Promise<void>;
  
  getProfessionalAccount(id: string): Promise<ProfessionalAccount | undefined>;
  getProfessionalAccountByShopper(userId: string): Promise<ProfessionalAccount | undefined>;
  createProfessionalAccount(account: InsertProfessionalAccount): Promise<ProfessionalAccount>;
  updateProfessionalAccount(id: string, data: Partial<InsertProfessionalAccount>): Promise<ProfessionalAccount | undefined>;
  deleteProfessionalAccount(id: string): Promise<void>;
  
  getProfessionalClient(id: string): Promise<ProfessionalClient | undefined>;
  getProfessionalClientByUserId(userId: string): Promise<ProfessionalClient | undefined>;
  getProfessionalClientsByAccountId(accountId: string): Promise<ProfessionalClient[]>;
  createProfessionalClient(client: InsertProfessionalClient): Promise<ProfessionalClient>;
  updateProfessionalClient(id: string, data: Partial<InsertProfessionalClient>): Promise<ProfessionalClient | undefined>;
  deleteProfessionalClient(id: string): Promise<void>;
  
  getProfessionalInvite(id: string): Promise<ProfessionalInvite | undefined>;
  getProfessionalInviteByToken(token: string): Promise<ProfessionalInvite | undefined>;
  getProfessionalInvitesByAccountId(accountId: string): Promise<ProfessionalInvite[]>;
  getPendingProfessionalInvitesByEmail(email: string): Promise<ProfessionalInvite[]>;
  createProfessionalInvite(invite: InsertProfessionalInvite): Promise<ProfessionalInvite>;
  updateProfessionalInvite(id: string, data: Partial<ProfessionalInvite>): Promise<ProfessionalInvite | undefined>;
  deleteProfessionalInvite(id: string): Promise<void>;
  
  getReceipt(id: string): Promise<Receipt | undefined>;
  getReceiptsByClientId(clientId: string): Promise<Receipt[]>;
  getReceiptsByAccountId(accountId: string): Promise<Receipt[]>;
  createReceipt(receipt: InsertReceipt): Promise<Receipt>;
  updateReceipt(id: string, data: Partial<InsertReceipt>): Promise<Receipt | undefined>;
  deleteReceipt(id: string): Promise<void>;
  
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoicesByClientId(clientId: string): Promise<Invoice[]>;
  getInvoicesByAccountId(accountId: string): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, data: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<void>;
  getNextInvoiceNumber(accountId: string): Promise<string>;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async markOnboardingComplete(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ hasCompletedOnboarding: true, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId));
    return user;
  }

  async updateUserSubscription(userId: string, data: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string | null;
    subscriptionTier?: string;
    subscriptionStatus?: string | null;
    trialEndsAt?: Date | null;
  }): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async getWardrobe(id: string): Promise<Wardrobe | undefined> {
    const [wardrobe] = await db.select().from(wardrobes).where(eq(wardrobes.id, id));
    return wardrobe;
  }

  async getWardrobesByUserId(userId: string): Promise<Wardrobe[]> {
    return db.select().from(wardrobes).where(eq(wardrobes.userId, userId)).orderBy(desc(wardrobes.updatedAt));
  }

  async getDefaultWardrobe(userId: string): Promise<Wardrobe | undefined> {
    const [wardrobe] = await db.select().from(wardrobes).where(and(eq(wardrobes.userId, userId), eq(wardrobes.isDefault, true)));
    return wardrobe;
  }

  async createWardrobe(wardrobe: InsertWardrobe): Promise<Wardrobe> {
    const [newWardrobe] = await db.insert(wardrobes).values(wardrobe).returning();
    return newWardrobe;
  }

  async updateWardrobe(id: string, data: Partial<InsertWardrobe>): Promise<Wardrobe | undefined> {
    const existingWardrobe = await this.getWardrobe(id);
    if (!existingWardrobe) return undefined;

    let updateData = { ...data, updatedAt: new Date() };

    if (data.measurements && existingWardrobe.measurements) {
      const existingMeasurements = existingWardrobe.measurements as Record<string, { value: string; unit: string }>;
      const newMeasurements = data.measurements as Record<string, { value: string; unit: string }>;
      updateData.measurements = { ...existingMeasurements, ...newMeasurements };
    }

    const [updated] = await db
      .update(wardrobes)
      .set(updateData)
      .where(eq(wardrobes.id, id))
      .returning();
    return updated;
  }

  async deleteWardrobe(id: string): Promise<void> {
    await db.delete(wardrobes).where(eq(wardrobes.id, id));
  }

  async getCapsule(id: string): Promise<Capsule | undefined> {
    const [capsule] = await db.select().from(capsules).where(eq(capsules.id, id));
    return capsule;
  }

  async getCapsulesByUserId(userId: string): Promise<Capsule[]> {
    return db.select().from(capsules).where(eq(capsules.userId, userId)).orderBy(desc(capsules.updatedAt));
  }

  async getCapsulesByWardrobeId(wardrobeId: string): Promise<Capsule[]> {
    return db.select().from(capsules).where(eq(capsules.wardrobeId, wardrobeId)).orderBy(desc(capsules.updatedAt));
  }

  async createCapsule(capsule: InsertCapsule): Promise<Capsule> {
    const [newCapsule] = await db.insert(capsules).values(capsule).returning();
    return newCapsule;
  }

  async updateCapsule(id: string, data: Partial<InsertCapsule>): Promise<Capsule | undefined> {
    const [updated] = await db
      .update(capsules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(capsules.id, id))
      .returning();
    return updated;
  }

  async deleteCapsule(id: string): Promise<void> {
    await db.delete(capsules).where(eq(capsules.id, id));
  }

  async getItem(id: string): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item;
  }

  async getItemsByCapsuleId(capsuleId: string): Promise<Item[]> {
    return db.select().from(items).where(eq(items.capsuleId, capsuleId));
  }

  async createItem(item: InsertItem): Promise<Item> {
    const [newItem] = await db.insert(items).values(item).returning();
    return newItem;
  }

  async updateItem(id: string, data: Partial<InsertItem>): Promise<Item | undefined> {
    const [updated] = await db.update(items).set(data).where(eq(items.id, id)).returning();
    return updated;
  }

  async deleteItem(id: string): Promise<void> {
    await db.delete(items).where(eq(items.id, id));
  }

  async getShoppingList(id: string): Promise<ShoppingList | undefined> {
    const [shoppingList] = await db.select().from(shoppingLists).where(eq(shoppingLists.id, id));
    return shoppingList;
  }

  async getShoppingListsByUserId(userId: string): Promise<ShoppingList[]> {
    return db.select().from(shoppingLists).where(eq(shoppingLists.userId, userId)).orderBy(desc(shoppingLists.updatedAt));
  }

  async createShoppingList(shoppingList: InsertShoppingList): Promise<ShoppingList> {
    const [newList] = await db.insert(shoppingLists).values(shoppingList).returning();
    return newList;
  }

  async updateShoppingList(id: string, data: Partial<InsertShoppingList>): Promise<ShoppingList | undefined> {
    const [updated] = await db
      .update(shoppingLists)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(shoppingLists.id, id))
      .returning();
    return updated;
  }

  async deleteShoppingList(id: string): Promise<void> {
    await db.delete(shoppingLists).where(eq(shoppingLists.id, id));
  }

  async getItemsByShoppingListId(shoppingListId: string): Promise<Item[]> {
    return db.select().from(items).where(eq(items.shoppingListId, shoppingListId));
  }

  async getFabricsByCapsuleId(capsuleId: string): Promise<CapsuleFabric[]> {
    return db.select().from(capsuleFabrics).where(eq(capsuleFabrics.capsuleId, capsuleId));
  }

  async getFabric(id: string): Promise<CapsuleFabric | undefined> {
    const [fabric] = await db.select().from(capsuleFabrics).where(eq(capsuleFabrics.id, id));
    return fabric;
  }

  async createFabric(fabric: InsertCapsuleFabric): Promise<CapsuleFabric> {
    const [newFabric] = await db.insert(capsuleFabrics).values(fabric).returning();
    return newFabric;
  }

  async deleteFabric(id: string): Promise<void> {
    await db.delete(capsuleFabrics).where(eq(capsuleFabrics.id, id));
  }

  async getColorsByCapsuleId(capsuleId: string): Promise<CapsuleColor[]> {
    return db.select().from(capsuleColors).where(eq(capsuleColors.capsuleId, capsuleId));
  }

  async getColor(id: string): Promise<CapsuleColor | undefined> {
    const [color] = await db.select().from(capsuleColors).where(eq(capsuleColors.id, id));
    return color;
  }

  async createColor(color: InsertCapsuleColor): Promise<CapsuleColor> {
    const [newColor] = await db.insert(capsuleColors).values(color).returning();
    return newColor;
  }

  async deleteColor(id: string): Promise<void> {
    await db.delete(capsuleColors).where(eq(capsuleColors.id, id));
  }

  async getOutfitPairingsByCapsuleId(capsuleId: string): Promise<OutfitPairing[]> {
    return await db.select().from(outfitPairings).where(eq(outfitPairings.capsuleId, capsuleId)).orderBy(desc(outfitPairings.createdAt));
  }

  async getOutfitPairing(id: string): Promise<OutfitPairing | undefined> {
    const [pairing] = await db.select().from(outfitPairings).where(eq(outfitPairings.id, id));
    return pairing;
  }

  async createOutfitPairing(pairing: InsertOutfitPairing): Promise<OutfitPairing> {
    const [newPairing] = await db.insert(outfitPairings).values(pairing).returning();
    return newPairing;
  }

  async deleteOutfitPairing(id: string): Promise<void> {
    await db.delete(outfitPairings).where(eq(outfitPairings.id, id));
  }

  async getSharedExport(id: string): Promise<SharedExport | undefined> {
    const [sharedExport] = await db.select().from(sharedExports).where(eq(sharedExports.id, id));
    return sharedExport;
  }

  async createSharedExport(sharedExport: InsertSharedExport): Promise<SharedExport> {
    const [newSharedExport] = await db.insert(sharedExports).values(sharedExport).returning();
    return newSharedExport;
  }

  async deleteSharedExport(id: string): Promise<void> {
    await db.delete(sharedExports).where(eq(sharedExports.id, id));
  }

  async getSavedSharedItemsByUserId(userId: string): Promise<SavedSharedItem[]> {
    return await db.select().from(savedSharedItems).where(eq(savedSharedItems.userId, userId)).orderBy(desc(savedSharedItems.createdAt));
  }

  async getSavedSharedItem(userId: string, sharedExportId: string): Promise<SavedSharedItem | undefined> {
    const [savedItem] = await db.select().from(savedSharedItems).where(and(eq(savedSharedItems.userId, userId), eq(savedSharedItems.sharedExportId, sharedExportId)));
    return savedItem;
  }

  async createSavedSharedItem(savedItem: InsertSavedSharedItem): Promise<SavedSharedItem> {
    const [newSavedItem] = await db.insert(savedSharedItems).values(savedItem).returning();
    return newSavedItem;
  }

  async deleteSavedSharedItem(id: string): Promise<void> {
    await db.delete(savedSharedItems).where(eq(savedSharedItems.id, id));
  }

  async getAffiliateProducts(category?: string, demographic?: string): Promise<AffiliateProduct[]> {
    const conditions = [eq(affiliateProducts.isActive, true)];
    if (category) {
      conditions.push(arrayContains(affiliateProducts.categories, [category]));
    }
    if (demographic) {
      conditions.push(arrayContains(affiliateProducts.demographics, [demographic]));
    }
    return db.select().from(affiliateProducts)
      .where(and(...conditions))
      .orderBy(desc(affiliateProducts.isFeatured), desc(affiliateProducts.createdAt));
  }

  async getAffiliateProduct(id: string): Promise<AffiliateProduct | undefined> {
    const [product] = await db.select().from(affiliateProducts).where(eq(affiliateProducts.id, id));
    return product;
  }

  async createAffiliateProduct(product: InsertAffiliateProduct): Promise<AffiliateProduct> {
    const [newProduct] = await db.insert(affiliateProducts).values(product).returning();
    return newProduct;
  }

  async getAllAffiliateProducts(): Promise<AffiliateProduct[]> {
    return db.select().from(affiliateProducts)
      .orderBy(desc(affiliateProducts.createdAt));
  }

  async updateAffiliateProduct(id: string, data: Partial<InsertAffiliateProduct>): Promise<AffiliateProduct | undefined> {
    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );
    if (Object.keys(filteredData).length === 0) {
      return this.getAffiliateProduct(id);
    }
    const [updated] = await db.update(affiliateProducts).set(filteredData).where(eq(affiliateProducts.id, id)).returning();
    return updated;
  }

  async deleteAffiliateProduct(id: string): Promise<void> {
    await db.delete(affiliateProducts).where(eq(affiliateProducts.id, id));
  }

  async incrementAffiliateProductClicks(id: string): Promise<void> {
    await db.update(affiliateProducts)
      .set({ clickCount: sql`${affiliateProducts.clickCount} + 1` })
      .where(eq(affiliateProducts.id, id));
  }

  async trackSponsorEvent(event: InsertSponsorAnalytics): Promise<SponsorAnalytics> {
    const [newEvent] = await db.insert(sponsorAnalytics).values(event).returning();
    return newEvent;
  }

  async getSponsorAnalytics(startDate?: Date): Promise<{
    sponsorId: string;
    impressions: number;
    clicks: number;
  }[]> {
    const thirtyDaysAgo = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const results = await db
      .select({
        sponsorId: sponsorAnalytics.sponsorId,
        eventType: sponsorAnalytics.eventType,
        count: count(),
      })
      .from(sponsorAnalytics)
      .where(gte(sponsorAnalytics.createdAt, thirtyDaysAgo))
      .groupBy(sponsorAnalytics.sponsorId, sponsorAnalytics.eventType);
    
    const analytics: Record<string, { impressions: number; clicks: number }> = {};
    
    for (const row of results) {
      if (!analytics[row.sponsorId]) {
        analytics[row.sponsorId] = { impressions: 0, clicks: 0 };
      }
      if (row.eventType === 'impression') {
        analytics[row.sponsorId].impressions = Number(row.count);
      } else if (row.eventType === 'click') {
        analytics[row.sponsorId].clicks = Number(row.count);
      }
    }
    
    return Object.entries(analytics).map(([sponsorId, data]) => ({
      sponsorId,
      ...data,
    }));
  }

  async getFamilyAccount(id: string): Promise<FamilyAccount | undefined> {
    const [account] = await db.select().from(familyAccounts).where(eq(familyAccounts.id, id));
    return account;
  }

  async getFamilyAccountByPrimaryManager(userId: string): Promise<FamilyAccount | undefined> {
    const [account] = await db.select().from(familyAccounts).where(eq(familyAccounts.primaryManagerId, userId));
    return account;
  }

  async createFamilyAccount(account: InsertFamilyAccount): Promise<FamilyAccount> {
    const [newAccount] = await db.insert(familyAccounts).values(account).returning();
    return newAccount;
  }

  async updateFamilyAccount(id: string, data: Partial<InsertFamilyAccount>): Promise<FamilyAccount | undefined> {
    const [updated] = await db
      .update(familyAccounts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(familyAccounts.id, id))
      .returning();
    return updated;
  }

  async deleteFamilyAccount(id: string): Promise<void> {
    await db.delete(familyAccounts).where(eq(familyAccounts.id, id));
  }

  async getFamilyMembership(id: string): Promise<FamilyMembership | undefined> {
    const [membership] = await db.select().from(familyMemberships).where(eq(familyMemberships.id, id));
    return membership;
  }

  async getFamilyMembershipByUserId(userId: string): Promise<FamilyMembership | undefined> {
    const [membership] = await db.select().from(familyMemberships).where(eq(familyMemberships.userId, userId));
    return membership;
  }

  async getFamilyMembershipsByAccountId(accountId: string): Promise<FamilyMembership[]> {
    return db.select().from(familyMemberships).where(eq(familyMemberships.familyAccountId, accountId));
  }

  async createFamilyMembership(membership: InsertFamilyMembership): Promise<FamilyMembership> {
    const [newMembership] = await db.insert(familyMemberships).values(membership).returning();
    return newMembership;
  }

  async updateFamilyMembership(id: string, data: Partial<InsertFamilyMembership>): Promise<FamilyMembership | undefined> {
    const [updated] = await db
      .update(familyMemberships)
      .set(data)
      .where(eq(familyMemberships.id, id))
      .returning();
    return updated;
  }

  async deleteFamilyMembership(id: string): Promise<void> {
    await db.delete(familyMemberships).where(eq(familyMemberships.id, id));
  }

  async countManagersInFamily(accountId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(familyMemberships)
      .where(and(
        eq(familyMemberships.familyAccountId, accountId),
        eq(familyMemberships.role, 'manager')
      ));
    return Number(result?.count || 0);
  }

  async getFamilyInvite(id: string): Promise<FamilyInvite | undefined> {
    const [invite] = await db.select().from(familyInvites).where(eq(familyInvites.id, id));
    return invite;
  }

  async getFamilyInviteByToken(token: string): Promise<FamilyInvite | undefined> {
    const [invite] = await db.select().from(familyInvites).where(eq(familyInvites.token, token));
    return invite;
  }

  async getFamilyInvitesByAccountId(accountId: string): Promise<FamilyInvite[]> {
    return db.select().from(familyInvites).where(eq(familyInvites.familyAccountId, accountId));
  }

  async getPendingFamilyInvitesByEmail(email: string): Promise<FamilyInvite[]> {
    const now = new Date();
    return db.select().from(familyInvites).where(
      and(
        eq(familyInvites.email, email),
        sql`${familyInvites.acceptedAt} IS NULL`,
        gte(familyInvites.expiresAt, now)
      )
    );
  }

  async createFamilyInvite(invite: InsertFamilyInvite): Promise<FamilyInvite> {
    const [newInvite] = await db.insert(familyInvites).values(invite).returning();
    return newInvite;
  }

  async updateFamilyInvite(id: string, data: Partial<FamilyInvite>): Promise<FamilyInvite | undefined> {
    const [updated] = await db
      .update(familyInvites)
      .set(data)
      .where(eq(familyInvites.id, id))
      .returning();
    return updated;
  }

  async deleteFamilyInvite(id: string): Promise<void> {
    await db.delete(familyInvites).where(eq(familyInvites.id, id));
  }

  async getProfessionalAccount(id: string): Promise<ProfessionalAccount | undefined> {
    const [account] = await db.select().from(professionalAccounts).where(eq(professionalAccounts.id, id));
    return account;
  }

  async getProfessionalAccountByShopper(userId: string): Promise<ProfessionalAccount | undefined> {
    const [account] = await db.select().from(professionalAccounts).where(eq(professionalAccounts.shopperId, userId));
    return account;
  }

  async createProfessionalAccount(account: InsertProfessionalAccount): Promise<ProfessionalAccount> {
    const [newAccount] = await db.insert(professionalAccounts).values(account).returning();
    return newAccount;
  }

  async updateProfessionalAccount(id: string, data: Partial<InsertProfessionalAccount>): Promise<ProfessionalAccount | undefined> {
    const [updated] = await db
      .update(professionalAccounts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(professionalAccounts.id, id))
      .returning();
    return updated;
  }

  async deleteProfessionalAccount(id: string): Promise<void> {
    await db.delete(professionalAccounts).where(eq(professionalAccounts.id, id));
  }

  async getProfessionalClient(id: string): Promise<ProfessionalClient | undefined> {
    const [client] = await db.select().from(professionalClients).where(eq(professionalClients.id, id));
    return client;
  }

  async getProfessionalClientByUserId(userId: string): Promise<ProfessionalClient | undefined> {
    const [client] = await db.select().from(professionalClients).where(eq(professionalClients.userId, userId));
    return client;
  }

  async getProfessionalClientsByAccountId(accountId: string): Promise<ProfessionalClient[]> {
    return db.select().from(professionalClients).where(eq(professionalClients.professionalAccountId, accountId));
  }

  async createProfessionalClient(client: InsertProfessionalClient): Promise<ProfessionalClient> {
    const [newClient] = await db.insert(professionalClients).values(client).returning();
    return newClient;
  }

  async updateProfessionalClient(id: string, data: Partial<InsertProfessionalClient>): Promise<ProfessionalClient | undefined> {
    const [updated] = await db
      .update(professionalClients)
      .set(data)
      .where(eq(professionalClients.id, id))
      .returning();
    return updated;
  }

  async deleteProfessionalClient(id: string): Promise<void> {
    await db.delete(professionalClients).where(eq(professionalClients.id, id));
  }

  async getProfessionalInvite(id: string): Promise<ProfessionalInvite | undefined> {
    const [invite] = await db.select().from(professionalInvites).where(eq(professionalInvites.id, id));
    return invite;
  }

  async getProfessionalInviteByToken(token: string): Promise<ProfessionalInvite | undefined> {
    const [invite] = await db.select().from(professionalInvites).where(eq(professionalInvites.token, token));
    return invite;
  }

  async getProfessionalInvitesByAccountId(accountId: string): Promise<ProfessionalInvite[]> {
    return db.select().from(professionalInvites).where(eq(professionalInvites.professionalAccountId, accountId));
  }

  async getPendingProfessionalInvitesByEmail(email: string): Promise<ProfessionalInvite[]> {
    const now = new Date();
    return db.select().from(professionalInvites).where(
      and(
        eq(professionalInvites.email, email),
        sql`${professionalInvites.acceptedAt} IS NULL`,
        gte(professionalInvites.expiresAt, now)
      )
    );
  }

  async createProfessionalInvite(invite: InsertProfessionalInvite): Promise<ProfessionalInvite> {
    const [newInvite] = await db.insert(professionalInvites).values(invite).returning();
    return newInvite;
  }

  async updateProfessionalInvite(id: string, data: Partial<ProfessionalInvite>): Promise<ProfessionalInvite | undefined> {
    const [updated] = await db
      .update(professionalInvites)
      .set(data)
      .where(eq(professionalInvites.id, id))
      .returning();
    return updated;
  }

  async deleteProfessionalInvite(id: string): Promise<void> {
    await db.delete(professionalInvites).where(eq(professionalInvites.id, id));
  }

  async getReceipt(id: string): Promise<Receipt | undefined> {
    const [receipt] = await db.select().from(receipts).where(eq(receipts.id, id));
    return receipt;
  }

  async getReceiptsByClientId(clientId: string): Promise<Receipt[]> {
    return db.select().from(receipts).where(eq(receipts.clientId, clientId)).orderBy(desc(receipts.purchaseDate));
  }

  async getReceiptsByAccountId(accountId: string): Promise<Receipt[]> {
    return db.select().from(receipts).where(eq(receipts.professionalAccountId, accountId)).orderBy(desc(receipts.purchaseDate));
  }

  async createReceipt(receipt: InsertReceipt): Promise<Receipt> {
    const [newReceipt] = await db.insert(receipts).values(receipt).returning();
    return newReceipt;
  }

  async updateReceipt(id: string, data: Partial<InsertReceipt>): Promise<Receipt | undefined> {
    const [updated] = await db
      .update(receipts)
      .set(data)
      .where(eq(receipts.id, id))
      .returning();
    return updated;
  }

  async deleteReceipt(id: string): Promise<void> {
    await db.delete(receipts).where(eq(receipts.id, id));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async getInvoicesByClientId(clientId: string): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.clientId, clientId)).orderBy(desc(invoices.createdAt));
  }

  async getInvoicesByAccountId(accountId: string): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.professionalAccountId, accountId)).orderBy(desc(invoices.createdAt));
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async updateInvoice(id: string, data: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [updated] = await db
      .update(invoices)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return updated;
  }

  async deleteInvoice(id: string): Promise<void> {
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  async getNextInvoiceNumber(accountId: string): Promise<string> {
    const result = await db
      .select({ count: count() })
      .from(invoices)
      .where(eq(invoices.professionalAccountId, accountId));
    const num = (result[0]?.count || 0) + 1;
    return `INV-${String(num).padStart(4, '0')}`;
  }
}

export const storage = new DbStorage();

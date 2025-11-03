import { db } from "./db";
import { users, capsules, items, shoppingLists, capsuleFabrics, capsuleColors, outfitPairings, sharedExports, savedSharedItems, type User, type UpsertUser, type Capsule, type InsertCapsule, type Item, type InsertItem, type ShoppingList, type InsertShoppingList, type CapsuleFabric, type InsertCapsuleFabric, type CapsuleColor, type InsertCapsuleColor, type OutfitPairing, type InsertOutfitPairing, type SharedExport, type InsertSharedExport, type SavedSharedItem, type InsertSavedSharedItem } from "@shared/schema";
import { eq, and, desc, isNotNull } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  markOnboardingComplete(userId: string): Promise<void>;
  
  getCapsule(id: string): Promise<Capsule | undefined>;
  getCapsulesByUserId(userId: string): Promise<Capsule[]>;
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

  async getCapsule(id: string): Promise<Capsule | undefined> {
    const [capsule] = await db.select().from(capsules).where(eq(capsules.id, id));
    return capsule;
  }

  async getCapsulesByUserId(userId: string): Promise<Capsule[]> {
    return db.select().from(capsules).where(eq(capsules.userId, userId)).orderBy(desc(capsules.updatedAt));
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
}

export const storage = new DbStorage();

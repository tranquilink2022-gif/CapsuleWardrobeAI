import { db } from "./db";
import { users, capsules, items, type User, type UpsertUser, type Capsule, type InsertCapsule, type Item, type InsertItem } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
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
  
  getShoppingListItems(userId: string): Promise<Item[]>;
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

  async getShoppingListItems(userId: string): Promise<Item[]> {
    const results = await db
      .select()
      .from(items)
      .innerJoin(capsules, eq(items.capsuleId, capsules.id))
      .where(and(eq(capsules.userId, userId), eq(items.isOnShoppingList, true)));
    
    return results.map((r: any) => r.items);
  }
}

export const storage = new DbStorage();

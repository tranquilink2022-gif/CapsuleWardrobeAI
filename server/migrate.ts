import { db } from "./db";
import { items, capsules, capsuleItems } from "@shared/schema";
import { eq, isNull, isNotNull, sql } from "drizzle-orm";

export async function migrateItemsToWardrobes(): Promise<void> {
  console.log("[Migration] Starting item-to-wardrobe migration...");

  const unmigrated = await db
    .select({ id: items.id, capsuleId: items.capsuleId })
    .from(items)
    .where(isNull(items.wardrobeId));

  if (unmigrated.length === 0) {
    console.log("[Migration] No items need migration.");
    return;
  }

  console.log(`[Migration] Found ${unmigrated.length} items without wardrobeId.`);

  let migratedCount = 0;
  let joinRecordsCreated = 0;

  for (const item of unmigrated) {
    if (!item.capsuleId) continue;

    const [capsule] = await db
      .select({ wardrobeId: capsules.wardrobeId })
      .from(capsules)
      .where(eq(capsules.id, item.capsuleId));

    if (!capsule?.wardrobeId) {
      console.warn(`[Migration] Capsule ${item.capsuleId} not found or has no wardrobeId, skipping item ${item.id}`);
      continue;
    }

    await db
      .update(items)
      .set({ wardrobeId: capsule.wardrobeId })
      .where(eq(items.id, item.id));
    migratedCount++;

    const existing = await db
      .select({ id: capsuleItems.id })
      .from(capsuleItems)
      .where(
        sql`${capsuleItems.capsuleId} = ${item.capsuleId} AND ${capsuleItems.itemId} = ${item.id}`
      );

    if (existing.length === 0) {
      await db.insert(capsuleItems).values({
        capsuleId: item.capsuleId,
        itemId: item.id,
      });
      joinRecordsCreated++;
    }
  }

  console.log(`[Migration] Migrated ${migratedCount} items, created ${joinRecordsCreated} join records.`);
}

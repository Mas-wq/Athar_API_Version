import { db } from "../index.js";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  claimsTable,
  conversationsTable,
  foundItemsTable,
  handoverRequestsTable,
} from "../models/index.js";
import { enqueueAiJob } from "../../services/aiJobService.js";

const toObject = (value) => {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch { return null; }
  }
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
};

const publicItem = (item) => ({
  id: item.id,
  item_type: item.item_type,
  date_found: item.date_found,
  location_found: item.location_found,
  public_details: item.public_details,
  image_urls: item.image_urls,
  status: item.status,
  created_at: item.created_at,
  updated_at: item.updated_at,
});

export const getMyFoundItems = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const items = await db.select().from(foundItemsTable)
      .where(eq(foundItemsTable.finder_id, userId))
      .orderBy(desc(foundItemsTable.created_at));
    return res.status(200).json({ foundItems: items.map(publicItem) });
  } catch (error) {
    console.error("Could not load user's found items:", error);
    return res.status(500).json({ message: "Could not load your found items" });
  }
};

export const deleteMyFoundItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    const itemId = req.params.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!itemId || typeof itemId !== "string") {
      return res.status(400).json({ message: "Invalid found item ID" });
    }

    await db.transaction(async (tx) => {
      const [item] = await tx.select().from(foundItemsTable)
        .where(and(eq(foundItemsTable.id, itemId), eq(foundItemsTable.finder_id, userId)))
        .for("update");
      if (!item) {
        const error = new Error("Found item not found or you do not own it");
        error.statusCode = 404;
        throw error;
      }
      if (item.status !== "FOUND") {
        const error = new Error("You can delete a found item only before a claim is approved or delivery is completed");
        error.statusCode = 409;
        throw error;
      }

      const [activeClaim] = await tx.select({ id: claimsTable.id }).from(claimsTable)
        .where(and(
          eq(claimsTable.found_item_id, itemId),
          inArray(claimsTable.status, ["PENDING", "APPROVED"]),
        )).limit(1);
      const [activeConversation] = await tx.select({ id: conversationsTable.id }).from(conversationsTable)
        .where(and(
          eq(conversationsTable.found_item_id, itemId),
          inArray(conversationsTable.status, ["PENDING_FINDER", "PENDING_OWNER", "ACCEPTED"]),
        )).limit(1);
      const [activeHandover] = await tx.select({ id: handoverRequestsTable.id })
        .from(handoverRequestsTable)
        .innerJoin(conversationsTable, eq(handoverRequestsTable.conversation_id, conversationsTable.id))
        .where(and(
          eq(conversationsTable.found_item_id, itemId),
          inArray(handoverRequestsTable.status, ["REQUESTED", "AWAITING_FINALIZATION", "DISPUTED"]),
        )).limit(1);
      if (activeClaim || activeConversation || activeHandover) {
        const error = new Error("This found item has an active claim or handover. Resolve it before deleting the item.");
        error.statusCode = 409;
        throw error;
      }

      await tx.delete(foundItemsTable)
        .where(and(
          eq(foundItemsTable.id, itemId),
          eq(foundItemsTable.finder_id, userId),
          eq(foundItemsTable.status, "FOUND"),
        ));
    });

    return res.status(200).json({ message: "Found item deleted successfully" });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Could not delete found item:", error);
    return res.status(500).json({ message: "Could not delete found item" });
  }
};

export const addFoundItem = async (req, res) => {
  try {
    const finder_id = req.user?.id;
    if (!finder_id) return res.status(401).json({ message: "Sign in to add a found item" });
    const { item_type, date_found, location_found, hidden_details, public_details, image_urls } = req.body;
    const hidden = toObject(hidden_details);
    const visible = toObject(public_details);
    const parsedDate = new Date(date_found);
    if (!item_type || !location_found || !hidden || !visible || Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Complete the required item details" });
    }

    const item = await db.transaction(async (tx) => {
      const [created] = await tx.insert(foundItemsTable).values({
        item_type,
        finder_id,
        date_found: parsedDate,
        location_found,
        hidden_details: hidden,
        public_details: visible,
        image_urls: Array.isArray(image_urls) ? image_urls : [],
        status: "FOUND",
      }).returning();
      await enqueueAiJob(tx, "MATCH_FOUND_ITEM", { found_item_id: created.id }, `match-found:${created.id}`);
      return created;
    });

    return res.status(201).json({
      message: "Found item posted. Athar AI is checking for matches in the background.",
      foundItem: publicItem(item),
      matching_status: "PROCESSING",
    });
  } catch (error) {
    console.error("Could not add found item:", error);
    return res.status(500).json({ message: "Could not add found item" });
  }
};

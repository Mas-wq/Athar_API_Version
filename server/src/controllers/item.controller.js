import { db } from "../index.js";
import { auctionsTable, foundItemsTable, lostReportsTable } from "../models/index.js";
import { and, desc, eq, inArray } from "drizzle-orm";

const addAuctionInfo = async (items) => {
  const itemIds = items.filter((item) => item.status === "IN_AUCTION").map((item) => item.id);
  if (!itemIds.length) return items;
  const auctions = await db.select({
    id: auctionsTable.id,
    found_item_id: auctionsTable.found_item_id,
    start_price: auctionsTable.start_price,
    current_price: auctionsTable.current_price,
  }).from(auctionsTable).where(and(
    inArray(auctionsTable.found_item_id, itemIds),
    inArray(auctionsTable.status, ["OPEN", "AWAITING_PICKUP"]),
  ));
  const byItem = new Map(auctions.map((auction) => [auction.found_item_id, auction]));
  return items.map((item) => {
    const auction = byItem.get(item.id);
    return auction ? {
      ...item,
      auction_id: auction.id,
      auction_current_price: Number(auction.current_price) || auction.start_price,
    } : item;
  });
};

export const getAllFoundItems = async (req, res) => {
  try {
    const userRole = req.user?.role;
    const isPrivileged = userRole === "ADMIN";

    let items;

    if (isPrivileged) {
      // Admin can inspect the full local record.
      items = await db
        .select()
        .from(foundItemsTable)
        .orderBy(desc(foundItemsTable.created_at));
    } else {
      // 2. Public/User: expose safe fields for every found item, including
      // items reserved for pickup or already returned to their owner.
      items = await db
        .select({
          id: foundItemsTable.id,
          item_type: foundItemsTable.item_type,
          date_found: foundItemsTable.date_found,
          location_found: foundItemsTable.location_found,
          public_details: foundItemsTable.public_details,
          image_urls: foundItemsTable.image_urls,
          status: foundItemsTable.status,
          created_at: foundItemsTable.created_at,
        })
        .from(foundItemsTable)
        .where(inArray(foundItemsTable.status, ["FOUND", "CLAIMED", "RETURNED", "IN_AUCTION", "SOLD", "UNCLAIMED"]))
        .orderBy(desc(foundItemsTable.created_at));
    }

    items = await addAuctionInfo(items);
    return res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    console.error("Error fetching found items:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getPublicLostReports = async (req, res) => {
  try {
    // Public browsing only includes open reports and never exposes reporter identity.
    const reports = await db
      .select({
        id: lostReportsTable.id,
        item_type: lostReportsTable.item_type,
        report_details: lostReportsTable.report_details,
        date_lost: lostReportsTable.date_lost,
        location_lost: lostReportsTable.location_lost,
        image_urls: lostReportsTable.image_urls,
        status: lostReportsTable.status,
        created_at: lostReportsTable.created_at,
      })
      .from(lostReportsTable)
      .orderBy(desc(lostReportsTable.created_at));

    const publicReports = reports.map((report) => ({
      ...report,
      report_number: `ATH-${String(report.id).slice(0, 8).toUpperCase()}`,
    }));
    return res.status(200).json({ success: true, count: reports.length, data: publicReports });
  } catch (error) {
    console.error("Error fetching public lost reports:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getFoundItemById = async (req, res) => {
  const { id } = req.params;
  const userRole = req.user?.role;
    const isPrivileged = userRole === "ADMIN";

  try {
    let foundItem;

    if (isPrivileged) {
      // Admin can inspect the full local record.
      [foundItem] = await db
        .select()
        .from(foundItemsTable)
        .where(eq(foundItemsTable.id, id));
    } else {
      // 2. Public/User: Get ONLY public columns
      [foundItem] = await db
        .select({
          id: foundItemsTable.id,
          item_type: foundItemsTable.item_type,
          date_found: foundItemsTable.date_found,
          location_found: foundItemsTable.location_found,
          public_details: foundItemsTable.public_details,
          image_urls: foundItemsTable.image_urls,
          status: foundItemsTable.status,
          created_at: foundItemsTable.created_at,
        })
        .from(foundItemsTable)
        .where(eq(foundItemsTable.id, id));

    }

    if (!foundItem) {
      return res.status(404).json({ message: "Found item not found" });
    }

    [foundItem] = await addAuctionInfo([foundItem]);

    return res.status(200).json({ success: true, data: foundItem });
  } catch (error) {
    console.error("Error fetching found item by ID:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

import { and, count, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { db } from "../index.js";
import {
  auctionsTable,
  bidsTable,
  conversationsTable,
  foundItemsTable,
  notificationsTable,
  usersTable,
} from "../models/index.js";
import {
  adminCancelAuction,
  adminSetAuctionReserve,
  getSettings,
  markNotificationsRead,
  placeBid,
  updateSettings,
  updateUserBiddingStatus,
} from "../../services/auctionService.js";

const safeItemFields = {
  id: foundItemsTable.id,
  item_type: foundItemsTable.item_type,
  date_found: foundItemsTable.date_found,
  location_found: foundItemsTable.location_found,
  public_details: foundItemsTable.public_details,
  image_urls: foundItemsTable.image_urls,
  status: foundItemsTable.status,
  created_at: foundItemsTable.created_at,
};
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const countBidsByAuction = async (auctionIds) => {
  if (!auctionIds.length) return new Map();
  const rows = await db.select({ auction_id: bidsTable.auction_id, value: count() })
    .from(bidsTable).where(and(inArray(bidsTable.auction_id, auctionIds), eq(bidsTable.status, "VALID")))
    .groupBy(bidsTable.auction_id);
  return new Map(rows.map((row) => [row.auction_id, Number(row.value)]));
};

const presentAuction = (auction, item, bidCount = 0) => ({
  id: auction.id,
  found_item: item,
  current_price: Number(auction.current_price) || auction.start_price,
  start_price: auction.start_price,
  min_increment: auction.min_increment,
  bid_count: bidCount,
  starts_at: auction.starts_at,
  ends_at: auction.ends_at,
  status: auction.status,
});

export const getPublicAuctions = async (_req, res) => {
  try {
    const rows = await db.select({ auction: auctionsTable, item: safeItemFields })
      .from(auctionsTable)
      .innerJoin(foundItemsTable, eq(auctionsTable.found_item_id, foundItemsTable.id))
      .where(and(eq(auctionsTable.status, "OPEN"), gt(auctionsTable.ends_at, new Date())))
      .orderBy(auctionsTable.ends_at)
      .limit(100);
    const counts = await countBidsByAuction(rows.map((row) => row.auction.id));
    return res.status(200).json({
      success: true,
      data: rows.map(({ auction, item }) => presentAuction(auction, item, counts.get(auction.id) || 0)),
    });
  } catch (error) {
    console.error("Could not load public auctions:", error);
    return res.status(500).json({ message: "Could not load auctions" });
  }
};

export const getPublicAuctionById = async (req, res) => {
  if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ message: "Invalid auction ID" });
  try {
    const [row] = await db.select({ auction: auctionsTable, item: safeItemFields })
      .from(auctionsTable)
      .innerJoin(foundItemsTable, eq(auctionsTable.found_item_id, foundItemsTable.id))
      .where(eq(auctionsTable.id, req.params.id)).limit(1);
    if (!row) return res.status(404).json({ message: "Auction not found" });
    const bidRows = await db.select({
      bidder_id: bidsTable.bidder_id,
      amount: bidsTable.amount,
      created_at: bidsTable.created_at,
      status: bidsTable.status,
    }).from(bidsTable).where(and(
      eq(bidsTable.auction_id, row.auction.id),
      eq(bidsTable.status, "VALID"),
    )).orderBy(bidsTable.created_at, bidsTable.id);
    const firstBidderOrder = new Map();
    for (const bid of bidRows) {
      if (!firstBidderOrder.has(bid.bidder_id)) firstBidderOrder.set(bid.bidder_id, firstBidderOrder.size + 1);
    }
    const history = bidRows.map((bid) => ({
      bidder_alias: `Bidder ${firstBidderOrder.get(bid.bidder_id)}`,
      amount: bid.amount,
      created_at: bid.created_at,
    }));
    const highestBidderId = row.auction.highest_bid_id
      ? (await db.select({ bidder_id: bidsTable.bidder_id }).from(bidsTable)
          .where(eq(bidsTable.id, row.auction.highest_bid_id)).limit(1))[0]?.bidder_id
      : null;
    const viewerState = req.user?.id && bidRows.some((bid) => bid.bidder_id === req.user.id)
      ? row.auction.status === "OPEN"
        ? (highestBidderId === req.user.id ? "leading" : "outbid")
        : (row.auction.winner_id === req.user.id ? "won" : "lost")
      : null;
    return res.status(200).json({
      success: true,
      data: {
        ...presentAuction(row.auction, row.item, bidRows.length),
        bid_history: history,
        viewer_state: viewerState,
        pickup_deadline: row.auction.pickup_deadline,
        final_price: row.auction.final_price,
        cancel_reason: row.auction.status === "CANCELLED" ? row.auction.cancel_reason : null,
      },
    });
  } catch (error) {
    console.error("Could not load auction:", error);
    return res.status(500).json({ message: "Could not load auction" });
  }
};

export const submitBid = async (req, res) => {
  try {
    const result = await placeBid(req.params.id, req.user.id, req.body?.amount);
    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Could not place bid" });
  }
};

export const getMyBids = async (req, res) => {
  try {
    const rows = await db.select({
      bid: bidsTable,
      auction: auctionsTable,
      item: {
        id: foundItemsTable.id,
        item_type: foundItemsTable.item_type,
        image_urls: foundItemsTable.image_urls,
        location_found: foundItemsTable.location_found,
        public_details: foundItemsTable.public_details,
      },
    }).from(bidsTable)
      .innerJoin(auctionsTable, eq(bidsTable.auction_id, auctionsTable.id))
      .innerJoin(foundItemsTable, eq(auctionsTable.found_item_id, foundItemsTable.id))
      .where(eq(bidsTable.bidder_id, req.user.id))
      .orderBy(desc(bidsTable.created_at));
    const latestByAuction = new Map();
    for (const row of rows) {
      if (!latestByAuction.has(row.auction.id)) latestByAuction.set(row.auction.id, row);
    }
    const auctionIds = [...latestByAuction.keys()];
    const conversations = auctionIds.length ? await db.select({
      id: conversationsTable.id,
      auction_id: conversationsTable.auction_id,
    }).from(conversationsTable).where(and(
      inArray(conversationsTable.auction_id, auctionIds),
      eq(conversationsTable.claimant_id, req.user.id),
    )) : [];
    const chatByAuction = new Map(conversations.map((conversation) => [conversation.auction_id, conversation.id]));
    const data = [...latestByAuction.values()].map(({ bid, auction, item }) => {
      const state = bid.status === "FORFEITED" ? "forfeited"
        : ["AWAITING_PICKUP", "SOLD"].includes(auction.status) && auction.winner_id === req.user.id ? "won"
          : ["AWAITING_PICKUP", "SOLD", "UNSOLD", "CANCELLED"].includes(auction.status) ? "lost"
            : auction.status === "OPEN" && auction.winner_id == null && auction.highest_bid_id &&
              rows.find((candidate) => candidate.auction.id === auction.id && candidate.bid.id === auction.highest_bid_id)?.bid.bidder_id === req.user.id
              ? "leading" : "outbid";
      return {
        auction_id: auction.id,
        conversation_id: chatByAuction.get(auction.id) || null,
        bid_id: bid.id,
        amount: bid.amount,
        created_at: bid.created_at,
        state,
        current_price: Number(auction.current_price) || auction.start_price,
        ends_at: auction.ends_at,
        pickup_deadline: auction.pickup_deadline,
        item,
      };
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Could not load bids:", error);
    return res.status(500).json({ message: "Could not load your bids" });
  }
};

export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await db.select({
      id: notificationsTable.id,
      type: notificationsTable.type,
      title: notificationsTable.title,
      body: notificationsTable.body,
      link: notificationsTable.link,
      read_at: notificationsTable.read_at,
      created_at: notificationsTable.created_at,
    }).from(notificationsTable)
      .where(eq(notificationsTable.user_id, req.user.id))
      .orderBy(desc(notificationsTable.created_at)).limit(30);
    return res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error("Could not load notifications:", error);
    return res.status(500).json({ message: "Could not load notifications" });
  }
};

export const getUnreadNotificationCount = async (req, res) => {
  try {
    const [result] = await db.select({ value: count() }).from(notificationsTable)
      .where(and(eq(notificationsTable.user_id, req.user.id), isNull(notificationsTable.read_at)));
    return res.status(200).json({ unread_count: Number(result?.value || 0) });
  } catch (error) {
    console.error("Could not count notifications:", error);
    return res.status(500).json({ message: "Could not count notifications" });
  }
};

export const readMyNotifications = async (req, res) => {
  try {
    if (req.body?.notification_ids !== undefined && !Array.isArray(req.body.notification_ids)) {
      return res.status(400).json({ message: "notification_ids must be a list" });
    }
    const updated_count = await markNotificationsRead(req.user.id, req.body?.notification_ids);
    return res.status(200).json({ success: true, updated_count });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Could not mark notifications as read" });
  }
};

export const getAdminAuctionSettings = async (_req, res) => {
  try {
    return res.status(200).json({ success: true, data: await getSettings() });
  } catch (error) {
    console.error("Could not load auction settings:", error);
    return res.status(500).json({ message: "Could not load auction settings" });
  }
};

export const putAdminAuctionSettings = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({ message: "Send an auction settings object" });
    }
    return res.status(200).json({ success: true, data: await updateSettings(req.body) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Could not update auction settings" });
  }
};

export const getAdminAuctions = async (req, res) => {
  try {
    const status = req.query.status;
    const validStatuses = ["OPEN", "AWAITING_PICKUP", "SOLD", "CANCELLED", "UNSOLD"];
    if (status && status !== "ALL" && !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid auction status filter" });
    }
    const rows = await db.select({
      auction: auctionsTable,
      item: {
        id: foundItemsTable.id,
        item_type: foundItemsTable.item_type,
        status: foundItemsTable.status,
        image_urls: foundItemsTable.image_urls,
        location_found: foundItemsTable.location_found,
      },
      finder_name: usersTable.full_name,
    }).from(auctionsTable)
      .innerJoin(foundItemsTable, eq(auctionsTable.found_item_id, foundItemsTable.id))
      .innerJoin(usersTable, eq(auctionsTable.finder_id, usersTable.id))
      .where(status && status !== "ALL" ? eq(auctionsTable.status, status) : undefined)
      .orderBy(desc(auctionsTable.created_at)).limit(300);
    const counts = await countBidsByAuction(rows.map((row) => row.auction.id));
    return res.status(200).json({ success: true, data: rows.map(({ auction, item, finder_name }) => ({
      ...presentAuction(auction, item, counts.get(auction.id) || 0),
      finder_name,
      winner_id: auction.winner_id,
      final_price: auction.final_price,
      pickup_deadline: auction.pickup_deadline,
      cancel_reason: auction.cancel_reason,
      relist_count: auction.relist_count,
    })) });
  } catch (error) {
    console.error("Could not load admin auctions:", error);
    return res.status(500).json({ message: "Could not load auctions" });
  }
};

export const getAdminAuctionById = async (req, res) => {
  if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ message: "Invalid auction ID" });
  try {
    const [row] = await db.select({ auction: auctionsTable, item: foundItemsTable })
      .from(auctionsTable).innerJoin(foundItemsTable, eq(auctionsTable.found_item_id, foundItemsTable.id))
      .where(eq(auctionsTable.id, req.params.id)).limit(1);
    if (!row) return res.status(404).json({ message: "Auction not found" });
    const bidRows = await db.select({
      bid: bidsTable,
      user: { id: usersTable.id, full_name: usersTable.full_name, email: usersTable.email, phone: usersTable.phone },
    }).from(bidsTable).innerJoin(usersTable, eq(bidsTable.bidder_id, usersTable.id))
      .where(eq(bidsTable.auction_id, row.auction.id)).orderBy(desc(bidsTable.amount), desc(bidsTable.created_at));
    return res.status(200).json({ success: true, data: {
      auction: row.auction,
      found_item: row.item,
      bids: bidRows.map(({ bid, user }) => ({ ...bid, bidder: user })),
    } });
  } catch (error) {
    console.error("Could not load auction details for admin:", error);
    return res.status(500).json({ message: "Could not load auction details" });
  }
};

export const cancelAdminAuction = async (req, res) => {
  try {
    const auction = await adminCancelAuction(req.params.id, req.body?.reason);
    return res.status(200).json({ success: true, auction_id: auction.id });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Could not cancel auction" });
  }
};

export const setAdminAuctionReserve = async (req, res) => {
  try {
    const value = req.body?.reserve_price;
    if (value !== null && (!Number.isSafeInteger(value) || value < 1 || value > 100_000_000)) {
      return res.status(400).json({ message: "reserve_price must be null or a whole EGP amount between 1 and 100000000" });
    }
    const auction = await adminSetAuctionReserve(req.params.id, value);
    return res.status(200).json({ success: true, reserve_price: auction.reserve_price });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Could not update reserve price" });
  }
};

export const updateAdminUserStrikes = async (req, res) => {
  try {
    const user = await updateUserBiddingStatus(req.params.userId, req.body?.action);
    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Could not update bidding status" });
  }
};

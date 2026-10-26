import {
  and,
  desc,
  eq,
  inArray,
  isNull,
  lte,
} from "drizzle-orm";
import { db } from "../src/index.js";
import {
  auctionSettingsTable,
  auctionsTable,
  bidsTable,
  claimsTable,
  conversationMessagesTable,
  conversationsTable,
  foundItemsTable,
  handoverRequestsTable,
  notificationsTable,
  usersTable,
} from "../src/models/index.js";

export const DEFAULT_AUCTION_SETTINGS = Object.freeze({
  id: 1,
  waiting_minutes: 43200,
  notice_minutes: 4320,
  duration_minutes: 10080,
  anti_sniping_minutes: 10,
  start_price: 50,
  min_increment: 10,
  pickup_minutes: 4320,
  strike_limit: 3,
  relist_start_price_percent: 50,
  excluded_types: [
    "id card", "national id", "bank card", "credit card", "debit card", "atm",
    "passport", "document", "phone", "mobile", "iphone", "keys", "key",
    "بطاقة", "هوية", "كارنيه", "فيزا", "جواز", "مستند", "موبايل", "تليفون", "مفتاح", "مفاتيح",
  ],
  proceeds_note: "To be decided by the university",
});

const ACTIVE_AUCTION_STATUSES = ["OPEN", "AWAITING_PICKUP"];
const ACTIVE_CLAIM_STATUSES = ["PENDING", "APPROVED"];
const ACTIVE_CONVERSATION_STATUSES = ["PENDING_FINDER", "PENDING_OWNER", "ACCEPTED"];
const bidRateWindows = new Map();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const fail = (message, statusCode = 409) => Object.assign(new Error(message), { statusCode });
const requireUuid = (value, label) => {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) throw fail(`${label} must be a valid ID`, 400);
};

export const addNotification = async (executor, userId, type, title, body, link = null) => {
  if (!userId) return null;
  const [notification] = await executor.insert(notificationsTable).values({
    user_id: userId,
    type,
    title: String(title).slice(0, 180),
    body: String(body).slice(0, 2000),
    link,
  }).returning();
  return notification;
};

export const getSettings = async (executor = db) => {
  await executor.insert(auctionSettingsTable)
    .values({ ...DEFAULT_AUCTION_SETTINGS })
    .onConflictDoNothing({ target: auctionSettingsTable.id });
  const [settings] = await executor.select().from(auctionSettingsTable)
    .where(eq(auctionSettingsTable.id, 1)).limit(1);
  return settings || { ...DEFAULT_AUCTION_SETTINGS };
};

export const updateSettings = async (values) => {
  const allowedFields = new Set([
    "waiting_minutes", "notice_minutes", "duration_minutes", "anti_sniping_minutes",
    "start_price", "min_increment", "pickup_minutes", "strike_limit",
    "relist_start_price_percent", "excluded_types", "proceeds_note",
  ]);
  const unknownFields = Object.keys(values).filter((field) => !allowedFields.has(field));
  if (unknownFields.length) throw fail(`Unsupported setting: ${unknownFields[0]}`, 400);
  const allowedIntegerRanges = {
    waiting_minutes: [0, 5256000],
    notice_minutes: [0, 5256000],
    duration_minutes: [1, 5256000],
    anti_sniping_minutes: [0, 5256000],
    start_price: [1, 100000000],
    min_increment: [1, 100000000],
    pickup_minutes: [1, 5256000],
    strike_limit: [1, 100],
    relist_start_price_percent: [1, 100],
  };
  const updates = {};
  for (const [field, [min, max]] of Object.entries(allowedIntegerRanges)) {
    if (values[field] === undefined) continue;
    const value = values[field];
    if (!Number.isSafeInteger(value) || value < min || value > max) {
      throw fail(`${field} must be an integer between ${min} and ${max}`, 400);
    }
    updates[field] = value;
  }
  if (values.excluded_types !== undefined) {
    if (!Array.isArray(values.excluded_types) || values.excluded_types.length > 100 ||
        values.excluded_types.some((value) => typeof value !== "string" || value.trim().length < 1 || value.length > 80)) {
      throw fail("excluded_types must be a list of up to 100 non-empty keywords", 400);
    }
    updates.excluded_types = [...new Set(values.excluded_types.map((value) => value.trim()).filter(Boolean))];
  }
  if (values.proceeds_note !== undefined) {
    if (typeof values.proceeds_note !== "string" || values.proceeds_note.trim().length > 500) {
      throw fail("proceeds_note must be text no longer than 500 characters", 400);
    }
    updates.proceeds_note = values.proceeds_note.trim();
  }
  updates.updated_at = new Date();
  return db.transaction(async (tx) => {
    await getSettings(tx);
    const [updated] = await tx.update(auctionSettingsTable).set(updates)
      .where(eq(auctionSettingsTable.id, 1)).returning();
    return updated;
  });
};

const stringsFromValue = (value) => {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringsFromValue);
  if (value && typeof value === "object") return Object.values(value).flatMap(stringsFromValue);
  return [];
};

export const isExcludedType = (item, settings = DEFAULT_AUCTION_SETTINGS) => {
  const text = [item?.item_type, ...stringsFromValue(item?.public_details)]
    .filter(Boolean).join(" ").toLocaleLowerCase();
  return (settings.excluded_types || []).some((keyword) =>
    typeof keyword === "string" && keyword.trim() && text.includes(keyword.trim().toLocaleLowerCase()));
};

const isCurrentlyEligible = async (executor, item, settings, now = new Date()) => {
  if (!item || item.status !== "FOUND" || item.auction_opt_out || isExcludedType(item, settings)) return false;
  const [activeClaim] = await executor.select({ id: claimsTable.id }).from(claimsTable)
    .where(and(eq(claimsTable.found_item_id, item.id), inArray(claimsTable.status, ACTIVE_CLAIM_STATUSES)))
    .limit(1);
  if (activeClaim) return false;
  const [activeConversation] = await executor.select({ id: conversationsTable.id }).from(conversationsTable)
    .where(and(eq(conversationsTable.found_item_id, item.id), inArray(conversationsTable.status, ACTIVE_CONVERSATION_STATUSES)))
    .limit(1);
  if (activeConversation) return false;
  const [latestClaimActivity] = await executor.select({ created_at: claimsTable.created_at }).from(claimsTable)
    .where(eq(claimsTable.found_item_id, item.id))
    .orderBy(desc(claimsTable.created_at)).limit(1);
  const lastActivity = latestClaimActivity?.created_at || item.created_at;
  return new Date(lastActivity).getTime() <= now.getTime() - settings.waiting_minutes * 60_000;
};

export const findEligibleItems = async (executor = db, settings = null, now = new Date()) => {
  const activeSettings = settings || await getSettings(executor);
  const candidates = await executor.select().from(foundItemsTable)
    .where(eq(foundItemsTable.status, "FOUND"))
    .orderBy(foundItemsTable.created_at);
  const eligible = await Promise.all(candidates.map(async (item) =>
    await isCurrentlyEligible(executor, item, activeSettings, now) ? item : null));
  return eligible.filter(Boolean);
};

const describeDuration = (minutes) => {
  if (minutes >= 1440 && minutes % 1440 === 0) return `${minutes / 1440} day${minutes === 1440 ? "" : "s"}`;
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60} hour${minutes === 60 ? "" : "s"}`;
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
};

export const runNoticeStep = async (now = new Date()) => {
  const settings = await getSettings();
  const eligible = await findEligibleItems(db, settings, now);
  for (const candidate of eligible) {
    await db.transaction(async (tx) => {
      const [item] = await tx.select().from(foundItemsTable)
        .where(eq(foundItemsTable.id, candidate.id)).for("update");
      if (!await isCurrentlyEligible(tx, item, settings, now) || item.auction_notice_at) return;
      const [updated] = await tx.update(foundItemsTable)
        .set({ auction_notice_at: now, updated_at: now })
        .where(and(eq(foundItemsTable.id, item.id), isNull(foundItemsTable.auction_notice_at)))
        .returning({ id: foundItemsTable.id });
      if (!updated) return;
      await addNotification(
        tx,
        item.finder_id,
        "AUCTION_NOTICE",
        "Your found item may enter an auction",
        `Your item will enter an auction in ${describeDuration(settings.notice_minutes)}. You can remove it from the auction from My Dashboard.`,
        "/my-dashboard",
      );
    });
  }
};

const auctionSnapshot = (item, settings, now, overrides = {}) => {
  const startPrice = overrides.start_price ?? settings.start_price;
  return {
    found_item_id: item.id,
    finder_id: item.finder_id,
    status: "OPEN",
    start_price: startPrice,
    min_increment: settings.min_increment,
    reserve_price: overrides.reserve_price ?? null,
    current_price: 0,
    starts_at: now,
    ends_at: new Date(now.getTime() + settings.duration_minutes * 60_000),
    duration_minutes: settings.duration_minutes,
    anti_sniping_minutes: settings.anti_sniping_minutes,
    pickup_minutes: settings.pickup_minutes,
    relist_count: overrides.relist_count ?? 0,
    relist_start_price_percent: settings.relist_start_price_percent,
    ending_soon_notified: false,
    updated_at: now,
  };
};

export const runStartStep = async (now = new Date()) => {
  const settings = await getSettings();
  const pending = await db.select().from(foundItemsTable)
    .where(eq(foundItemsTable.status, "FOUND"));
  const noticed = pending.filter((item) => item.auction_notice_at);
  for (const candidate of noticed) {
    await db.transaction(async (tx) => {
      const [item] = await tx.select().from(foundItemsTable)
        .where(eq(foundItemsTable.id, candidate.id)).for("update");
      if (!item || item.status !== "FOUND" || !item.auction_notice_at) return;
      const noticeDue = new Date(item.auction_notice_at).getTime() + settings.notice_minutes * 60_000 <= now.getTime();
      if (!noticeDue) return;
      if (!await isCurrentlyEligible(tx, item, settings, now)) {
        await tx.update(foundItemsTable).set({ auction_notice_at: null, updated_at: now })
          .where(eq(foundItemsTable.id, item.id));
        return;
      }
      const [activeAuction] = await tx.select({ id: auctionsTable.id }).from(auctionsTable)
        .where(and(eq(auctionsTable.found_item_id, item.id), inArray(auctionsTable.status, ACTIVE_AUCTION_STATUSES))).limit(1);
      if (activeAuction) {
        await tx.update(foundItemsTable).set({ status: "IN_AUCTION", auction_notice_at: null, updated_at: now })
          .where(eq(foundItemsTable.id, item.id));
        return;
      }
      const [auction] = await tx.insert(auctionsTable).values(auctionSnapshot(item, settings, now)).returning();
      await tx.update(foundItemsTable).set({ status: "IN_AUCTION", auction_notice_at: null, updated_at: now })
        .where(eq(foundItemsTable.id, item.id));
      await addNotification(
        tx,
        item.finder_id,
        "AUCTION_STARTED",
        "Your item is now in an auction",
        `The auction has opened with a starting price of ${auction.start_price} EGP.`,
        `/auctions/${auction.id}`,
      );
    });
  }
};

const checkRateLimit = (userId, now = Date.now()) => {
  const windowMs = 60_000;
  const maxBids = 12;
  const recent = (bidRateWindows.get(userId) || []).filter((timestamp) => now - timestamp < windowMs);
  if (recent.length >= maxBids) throw fail("You are bidding too quickly. Wait a minute and try again.", 429);
  recent.push(now);
  bidRateWindows.set(userId, recent);
  if (bidRateWindows.size > 5000) {
    for (const [key, timestamps] of bidRateWindows) {
      if (!timestamps.some((timestamp) => now - timestamp < windowMs)) bidRateWindows.delete(key);
    }
  }
};

export const placeBid = async (auctionId, userId, amount, now = new Date()) => {
  requireUuid(auctionId, "auctionId");
  if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 1 || amount > 100_000_000) {
    throw fail("Bid amount must be a whole EGP amount between 1 and 100000000", 400);
  }
  checkRateLimit(userId, now.getTime());
  return db.transaction(async (tx) => {
    const [auction] = await tx.select().from(auctionsTable)
      .where(eq(auctionsTable.id, auctionId)).for("update");
    if (!auction) throw fail("Auction not found", 404);
    if (auction.status !== "OPEN" || new Date(auction.starts_at) > now || new Date(auction.ends_at) <= now) {
      throw fail("This auction is not open for bids", 409);
    }
    const [user] = await tx.select({
      id: usersTable.id,
      role: usersTable.role,
      is_active: usersTable.is_active,
      email_verified: usersTable.email_verified,
      bidding_banned: usersTable.bidding_banned,
    }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user || user.role !== "USER") throw fail("Only regular user accounts can bid", 403);
    if (!user.is_active) throw fail("Your account is inactive and cannot bid", 403);
    if (!user.email_verified) throw fail("Verify your email before bidding", 403);
    if (user.bidding_banned) throw fail("Your account is banned from bidding", 403);
    if (user.id === auction.finder_id) throw fail("The finder cannot bid on their own item", 403);

    const [previousHighest] = auction.highest_bid_id
      ? await tx.select().from(bidsTable).where(eq(bidsTable.id, auction.highest_bid_id)).limit(1)
      : [];
    const minimum = previousHighest && previousHighest.status === "VALID"
      ? Number(auction.current_price) + auction.min_increment
      : auction.start_price;
    if (amount < minimum) throw fail(`Your bid must be at least ${minimum} EGP`, 400);

    const [bid] = await tx.insert(bidsTable).values({
      auction_id: auction.id,
      bidder_id: user.id,
      amount,
      status: "VALID",
    }).returning();
    const extendsAuction = (new Date(auction.ends_at).getTime() - now.getTime()) <= auction.anti_sniping_minutes * 60_000;
    const newEndsAt = extendsAuction
      ? new Date(new Date(auction.ends_at).getTime() + auction.anti_sniping_minutes * 60_000)
      : auction.ends_at;
    await tx.update(auctionsTable).set({
      current_price: amount,
      highest_bid_id: bid.id,
      ends_at: newEndsAt,
      ending_soon_notified: auction.ending_soon_notified,
      updated_at: now,
    }).where(eq(auctionsTable.id, auction.id));
    if (previousHighest?.bidder_id && previousHighest.bidder_id !== user.id) {
      await addNotification(tx, previousHighest.bidder_id, "AUCTION_OUTBID", "You were outbid",
        `A higher bid of ${amount} EGP was placed.`, `/auctions/${auction.id}`);
    }
    return { bid, ends_at: newEndsAt, minimum_next_bid: amount + auction.min_increment };
  });
};

const createAuctionConversation = async (tx, auction, winnerId, item, price, now) => {
  const [conversation] = await tx.insert(conversationsTable).values({
    lost_report_id: null,
    found_item_id: item.id,
    kind: "AUCTION",
    auction_id: auction.id,
    claimant_id: winnerId,
    finder_id: item.finder_id,
    match_percentage: 0,
    status: "ACCEPTED",
    updated_at: now,
  }).returning();
  await tx.insert(conversationMessagesTable).values({
    conversation_id: conversation.id,
    sender_id: null,
    sender_name: "Athar AI Assistant",
    message_type: "SYSTEM",
    message: `You won this auction for ${price} EGP. Arrange a public meeting place and time here. Pay the amount in CASH at pickup.`,
  });
  return conversation;
};

const notifyAuctionResult = async (tx, auctionId, winnerId, finderId, price, now) => {
  const bidderRows = await tx.select({ bidder_id: bidsTable.bidder_id }).from(bidsTable)
    .where(eq(bidsTable.auction_id, auctionId));
  const notified = new Set();
  for (const { bidder_id: bidderId } of bidderRows) {
    if (notified.has(bidderId)) continue;
    notified.add(bidderId);
    if (bidderId === winnerId) {
      await addNotification(tx, bidderId, "AUCTION_WON", "You won the auction",
        `Your winning bid is ${price} EGP. Collect the item and pay cash before the pickup deadline.`, `/chats`);
    } else {
      await addNotification(tx, bidderId, "AUCTION_LOST", "The auction has ended",
        "Another bidder won this auction.", `/auctions/${auctionId}`);
    }
  }
  await addNotification(tx, finderId, "AUCTION_WON", "Your auction has a winner",
    `The winning amount is ${price} EGP. Coordinate a public pickup in the chat.`, `/chats`);
};

const closeAuctionConversations = async (tx, auction, now, message) => {
  const conversations = await tx.select().from(conversationsTable)
    .where(eq(conversationsTable.auction_id, auction.id));
  for (const conversation of conversations) {
    if (!["CLOSED", "DELIVERED"].includes(conversation.status)) {
      await tx.update(conversationsTable).set({ status: "CLOSED", updated_at: now })
        .where(eq(conversationsTable.id, conversation.id));
      await tx.insert(conversationMessagesTable).values({
        conversation_id: conversation.id,
        sender_id: null,
        sender_name: "Athar AI Assistant",
        message_type: "SYSTEM",
        message,
      });
    }
    await tx.update(handoverRequestsTable).set({ status: "EXPIRED", updated_at: now })
      .where(and(eq(handoverRequestsTable.conversation_id, conversation.id), inArray(
        handoverRequestsTable.status, ["REQUESTED", "AWAITING_FINALIZATION", "DISPUTED"],
      )));
  }
};

const openRelist = async (tx, auction, item, settings, now, { sameStartPrice = false } = {}) => {
  const startPrice = sameStartPrice
    ? auction.start_price
    : Math.max(10, Math.floor(auction.start_price * settings.relist_start_price_percent / 100));
  const snapshot = auctionSnapshot(item, settings, now, {
    start_price: startPrice,
    reserve_price: auction.reserve_price,
    relist_count: auction.relist_count + (sameStartPrice ? 0 : 1),
  });
  const [relisted] = await tx.insert(auctionsTable).values(snapshot).returning();
  await addNotification(tx, item.finder_id, "AUCTION_RELISTED", "Your item has been listed again",
    `The auction has reopened with a starting price of ${startPrice} EGP.`, `/auctions/${relisted.id}`);
  return relisted;
};

export const closeDueAuctions = async (now = new Date()) => {
  const due = await db.select({ id: auctionsTable.id }).from(auctionsTable)
    .where(and(eq(auctionsTable.status, "OPEN"), lte(auctionsTable.ends_at, now)));
  const settings = await getSettings();
  for (const { id } of due) {
    await db.transaction(async (tx) => {
      const [preview] = await tx.select().from(auctionsTable).where(eq(auctionsTable.id, id)).limit(1);
      if (!preview || preview.status !== "OPEN" || new Date(preview.ends_at) > now) return;
      const [item] = await tx.select().from(foundItemsTable)
        .where(eq(foundItemsTable.id, preview.found_item_id)).for("update");
      const [auction] = await tx.select().from(auctionsTable)
        .where(eq(auctionsTable.id, id)).for("update");
      if (!auction || auction.status !== "OPEN" || new Date(auction.ends_at) > now) return;
      if (!item) {
        await tx.update(auctionsTable).set({ status: "CANCELLED", cancel_reason: "Found item no longer exists", updated_at: now })
          .where(eq(auctionsTable.id, auction.id));
        return;
      }
      const [highest] = await tx.select().from(bidsTable).where(and(
        eq(bidsTable.auction_id, auction.id),
        eq(bidsTable.status, "VALID"),
      )).orderBy(desc(bidsTable.amount), desc(bidsTable.created_at)).limit(1);
      const reserveMet = !auction.reserve_price || (highest && highest.amount >= auction.reserve_price);
      if (highest && reserveMet) {
        const deadline = new Date(now.getTime() + auction.pickup_minutes * 60_000);
        await tx.update(auctionsTable).set({
          status: "AWAITING_PICKUP",
          winner_id: highest.bidder_id,
          highest_bid_id: highest.id,
          current_price: highest.amount,
          final_price: highest.amount,
          pickup_deadline: deadline,
          updated_at: now,
        }).where(eq(auctionsTable.id, auction.id));
        await createAuctionConversation(tx, auction, highest.bidder_id, item, highest.amount, now);
        await notifyAuctionResult(tx, auction.id, highest.bidder_id, auction.finder_id, highest.amount, now);
        return;
      }

      await tx.update(auctionsTable).set({ status: "UNSOLD", updated_at: now })
        .where(eq(auctionsTable.id, auction.id));
      if (auction.relist_count < 1) {
        await openRelist(tx, auction, item, settings, now);
      } else {
        await tx.update(foundItemsTable).set({ status: "UNCLAIMED", updated_at: now })
          .where(eq(foundItemsTable.id, item.id));
        await addNotification(tx, item.finder_id, "AUCTION_UNSOLD", "The auction ended without a sale",
          "The relisted auction also ended without meeting its reserve or receiving a bid. The item is now marked unclaimed.", "/my-dashboard");
      }
    });
  }
};

export const sendEndingSoonNotifications = async (now = new Date()) => {
  const cutoff = new Date(now.getTime() + 60 * 60_000);
  const due = await db.select({ id: auctionsTable.id }).from(auctionsTable)
    .where(and(
      eq(auctionsTable.status, "OPEN"),
      eq(auctionsTable.ending_soon_notified, false),
      lte(auctionsTable.ends_at, cutoff),
    ));
  for (const { id } of due) {
    await db.transaction(async (tx) => {
      const [auction] = await tx.select().from(auctionsTable).where(eq(auctionsTable.id, id)).for("update");
      if (!auction || auction.status !== "OPEN" || auction.ending_soon_notified ||
          new Date(auction.ends_at) <= now || new Date(auction.ends_at) > cutoff) return;
      await tx.update(auctionsTable).set({ ending_soon_notified: true, updated_at: now })
        .where(eq(auctionsTable.id, auction.id));
      const bidders = await tx.select({ bidder_id: bidsTable.bidder_id }).from(bidsTable)
        .where(eq(bidsTable.auction_id, auction.id));
      for (const bidderId of new Set(bidders.map((row) => row.bidder_id))) {
        await addNotification(tx, bidderId, "AUCTION_ENDING", "Auction ending soon",
          "An auction you bid on is scheduled to end within an hour.", `/auctions/${auction.id}`);
      }
    });
  }
};

const nextEligibleBid = async (tx, auction, excludedUserIds) => {
  const bids = await tx.select({
    bid: bidsTable,
    user: {
      id: usersTable.id,
      role: usersTable.role,
      is_active: usersTable.is_active,
      email_verified: usersTable.email_verified,
      bidding_banned: usersTable.bidding_banned,
    },
  }).from(bidsTable)
    .innerJoin(usersTable, eq(bidsTable.bidder_id, usersTable.id))
    .where(and(eq(bidsTable.auction_id, auction.id), eq(bidsTable.status, "VALID")))
    .orderBy(desc(bidsTable.amount), desc(bidsTable.created_at));
  const seen = new Set(excludedUserIds);
  for (const row of bids) {
    const bidder = row.user;
    if (seen.has(bidder.id)) continue;
    seen.add(bidder.id);
    if (bidder.id === auction.finder_id || bidder.role !== "USER" || !bidder.is_active || !bidder.email_verified || bidder.bidding_banned) continue;
    return row.bid;
  }
  return null;
};

export const handleNoShows = async (now = new Date()) => {
  const due = await db.select({ id: auctionsTable.id }).from(auctionsTable)
    .where(and(eq(auctionsTable.status, "AWAITING_PICKUP"), lte(auctionsTable.pickup_deadline, now)));
  const settings = await getSettings();
  for (const { id } of due) {
    await db.transaction(async (tx) => {
      const [preview] = await tx.select().from(auctionsTable).where(eq(auctionsTable.id, id)).limit(1);
      if (!preview || preview.status !== "AWAITING_PICKUP" || !preview.pickup_deadline || new Date(preview.pickup_deadline) > now) return;
      const [item] = await tx.select().from(foundItemsTable)
        .where(eq(foundItemsTable.id, preview.found_item_id)).for("update");
      const [auction] = await tx.select().from(auctionsTable).where(eq(auctionsTable.id, id)).for("update");
      if (!auction || auction.status !== "AWAITING_PICKUP" || !auction.pickup_deadline || new Date(auction.pickup_deadline) > now) return;
      const [conversation] = await tx.select().from(conversationsTable).where(and(
        eq(conversationsTable.auction_id, auction.id),
        eq(conversationsTable.claimant_id, auction.winner_id),
      )).orderBy(desc(conversationsTable.created_at)).limit(1);
      const [handover] = conversation ? await tx.select().from(handoverRequestsTable)
        .where(eq(handoverRequestsTable.conversation_id, conversation.id)).limit(1) : [];
      if (handover && ["COMPLETED", "AWAITING_FINALIZATION", "DISPUTED"].includes(handover.status)) return;

      const previousWinnerId = auction.winner_id;
      if (auction.highest_bid_id) {
        await tx.update(bidsTable).set({ status: "FORFEITED" }).where(and(
          eq(bidsTable.auction_id, auction.id),
          eq(bidsTable.bidder_id, previousWinnerId),
          eq(bidsTable.status, "VALID"),
        ));
      }
      const [winner] = await tx.select().from(usersTable).where(eq(usersTable.id, previousWinnerId)).for("update");
      const nextStrikes = (winner?.bid_strikes || 0) + 1;
      const banned = nextStrikes >= settings.strike_limit;
      if (winner) await tx.update(usersTable).set({
        bid_strikes: nextStrikes,
        bidding_banned: winner.bidding_banned || banned,
        updated_at: now,
      }).where(eq(usersTable.id, winner.id));
      if (conversation) {
        await tx.update(conversationsTable).set({ status: "CLOSED", updated_at: now })
          .where(eq(conversationsTable.id, conversation.id));
        if (handover && ["REQUESTED", "AWAITING_FINALIZATION", "DISPUTED"].includes(handover.status)) {
          await tx.update(handoverRequestsTable).set({ status: "EXPIRED", updated_at: now })
            .where(eq(handoverRequestsTable.id, handover.id));
        }
        await tx.insert(conversationMessagesTable).values({
          conversation_id: conversation.id,
          sender_id: null,
          sender_name: "Athar AI Assistant",
          message_type: "SYSTEM",
          message: "The collection deadline passed without a completed pickup. This winning bid was forfeited.",
        });
      }
      await addNotification(tx, previousWinnerId, "AUCTION_STRIKE", banned ? "You are banned from bidding" : "You received a bidding strike",
        banned
          ? `You did not collect the item in time. You now have ${nextStrikes} strikes and have reached the bidding ban limit.`
          : `You did not collect the item in time. Strike ${nextStrikes} of ${settings.strike_limit}.`,
        "/my-bids");

      if (!item) {
        await tx.update(auctionsTable).set({ status: "CANCELLED", cancel_reason: "Found item no longer exists", updated_at: now })
          .where(eq(auctionsTable.id, auction.id));
        return;
      }
      const nextBid = await nextEligibleBid(tx, auction, [previousWinnerId]);
      if (nextBid) {
        const deadline = new Date(now.getTime() + auction.pickup_minutes * 60_000);
        await tx.update(auctionsTable).set({
          winner_id: nextBid.bidder_id,
          highest_bid_id: nextBid.id,
          current_price: nextBid.amount,
          final_price: nextBid.amount,
          pickup_deadline: deadline,
          updated_at: now,
        }).where(eq(auctionsTable.id, auction.id));
        const nextConversation = await createAuctionConversation(tx, auction, nextBid.bidder_id, item, nextBid.amount, now);
        await addNotification(tx, nextBid.bidder_id, "AUCTION_WINNER_OFFER", "The item is offered to you",
          `The previous winner did not collect. You are next at ${nextBid.amount} EGP. Collect before the deadline and pay cash at pickup.`, `/chats/${nextConversation.id}`);
        await addNotification(tx, item.finder_id, "AUCTION_NEXT_WINNER", "The next bidder was offered the item",
          `The next eligible bid is ${nextBid.amount} EGP. Arrange pickup in the chat.`, `/chats/${nextConversation.id}`);
      } else {
        await tx.update(auctionsTable).set({ status: "UNSOLD", pickup_deadline: null, updated_at: now })
          .where(eq(auctionsTable.id, auction.id));
        await openRelist(tx, auction, item, settings, now, { sameStartPrice: true });
      }
    });
  }
};

export const cancelAuctionForOwnerClaim = async (tx, foundItemId) => {
  const activeAuctions = await tx.select().from(auctionsTable).where(and(
    eq(auctionsTable.found_item_id, foundItemId),
    inArray(auctionsTable.status, ACTIVE_AUCTION_STATUSES),
  )).for("update");
  for (const auction of activeAuctions) {
    await tx.update(auctionsTable).set({
      status: "CANCELLED",
      cancel_reason: "Cancelled after the finder accepted an owner claim",
      updated_at: new Date(),
    }).where(eq(auctionsTable.id, auction.id));
    await closeAuctionConversations(
      tx,
      auction,
      new Date(),
      "This auction chat was closed because the finder accepted an ownership claim. The owner claim has priority.",
    );
    const bidders = await tx.select({ bidder_id: bidsTable.bidder_id }).from(bidsTable)
      .where(eq(bidsTable.auction_id, auction.id));
    for (const bidderId of new Set(bidders.map((row) => row.bidder_id))) {
      await addNotification(tx, bidderId, "AUCTION_CANCELLED", "Auction cancelled: owner claim accepted",
        "The finder accepted an ownership claim, so the item is no longer for sale.", `/auctions/${auction.id}`);
    }
  }
  await tx.update(foundItemsTable).set({ auction_notice_at: null, updated_at: new Date() })
    .where(eq(foundItemsTable.id, foundItemId));
};

export const adminCancelAuction = async (auctionId, reason) => {
  requireUuid(auctionId, "auctionId");
  const trimmedReason = typeof reason === "string" ? reason.trim() : "";
  if (!trimmedReason || trimmedReason.length > 500) throw fail("Enter a cancellation reason (up to 500 characters)", 400);
  return db.transaction(async (tx) => {
    const [preview] = await tx.select().from(auctionsTable).where(eq(auctionsTable.id, auctionId)).limit(1);
    if (!preview) throw fail("Auction not found", 404);
    const [item] = await tx.select().from(foundItemsTable)
      .where(eq(foundItemsTable.id, preview.found_item_id)).for("update");
    const [auction] = await tx.select().from(auctionsTable)
      .where(eq(auctionsTable.id, auctionId)).for("update");
    if (!auction) throw fail("Auction not found", 404);
    if (!ACTIVE_AUCTION_STATUSES.includes(auction.status)) throw fail("Only an active auction can be cancelled", 409);
    const now = new Date();
    await tx.update(auctionsTable).set({ status: "CANCELLED", cancel_reason: trimmedReason, updated_at: now })
      .where(eq(auctionsTable.id, auction.id));
    await closeAuctionConversations(tx, auction, now, `This auction chat was closed by an administrator: ${trimmedReason}`);
    if (item) await tx.update(foundItemsTable).set({ status: "FOUND", auction_opt_out: true, auction_notice_at: null, updated_at: now })
      .where(eq(foundItemsTable.id, auction.found_item_id));
    const bidders = await tx.select({ bidder_id: bidsTable.bidder_id }).from(bidsTable)
      .where(eq(bidsTable.auction_id, auction.id));
    for (const bidderId of new Set(bidders.map((row) => row.bidder_id))) {
      await addNotification(tx, bidderId, "AUCTION_CANCELLED", "Auction cancelled by an administrator",
        trimmedReason, `/auctions/${auction.id}`);
    }
    return auction;
  });
};

export const adminSetAuctionReserve = async (auctionId, reservePrice) => {
  requireUuid(auctionId, "auctionId");
  if (reservePrice !== null && (!Number.isSafeInteger(reservePrice) || reservePrice < 1 || reservePrice > 100_000_000)) {
    throw fail("reserve_price must be null or an integer between 1 and 100000000", 400);
  }
  return db.transaction(async (tx) => {
    const [auction] = await tx.select().from(auctionsTable)
      .where(eq(auctionsTable.id, auctionId)).for("update");
    if (!auction) throw fail("Auction not found", 404);
    if (auction.status !== "OPEN") throw fail("Reserve price can only be changed while an auction is open", 409);
    const [updated] = await tx.update(auctionsTable).set({ reserve_price: reservePrice, updated_at: new Date() })
      .where(eq(auctionsTable.id, auction.id)).returning();
    return updated;
  });
};

export const finderWithdraw = async (foundItemId, finderId) => {
  requireUuid(foundItemId, "foundItemId");
  return db.transaction(async (tx) => {
    const [item] = await tx.select().from(foundItemsTable).where(and(
      eq(foundItemsTable.id, foundItemId),
      eq(foundItemsTable.finder_id, finderId),
    )).for("update");
    if (!item) throw fail("Found item not found or you do not own it", 404);
    if (item.status !== "FOUND" || !item.auction_notice_at) {
      throw fail("You can remove an item only after the auction notice and before the auction starts", 409);
    }
    await tx.update(foundItemsTable).set({ auction_opt_out: true, auction_notice_at: null, updated_at: new Date() })
      .where(eq(foundItemsTable.id, item.id));
    return true;
  });
};

export const updateUserBiddingStatus = async (userId, action) => {
  requireUuid(userId, "userId");
  if (!["ADD", "REMOVE", "LIFT_BAN"].includes(action)) throw fail("Action must be ADD, REMOVE or LIFT_BAN", 400);
  const settings = await getSettings();
  return db.transaction(async (tx) => {
    const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, userId)).for("update");
    if (!user || user.role !== "USER") throw fail("User not found", 404);
    const now = new Date();
    const bidStrikes = action === "ADD" ? user.bid_strikes + 1
      : action === "REMOVE" ? Math.max(0, user.bid_strikes - 1)
        : user.bid_strikes;
    const biddingBanned = action === "LIFT_BAN" ? false
      : action === "REMOVE" && bidStrikes < settings.strike_limit ? false
        : user.bidding_banned || (action === "ADD" && bidStrikes >= settings.strike_limit);
    const [updated] = await tx.update(usersTable).set({
      bid_strikes: bidStrikes,
      bidding_banned: biddingBanned,
      updated_at: now,
    }).where(eq(usersTable.id, user.id)).returning({ id: usersTable.id, bid_strikes: usersTable.bid_strikes, bidding_banned: usersTable.bidding_banned });
    await addNotification(tx, user.id, "BIDDING_STATUS", "Your bidding status was updated by an administrator",
      `Bidding strikes: ${updated.bid_strikes}. Bidding ${updated.bidding_banned ? "is banned" : "is allowed"}.`, "/my-bids");
    return updated;
  });
};

export const markNotificationsRead = async (userId, notificationIds) => {
  requireUuid(userId, "userId");
  const conditions = [eq(notificationsTable.user_id, userId), isNull(notificationsTable.read_at)];
  if (Array.isArray(notificationIds)) {
    if (notificationIds.length > 100 || notificationIds.some((id) => typeof id !== "string" || !UUID_PATTERN.test(id))) {
      throw fail("notification_ids must contain up to 100 notification IDs", 400);
    }
    if (notificationIds.length) conditions.push(inArray(notificationsTable.id, notificationIds));
    else return 0;
  }
  const updated = await db.update(notificationsTable).set({ read_at: new Date() })
    .where(and(...conditions)).returning({ id: notificationsTable.id });
  return updated.length;
};


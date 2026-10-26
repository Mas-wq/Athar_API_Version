import "dotenv/config";
import assert from "node:assert/strict";
import { and, eq, inArray } from "drizzle-orm";
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
  lostReportsTable,
  notificationsTable,
  usersTable,
} from "../src/models/index.js";
import {
  cancelAuctionForOwnerClaim,
  adminSetAuctionReserve,
  closeDueAuctions,
  getSettings,
  handleNoShows,
  isExcludedType,
  placeBid,
  runNoticeStep,
  runStartStep,
  updateSettings,
} from "../services/auctionService.js";
import { completeHandoverIfDue } from "../src/controllers/conversation.controller.js";

const check = async (name, action) => {
  await action();
  console.log(`PASS ${name}`);
};

const ids = { users: [], items: [] };
let previousSettings = null;
let activeCheck = "setup";

const makeItem = async (finderId, suffix) => {
  const createdAt = new Date(Date.now() - 60 * 60_000);
  const [item] = await db.insert(foundItemsTable).values({
    item_type: `Smoke test backpack ${suffix}`,
    finder_id: finderId,
    date_found: createdAt,
    location_found: "Smoke test location",
    hidden_details: { label: `private-${suffix}` },
    public_details: { description: "A red fabric backpack" },
    created_at: createdAt,
    updated_at: createdAt,
  }).returning();
  ids.items.push(item.id);
  return item;
};

const makeUser = async (label) => {
  const [user] = await db.insert(usersTable).values({
    email: `auction-smoke-${Date.now()}-${label}@example.invalid`,
    password: "not-a-real-login-password",
    full_name: `Auction Smoke ${label}`,
    role: "USER",
    is_active: true,
    email_verified: true,
  }).returning();
  ids.users.push(user.id);
  return user;
};

const openAuctionFor = async (item, now) => {
  await runNoticeStep(now);
  await db.update(foundItemsTable).set({ auction_notice_at: new Date(now.getTime() - 2 * 60_000) })
    .where(eq(foundItemsTable.id, item.id));
  await runStartStep(now);
  const [auction] = await db.select().from(auctionsTable).where(eq(auctionsTable.found_item_id, item.id))
    .orderBy(auctionsTable.created_at).limit(1);
  assert.ok(auction, "notice should lead to a new auction");
  assert.equal(auction.status, "OPEN");
  return auction;
};

const cleanup = async () => {
  if (ids.items.length) await db.delete(foundItemsTable).where(inArray(foundItemsTable.id, ids.items));
  if (ids.users.length) await db.delete(usersTable).where(inArray(usersTable.id, ids.users));
  if (previousSettings) {
    const settingFields = [
      "waiting_minutes", "notice_minutes", "duration_minutes", "anti_sniping_minutes",
      "start_price", "min_increment", "pickup_minutes", "strike_limit",
      "relist_start_price_percent", "excluded_types", "proceeds_note", "updated_at",
    ];
    const values = Object.fromEntries(settingFields.map((field) => [field, previousSettings[field]]));
    await db.update(auctionSettingsTable).set(values).where(eq(auctionSettingsTable.id, 1));
  } else {
    await db.delete(auctionSettingsTable).where(eq(auctionSettingsTable.id, 1));
  }
};

const main = async () => {
  const [savedSettings] = await db.select().from(auctionSettingsTable)
    .where(eq(auctionSettingsTable.id, 1)).limit(1);
  previousSettings = savedSettings || null;
  await getSettings();
  await updateSettings({
    waiting_minutes: 0,
    notice_minutes: 1,
    duration_minutes: 10,
    anti_sniping_minutes: 10,
    start_price: 50,
    min_increment: 10,
    pickup_minutes: 1,
    strike_limit: 1,
  });
  await check("default excluded keywords are loaded", async () => {
    assert.ok(isExcludedType({ item_type: "Mobile phone", public_details: {} }));
  });

  const finder = await makeUser("finder");
  const topBidder = await makeUser("top-bidder");
  const nextBidder = await makeUser("next-bidder");
  const firstItem = await makeItem(finder.id, "sale");
  const now = new Date();

  activeCheck = "notice and auction start";
  const firstAuction = await openAuctionFor(firstItem, now);
  await check("notice -> start creates an open auction", async () => {
    const [updatedItem] = await db.select().from(foundItemsTable).where(eq(foundItemsTable.id, firstItem.id));
    assert.equal(updatedItem.status, "IN_AUCTION");
    assert.equal(firstAuction.start_price, 50);
    const notice = await db.select().from(notificationsTable).where(and(
      eq(notificationsTable.user_id, finder.id), eq(notificationsTable.type, "AUCTION_NOTICE"),
    ));
    assert.ok(notice.length > 0);
  });

  activeCheck = "bidding and anti-sniping";
  await check("a bid below the minimum is rejected", async () => {
    await assert.rejects(() => placeBid(firstAuction.id, topBidder.id, 49, now), (error) => error.statusCode === 400);
  });
  const firstBid = await placeBid(firstAuction.id, topBidder.id, 50, now);
  await db.update(auctionsTable).set({ ends_at: new Date(now.getTime() + 5 * 60_000) })
    .where(eq(auctionsTable.id, firstAuction.id));
  const secondBid = await placeBid(firstAuction.id, nextBidder.id, 60, now);
  await check("anti-sniping extends the auction by the configured minutes", async () => {
    assert.equal(new Date(secondBid.ends_at).getTime(), now.getTime() + 15 * 60_000);
    assert.ok(firstBid.bid.id);
  });

  activeCheck = "auction close and winner chat";
  await db.update(auctionsTable).set({ ends_at: new Date(Date.now() - 1_000) })
    .where(eq(auctionsTable.id, firstAuction.id));
  await closeDueAuctions(new Date());
  const [closedAuction] = await db.select().from(auctionsTable).where(eq(auctionsTable.id, firstAuction.id));
  const [winnerConversation] = await db.select().from(conversationsTable).where(and(
    eq(conversationsTable.auction_id, firstAuction.id), eq(conversationsTable.claimant_id, nextBidder.id),
  ));
  await check("close -> winner conversation uses the cash-at-pickup flow", async () => {
    assert.equal(closedAuction.status, "AWAITING_PICKUP");
    assert.equal(closedAuction.winner_id, nextBidder.id);
    assert.equal(winnerConversation.kind, "AUCTION");
    const [message] = await db.select().from(conversationMessagesTable)
      .where(eq(conversationMessagesTable.conversation_id, winnerConversation.id));
    assert.match(message.message, /CASH at pickup/);
  });

  activeCheck = "handover completion";
  const oldDate = new Date(Date.now() - 60_000);
  const [handover] = await db.insert(handoverRequestsTable).values({
    conversation_id: winnerConversation.id,
    handover_code: `smoke-${Date.now()}`,
    status: "AWAITING_FINALIZATION",
    meeting_place: "Smoke test public meeting point",
    meeting_at: oldDate,
    expires_at: new Date(Date.now() + 60 * 60_000),
    claimant_confirmed_at: oldDate,
    finder_confirmed_at: oldDate,
    objection_until: oldDate,
  }).returning();
  assert.equal(await completeHandoverIfDue(handover.id), true);
  await check("handover completion marks the auction, item, and conversation SOLD/DELIVERED", async () => {
    const [item] = await db.select().from(foundItemsTable).where(eq(foundItemsTable.id, firstItem.id));
    const [auction] = await db.select().from(auctionsTable).where(eq(auctionsTable.id, firstAuction.id));
    const [conversation] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, winnerConversation.id));
    assert.equal(item.status, "SOLD");
    assert.equal(auction.status, "SOLD");
    assert.equal(conversation.status, "DELIVERED");
  });

  activeCheck = "no-show strike and next bidder";
  const noShowItem = await makeItem(finder.id, "no-show");
  const noShowAuction = await openAuctionFor(noShowItem, new Date());
  await placeBid(noShowAuction.id, nextBidder.id, 50, new Date());
  await placeBid(noShowAuction.id, topBidder.id, 60, new Date());
  await db.update(auctionsTable).set({ ends_at: new Date(Date.now() - 1_000) })
    .where(eq(auctionsTable.id, noShowAuction.id));
  await closeDueAuctions(new Date());
  await db.update(auctionsTable).set({ pickup_deadline: new Date(Date.now() - 1_000) })
    .where(eq(auctionsTable.id, noShowAuction.id));
  await handleNoShows(new Date());
  await check("no-show adds a strike, bans at the limit, and offers the item to the next bidder", async () => {
    const [updatedWinner] = await db.select().from(usersTable).where(eq(usersTable.id, topBidder.id));
    const [auction] = await db.select().from(auctionsTable).where(eq(auctionsTable.id, noShowAuction.id));
    assert.equal(updatedWinner.bid_strikes, 1);
    assert.equal(updatedWinner.bidding_banned, true);
    assert.equal(auction.status, "AWAITING_PICKUP");
    assert.equal(auction.winner_id, nextBidder.id);
    const [forfeited] = await db.select().from(bidsTable).where(and(
      eq(bidsTable.auction_id, noShowAuction.id), eq(bidsTable.bidder_id, topBidder.id),
    ));
    assert.equal(forfeited.status, "FORFEITED");
  });

  activeCheck = "reserve and unsold relisting";
  const relistItem = await makeItem(finder.id, "relist");
  const firstRelistAuction = await openAuctionFor(relistItem, new Date());
  await adminSetAuctionReserve(firstRelistAuction.id, 40);
  await db.update(auctionsTable).set({ ends_at: new Date(Date.now() - 1_000) })
    .where(eq(auctionsTable.id, firstRelistAuction.id));
  await closeDueAuctions(new Date());
  const [secondRelistAuction] = await db.select().from(auctionsTable).where(and(
    eq(auctionsTable.found_item_id, relistItem.id), eq(auctionsTable.relist_count, 1),
  ));
  await check("an unsold auction relists once at the reduced start price and carries its per-auction reserve", async () => {
    assert.equal(secondRelistAuction.status, "OPEN");
    assert.equal(secondRelistAuction.start_price, 25);
    assert.equal(secondRelistAuction.reserve_price, 40);
  });
  await db.update(auctionsTable).set({ ends_at: new Date(Date.now() - 1_000) })
    .where(eq(auctionsTable.id, secondRelistAuction.id));
  await closeDueAuctions(new Date());
  await check("a second unsold auction marks the item unclaimed", async () => {
    const [item] = await db.select().from(foundItemsTable).where(eq(foundItemsTable.id, relistItem.id));
    assert.equal(item.status, "UNCLAIMED");
  });

  activeCheck = "owner claim cancellation";
  const claimItem = await makeItem(finder.id, "owner-claim");
  const claimAuction = await openAuctionFor(claimItem, new Date());
  await placeBid(claimAuction.id, nextBidder.id, 50, new Date());
  await db.transaction(async (tx) => {
    await tx.select().from(foundItemsTable).where(eq(foundItemsTable.id, claimItem.id)).for("update");
    await cancelAuctionForOwnerClaim(tx, claimItem.id);
    await tx.update(foundItemsTable).set({ status: "CLAIMED", updated_at: new Date() })
      .where(eq(foundItemsTable.id, claimItem.id));
  });
  await check("accepted owner claim cancels the auction and keeps the item claimed", async () => {
    const [item] = await db.select().from(foundItemsTable).where(eq(foundItemsTable.id, claimItem.id));
    const [auction] = await db.select().from(auctionsTable).where(eq(auctionsTable.id, claimAuction.id));
    assert.equal(item.status, "CLAIMED");
    assert.equal(auction.status, "CANCELLED");
  });

  activeCheck = "existing claim handover regression";
  const claimOwner = await makeUser("claim-owner");
  const claimFlowItem = await makeItem(finder.id, "claim-flow");
  const [lostReport] = await db.insert(lostReportsTable).values({
    user_id: claimOwner.id,
    item_type: "Smoke test backpack",
    report_details: { description: "A red backpack" },
    date_lost: new Date(Date.now() - 60 * 60_000),
    location_lost: "Smoke test location",
  }).returning();
  await db.update(foundItemsTable).set({ status: "CLAIMED" }).where(eq(foundItemsTable.id, claimFlowItem.id));
  const [claimConversation] = await db.insert(conversationsTable).values({
    lost_report_id: lostReport.id,
    found_item_id: claimFlowItem.id,
    claimant_id: claimOwner.id,
    finder_id: finder.id,
    status: "ACCEPTED",
  }).returning();
  const [claim] = await db.insert(claimsTable).values({
    found_item_id: claimFlowItem.id,
    user_id: claimOwner.id,
    lost_report_id: lostReport.id,
    conversation_id: claimConversation.id,
    claim_details: { smoke_test: true },
    status: "APPROVED",
  }).returning();
  const [claimHandover] = await db.insert(handoverRequestsTable).values({
    conversation_id: claimConversation.id,
    handover_code: `claim-smoke-${Date.now()}`,
    status: "AWAITING_FINALIZATION",
    meeting_place: "Smoke test public meeting point",
    meeting_at: oldDate,
    expires_at: new Date(Date.now() + 60 * 60_000),
    claimant_confirmed_at: oldDate,
    finder_confirmed_at: oldDate,
    objection_until: oldDate,
  }).returning();
  assert.equal(await completeHandoverIfDue(claimHandover.id), true);
  await check("existing claim handover still returns the item and resolves its claim/report", async () => {
    const [item] = await db.select().from(foundItemsTable).where(eq(foundItemsTable.id, claimFlowItem.id));
    const [report] = await db.select().from(lostReportsTable).where(eq(lostReportsTable.id, lostReport.id));
    const [updatedClaim] = await db.select().from(claimsTable).where(eq(claimsTable.id, claim.id));
    const [conversation] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, claimConversation.id));
    assert.equal(item.status, "RETURNED");
    assert.equal(report.status, "RESOLVED");
    assert.equal(updatedClaim.status, "COLLECTED");
    assert.equal(conversation.status, "DELIVERED");
  });
};

try {
  await main();
} catch (error) {
  console.error(`FAIL ${activeCheck}: ${error.message}`);
  process.exitCode = 1;
} finally {
  try {
    await cleanup();
  } catch (error) {
    console.error(`FAIL smoke cleanup: ${error.message}`);
    process.exitCode = 1;
  }
  await db.$client.end();
}

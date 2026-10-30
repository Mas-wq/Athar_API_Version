import { and, desc, eq, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "../index.js";
import {
  claimsTable,
  conversationsTable,
  foundItemsTable,
  lostReportsTable,
  usersTable,
  handoverRequestsTable,
} from "../models/index.js";
import { getConversationMessages } from "../services/chatStore.js";
import { createSystemMessage, createUserConversationMessage } from "../services/conversationMessage.service.js";

const isParticipant = (conversation, userId) =>
  conversation.claimant_id === userId || conversation.finder_id === userId;

const publicDetailsForHandover = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([key, detail]) => !/(secret|hidden|private|password|email|phone|contact|proof|address)/i.test(key) &&
      ["string", "number", "boolean"].includes(typeof detail) && String(detail).trim())
    .slice(0, 6)
    .map(([key, detail]) => [key.slice(0, 24), String(detail).slice(0, 60)]));
};

const makeHandoverQrPayload = (handover, context) => {
  const payload = {
    format: "ATHAR-HANDOVER-V1",
    temporary_code: handover.handover_code,
    found_item: {
      item_type: context.found_item.item_type,
      date_found: context.found_item.date_found,
      location: context.found_item.location_found,
      details: publicDetailsForHandover(context.found_item.public_details),
    },
    handover: {
      meeting_place: handover.meeting_place,
      meeting_at: handover.meeting_at,
      expires_at: handover.expires_at,
    },
  };
  return JSON.stringify({
    ...payload,
    report_number: context.lost_report?.id
      ? `ATH-${String(context.lost_report.id).slice(0, 8).toUpperCase()}`
      : null,
    lost_report: context.lost_report ? {
      item_type: context.lost_report.item_type,
      date_lost: context.lost_report.date_lost,
      location: context.lost_report.location_lost,
      details: publicDetailsForHandover(context.lost_report.report_details),
    } : null,
  });
};

export const listConversations = async (req, res) => {
  try {
    const rows = await db
      .select({
        conversation: conversationsTable,
        item_type: foundItemsTable.item_type,
        item_location: foundItemsTable.location_found,
        item_images: foundItemsTable.image_urls,
        report_number: lostReportsTable.id,
        claimant_name: usersTable.full_name,
      })
      .from(conversationsTable)
      .innerJoin(foundItemsTable, eq(conversationsTable.found_item_id, foundItemsTable.id))
      .leftJoin(lostReportsTable, eq(conversationsTable.lost_report_id, lostReportsTable.id))
      .innerJoin(usersTable, eq(conversationsTable.claimant_id, usersTable.id))
      .where(and(
        or(
          eq(conversationsTable.claimant_id, req.user.id),
          eq(conversationsTable.finder_id, req.user.id),
        ),
        ne(conversationsTable.status, "SUGGESTED"),
      ))
      .orderBy(desc(conversationsTable.updated_at));

    const data = await Promise.all(rows.map(async (row) => {
      const messages = await getConversationMessages(row.conversation.id);
      const lastMessage = messages.at(-1);
      const [counterpart] = await db
        .select({ full_name: usersTable.full_name })
        .from(usersTable)
        .where(eq(usersTable.id, req.user.id === row.conversation.claimant_id
          ? row.conversation.finder_id
          : row.conversation.claimant_id));
      return {
        ...row.conversation,
        item_type: row.item_type,
        item_location: row.item_location,
        item_image: Array.isArray(row.item_images) ? row.item_images[0] : null,
        report_number: row.report_number ? `ATH-${String(row.report_number).slice(0, 8).toUpperCase()}` : null,
        counterpart_name: counterpart?.full_name || "Athar member",
        last_message: lastMessage?.message || "No messages yet",
        last_message_at: lastMessage?.created_at || row.conversation.created_at,
      };
    }));
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Could not load conversations:", error);
    return res.status(error.statusCode || 500).json({ message: error.message || "Could not load chats" });
  }
};

export const getUnreadMessageCount = async (req, res) => {
  try {
    const participantConversations = await db
      .select({
        id: conversationsTable.id,
        claimant_id: conversationsTable.claimant_id,
        claimant_last_read_at: conversationsTable.claimant_last_read_at,
        finder_last_read_at: conversationsTable.finder_last_read_at,
      })
      .from(conversationsTable)
      .where(and(
        or(
          eq(conversationsTable.claimant_id, req.user.id),
          eq(conversationsTable.finder_id, req.user.id),
        ),
        ne(conversationsTable.status, "SUGGESTED"),
      ));

    let unreadCount = 0;
    for (const conversation of participantConversations) {
      const lastReadAt = conversation.claimant_id === req.user.id
        ? conversation.claimant_last_read_at
        : conversation.finder_last_read_at;
      const messages = await getConversationMessages(conversation.id);
      unreadCount += messages.filter((message) => {
        if (message.message_type === "AI_ASSISTANT" || message.sender_id === req.user.id) return false;
        return !lastReadAt || new Date(message.created_at) > new Date(lastReadAt);
      }).length;
    }

    return res.status(200).json({ unread_count: unreadCount });
  } catch (error) {
    console.error("Could not count unread messages:", error);
    return res.status(error.statusCode || 500).json({ message: error.message || "Could not count unread messages" });
  }
};

export const markConversationRead = async (req, res) => {
  try {
    const [conversation] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, req.params.conversationId));
    if (!conversation) return res.status(404).json({ message: "Chat not found" });
    if (!isParticipant(conversation, req.user.id)) {
      return res.status(403).json({ message: "This chat is not yours" });
    }

    const messageId = req.body.message_id;
    const messages = await getConversationMessages(conversation.id);
    const lastVisibleMessage = messageId ? messages.find((message) => message.id === messageId) : null;
    if (messageId && !lastVisibleMessage) {
      return res.status(400).json({ message: "Invalid message" });
    }

    const readAt = lastVisibleMessage?.created_at || new Date();
    if (conversation.claimant_id === req.user.id) {
      await db.update(conversationsTable)
        .set({ claimant_last_read_at: readAt })
        .where(eq(conversationsTable.id, conversation.id));
    } else {
      await db.update(conversationsTable)
        .set({ finder_last_read_at: readAt })
        .where(eq(conversationsTable.id, conversation.id));
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Could not mark chat as read:", error);
    return res.status(error.statusCode || 500).json({ message: error.message || "Could not mark chat as read" });
  }
};

export const getConversation = async (req, res) => {
  try {
    const [conversation] = await db
      .select({
        conversation: conversationsTable,
        lost_report: lostReportsTable,
        found_item: {
          id: foundItemsTable.id,
          item_type: foundItemsTable.item_type,
          location_found: foundItemsTable.location_found,
          public_details: foundItemsTable.public_details,
          image_urls: foundItemsTable.image_urls,
          status: foundItemsTable.status,
        },
      })
      .from(conversationsTable)
      .leftJoin(lostReportsTable, eq(conversationsTable.lost_report_id, lostReportsTable.id))
      .innerJoin(foundItemsTable, eq(conversationsTable.found_item_id, foundItemsTable.id))
      .where(eq(conversationsTable.id, req.params.conversationId));
    if (!conversation) return res.status(404).json({ message: "Chat not found" });
    if (!isParticipant(conversation.conversation, req.user.id)) {
      return res.status(403).json({ message: "This chat is not yours" });
    }

    const [handover] = await db
      .select()
      .from(handoverRequestsTable)
      .where(eq(handoverRequestsTable.conversation_id, conversation.conversation.id));
    if (handover?.status === "REQUESTED" && new Date(handover.expires_at) <= new Date()) {
      await db.update(handoverRequestsTable)
        .set({ status: "EXPIRED", updated_at: new Date() })
        .where(eq(handoverRequestsTable.id, handover.id));
      handover.status = "EXPIRED";
    }
    if (handover) handover.qr_payload = makeHandoverQrPayload(handover, conversation);

    const messages = await getConversationMessages(conversation.conversation.id);
    const [claim] = await db
      .select({
        id: claimsTable.id,
        status: claimsTable.status,
        match_percentage: claimsTable.match_percentage,
        verification_status: sql`COALESCE(${claimsTable.claim_details}->'ai_review'->>'status', 'COMPLETED')`.as("verification_status"),
      })
      .from(claimsTable)
      .where(eq(claimsTable.conversation_id, conversation.conversation.id))
      .orderBy(desc(claimsTable.created_at))
      .limit(1);

    return res.status(200).json({
      success: true,
      data: {
        ...conversation,
        report_number: conversation.lost_report?.id
          ? `ATH-${String(conversation.lost_report.id).slice(0, 8).toUpperCase()}`
          : null,
        messages,
        claim: claim || null,
        handover: handover || null,
        viewer_role: req.user.id === conversation.conversation.claimant_id ? "CLAIMANT" : "FINDER",
      },
    });
  } catch (error) {
    console.error("Could not load conversation:", error);
    return res.status(error.statusCode || 500).json({ message: error.message || "Could not load chat" });
  }
};

export const sendConversationMessage = async (req, res) => {
  try {
    const message = await createUserConversationMessage({
      user: req.user,
      conversationId: req.params.conversationId,
      message: req.body.message,
    });
    return res.status(201).json({ success: true, message });
  } catch (error) {
    console.error("Could not send message:", error);
    return res.status(error.statusCode || 500).json({ message: error.message || "Could not send message" });
  }
};

export const decideClaim = async (req, res) => {
  try {
    const accept = req.body.decision === "ACCEPT";
    if (!accept && req.body.decision !== "REJECT") {
      return res.status(400).json({ message: "Decision must be ACCEPT or REJECT" });
    }
    const [conversation] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, req.params.conversationId));
    if (!conversation) return res.status(404).json({ message: "Chat not found" });
    const legacyFinderReview = conversation.status === "PENDING_FINDER";
    const expectedReviewerId = legacyFinderReview ? conversation.finder_id : conversation.claimant_id;
    if (expectedReviewerId !== req.user.id) {
      return res.status(403).json({ message: legacyFinderReview ? "Only the person who found the item can decide" : "Only the owner of the lost report can decide" });
    }
    if (!legacyFinderReview && conversation.status !== "PENDING_OWNER") {
      return res.status(409).json({ message: "There is no pending request for the lost report owner to review" });
    }

    const [claim] = await db.select().from(claimsTable).where(eq(claimsTable.conversation_id, conversation.id)).orderBy(desc(claimsTable.created_at)).limit(1);
    if (!claim) return res.status(404).json({ message: "Claim not found" });
    if (claim.claim_details?.ai_review?.status === "PENDING") {
      return res.status(409).json({ message: "Athar AI is still calculating the ownership evidence score. Please wait a moment and try again." });
    }

    const systemMessages = [];
    await db.transaction(async (tx) => {
      if (accept) {
        const [lockedFoundItem] = await tx.select().from(foundItemsTable)
          .where(eq(foundItemsTable.id, conversation.found_item_id)).for("update");
        if (!lockedFoundItem || lockedFoundItem.status !== "FOUND") {
          const error = new Error("This found item already has another accepted claim");
          error.statusCode = 409;
          throw error;
        }
        const [reserved] = await tx.update(foundItemsTable)
          .set({ status: "CLAIMED", updated_at: new Date() })
          .where(and(eq(foundItemsTable.id, conversation.found_item_id), eq(foundItemsTable.status, "FOUND")))
          .returning({ id: foundItemsTable.id });
        if (!reserved) throw Object.assign(new Error("This found item already has another accepted claim"), { statusCode: 409 });
        if (conversation.lost_report_id) {
          await tx.update(lostReportsTable).set({ status: "MATCHED", updated_at: new Date() })
            .where(and(eq(lostReportsTable.id, conversation.lost_report_id), eq(lostReportsTable.user_id, conversation.claimant_id)));
        }

        const competing = await tx.select({ id: conversationsTable.id })
          .from(conversationsTable)
          .where(and(
            eq(conversationsTable.found_item_id, conversation.found_item_id),
            ne(conversationsTable.id, conversation.id),
            inArray(conversationsTable.status, ["SUGGESTED", "PENDING_FINDER", "PENDING_OWNER"]),
          ));
        for (const other of competing) {
          await tx.update(conversationsTable)
            .set({ status: "REJECTED", updated_at: new Date() })
            .where(eq(conversationsTable.id, other.id));
          await tx.update(claimsTable)
            .set({ status: "REJECTED", updated_at: new Date() })
            .where(and(eq(claimsTable.conversation_id, other.id), eq(claimsTable.status, "PENDING")));
          systemMessages.push({
            conversationId: other.id,
            message: "Another claim was accepted for this found item, so this specific item is no longer available. Your lost report remains active.",
          });
        }
      }
      await tx.update(claimsTable).set({
        status: accept ? "APPROVED" : "REJECTED",
        approved_at: accept ? new Date() : null,
        updated_at: new Date(),
      }).where(eq(claimsTable.id, claim.id));
      await tx.update(conversationsTable).set({ status: accept ? "ACCEPTED" : "REJECTED", updated_at: new Date() }).where(eq(conversationsTable.id, conversation.id));
      systemMessages.push({
        conversationId: conversation.id,
        message: accept
          ? "Good news! The finder accepted your claim. You can chat here to plan the return."
          : "Sorry, the finder did not accept this claim. Your lost report is still open.",
      });
    });
    await Promise.all(systemMessages.map(({ conversationId, message }) => createSystemMessage(conversationId, message)));
    return res.status(200).json({ success: true, status: accept ? "ACCEPTED" : "REJECTED" });
  } catch (error) {
    console.error("Could not decide claim:", error);
    return res.status(error.statusCode || 500).json({ message: error.message || "Could not update claim" });
  }
};

export const completeHandoverIfDue = async (handoverId) => {
  const [preview] = await db.select({ conversation_id: handoverRequestsTable.conversation_id })
    .from(handoverRequestsTable).where(eq(handoverRequestsTable.id, handoverId));
  if (!preview) return false;
  const [previewConversation] = await db.select({ found_item_id: conversationsTable.found_item_id })
    .from(conversationsTable).where(eq(conversationsTable.id, preview.conversation_id));
  if (!previewConversation) return false;
  let finalized = false;
  await db.transaction(async (tx) => {
    const [item] = await tx.select().from(foundItemsTable)
      .where(eq(foundItemsTable.id, previewConversation.found_item_id)).for("update");
    const [conversation] = await tx.select().from(conversationsTable)
      .where(eq(conversationsTable.id, preview.conversation_id)).for("update");
    const [handover] = await tx.select().from(handoverRequestsTable)
      .where(eq(handoverRequestsTable.id, handoverId)).for("update");
    const now = new Date();
    if (!item || !conversation || conversation.status !== "ACCEPTED" ||
        !handover || handover.status !== "AWAITING_FINALIZATION" ||
        !handover.objection_until || new Date(handover.objection_until) > now) return;

    const [completed] = await tx.update(handoverRequestsTable)
      .set({ status: "COMPLETED", updated_at: now })
      .where(and(eq(handoverRequestsTable.id, handover.id), eq(handoverRequestsTable.status, "AWAITING_FINALIZATION")))
      .returning({ id: handoverRequestsTable.id });
    if (!completed) return;
    finalized = true;
    const [claim] = await tx.select().from(claimsTable)
      .where(eq(claimsTable.conversation_id, conversation.id))
      .orderBy(desc(claimsTable.created_at)).limit(1);
    await tx.update(foundItemsTable).set({ status: "RETURNED", updated_at: now })
      .where(eq(foundItemsTable.id, conversation.found_item_id));
    if (conversation.lost_report_id) await tx.update(lostReportsTable).set({ status: "RESOLVED", updated_at: now })
      .where(eq(lostReportsTable.id, conversation.lost_report_id));
    if (claim) await tx.update(claimsTable).set({ status: "COLLECTED", updated_at: now })
      .where(eq(claimsTable.id, claim.id));
    await tx.update(conversationsTable).set({ status: "DELIVERED", updated_at: now })
      .where(eq(conversationsTable.id, conversation.id));
  });
  if (finalized) {
    await createSystemMessage(preview.conversation_id, "Delivered to owner. Both people confirmed the handover and the objection period ended.");
  }
  return finalized;
};

export const finalizeDueHandovers = async () => {
  const due = await db.select({ id: handoverRequestsTable.id })
    .from(handoverRequestsTable)
    .where(and(
      eq(handoverRequestsTable.status, "AWAITING_FINALIZATION"),
      lt(handoverRequestsTable.objection_until, new Date()),
    ));
  for (const request of due) await completeHandoverIfDue(request.id);
};

export const createHandoverRequest = async (req, res) => {
  try {
    const [conversation] = await db.select().from(conversationsTable)
      .where(eq(conversationsTable.id, req.params.conversationId));
    if (!conversation) return res.status(404).json({ message: "Chat not found" });
    if (!isParticipant(conversation, req.user.id)) return res.status(403).json({ message: "This chat is not yours" });
    if (conversation.status !== "ACCEPTED") return res.status(409).json({ message: "Only an accepted claim can arrange a handover" });

    const meetingPlace = typeof req.body.meeting_place === "string" ? req.body.meeting_place.trim() : "";
    const meetingAt = new Date(req.body.meeting_at);
    if (!meetingPlace || meetingPlace.length > 240 || Number.isNaN(meetingAt.getTime()) || meetingAt <= new Date()) {
      return res.status(400).json({ message: "Enter a public meeting place and a future time" });
    }

    const [existing] = await db.select().from(handoverRequestsTable)
      .where(eq(handoverRequestsTable.conversation_id, conversation.id));
    if (existing && existing.status !== "EXPIRED") {
      return res.status(409).json({ message: "A handover request is already active for this chat" });
    }
    const now = new Date();
    const values = {
      handover_code: randomBytes(6).toString("hex").toUpperCase(),
      status: "REQUESTED",
      meeting_place: meetingPlace,
      meeting_at: meetingAt,
      expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      claimant_confirmed_at: null,
      finder_confirmed_at: null,
      dispute_claimant_confirmed_at: null,
      dispute_finder_confirmed_at: null,
      objection_until: null,
      updated_at: now,
    };
    let handover;
    if (existing) {
      [handover] = await db.update(handoverRequestsTable).set(values)
        .where(eq(handoverRequestsTable.id, existing.id)).returning();
    } else {
      [handover] = await db.insert(handoverRequestsTable)
        .values({ ...values, conversation_id: conversation.id }).returning();
    }
    const [handoverContext] = await db.select({
      conversation: conversationsTable,
      lost_report: lostReportsTable,
      found_item: foundItemsTable,
    })
      .from(conversationsTable)
      .leftJoin(lostReportsTable, eq(conversationsTable.lost_report_id, lostReportsTable.id))
      .innerJoin(foundItemsTable, eq(conversationsTable.found_item_id, foundItemsTable.id))
      .where(eq(conversationsTable.id, conversation.id));
    handover.qr_payload = makeHandoverQrPayload(handover, handoverContext);
    const reportNumber = handoverContext.lost_report?.id
      ? `ATH-${String(handoverContext.lost_report.id).slice(0, 8).toUpperCase()}`
      : "the found-item record";
    const handoverMessage = `A handover plan was created for ${reportNumber}. Meet at ${meetingPlace}. It expires in 24 hours. Both people must scan the QR and confirm separately after meeting.`;
    await createSystemMessage(conversation.id, handoverMessage);
    return res.status(201).json({ success: true, handover });
  } catch (error) {
    console.error("Could not create handover request:", error);
    return res.status(500).json({ message: "Could not create handover request" });
  }
};

export const confirmHandover = async (req, res) => {
  try {
    const [conversation] = await db.select().from(conversationsTable)
      .where(eq(conversationsTable.id, req.params.conversationId));
    if (!conversation) return res.status(404).json({ message: "Chat not found" });
    if (!isParticipant(conversation, req.user.id)) return res.status(403).json({ message: "This chat is not yours" });
    const [handover] = await db.select().from(handoverRequestsTable)
      .where(eq(handoverRequestsTable.conversation_id, conversation.id));
    if (!handover) return res.status(404).json({ message: "Create a handover plan first" });
    if (handover.status === "REQUESTED" && new Date(handover.expires_at) <= new Date()) {
      await db.update(handoverRequestsTable).set({ status: "EXPIRED", updated_at: new Date() })
        .where(eq(handoverRequestsTable.id, handover.id));
      return res.status(409).json({ message: "Handover code expired; create a new plan" });
    }
    if (handover.status !== "REQUESTED") return res.status(409).json({ message: "This handover cannot be confirmed now" });
    if (String(req.body.handover_code || "").trim().toUpperCase() !== handover.handover_code) {
      return res.status(400).json({ message: "Enter the current handover code shown in this chat" });
    }
    const isClaimant = req.user.id === conversation.claimant_id;
    if (handover[isClaimant ? "claimant_confirmed_at" : "finder_confirmed_at"]) {
      return res.status(409).json({ message: "You already confirmed this handover" });
    }
    await db.update(handoverRequestsTable).set({
      [isClaimant ? "claimant_confirmed_at" : "finder_confirmed_at"]: new Date(),
      updated_at: new Date(),
    }).where(and(
      eq(handoverRequestsTable.id, handover.id),
      eq(handoverRequestsTable.status, "REQUESTED"),
    ));
    const [updated] = await db.select().from(handoverRequestsTable)
      .where(eq(handoverRequestsTable.id, handover.id));

    let result = updated;
    if (updated.claimant_confirmed_at && updated.finder_confirmed_at && updated.status === "REQUESTED") {
      const objectionUntil = new Date(Date.now() + 30 * 60 * 1000);
      [result] = await db.update(handoverRequestsTable).set({
        status: "AWAITING_FINALIZATION",
        objection_until: objectionUntil,
        updated_at: new Date(),
      }).where(eq(handoverRequestsTable.id, handover.id)).returning();
      await createSystemMessage(conversation.id, "Both people confirmed the handover. There is a 30-minute review period; report a problem in this chat before it ends.");
    } else {
      await createSystemMessage(conversation.id, "One person confirmed the handover. The other person must confirm from their own account.");
    }
    return res.status(200).json({ success: true, handover: result });
  } catch (error) {
    console.error("Could not confirm handover:", error);
    return res.status(500).json({ message: "Could not confirm handover" });
  }
};

export const disputeHandover = async (req, res) => {
  try {
    const [conversation] = await db.select().from(conversationsTable)
      .where(eq(conversationsTable.id, req.params.conversationId));
    if (!conversation) return res.status(404).json({ message: "Chat not found" });
    if (!isParticipant(conversation, req.user.id)) return res.status(403).json({ message: "This chat is not yours" });
    const [handover] = await db.select().from(handoverRequestsTable)
      .where(eq(handoverRequestsTable.conversation_id, conversation.id));
    if (!handover || !["REQUESTED", "AWAITING_FINALIZATION"].includes(handover.status)) {
      return res.status(409).json({ message: "There is no active handover to dispute" });
    }
    const [updated] = await db.update(handoverRequestsTable).set({
      status: "DISPUTED", updated_at: new Date(),
      dispute_claimant_confirmed_at: null,
      dispute_finder_confirmed_at: null,
    }).where(and(
      eq(handoverRequestsTable.id, handover.id),
      inArray(handoverRequestsTable.status, ["REQUESTED", "AWAITING_FINALIZATION"]),
    )).returning();
    if (!updated) return res.status(409).json({ message: "The handover is no longer active" });
    await createSystemMessage(conversation.id, "A handover problem was reported. Completion is paused until the people involved resolve it.");
    return res.status(200).json({ success: true, handover: updated });
  } catch (error) {
    console.error("Could not report handover issue:", error);
    return res.status(500).json({ message: "Could not report handover issue" });
  }
};

export const resolveHandoverDispute = async (req, res) => {
  try {
    const [conversation] = await db.select().from(conversationsTable)
      .where(eq(conversationsTable.id, req.params.conversationId));
    if (!conversation) return res.status(404).json({ message: "Chat not found" });
    if (!isParticipant(conversation, req.user.id)) return res.status(403).json({ message: "This chat is not yours" });
    const [handover] = await db.select().from(handoverRequestsTable)
      .where(eq(handoverRequestsTable.conversation_id, conversation.id));
    if (!handover || handover.status !== "DISPUTED") {
      return res.status(409).json({ message: "There is no disputed handover to resolve" });
    }

    const isClaimant = String(req.user.id) === String(conversation.claimant_id);
    const confirmationColumn = isClaimant
      ? handoverRequestsTable.dispute_claimant_confirmed_at
      : handoverRequestsTable.dispute_finder_confirmed_at;
    const confirmationField = isClaimant
      ? "dispute_claimant_confirmed_at"
      : "dispute_finder_confirmed_at";
    if (handover[confirmationField]) {
      return res.status(409).json({ message: "You already confirmed that the issue is resolved" });
    }

    const [updated] = await db.update(handoverRequestsTable).set({
      [confirmationField]: new Date(),
      updated_at: new Date(),
    }).where(and(
      eq(handoverRequestsTable.id, handover.id),
      eq(handoverRequestsTable.status, "DISPUTED"),
      isNull(confirmationColumn),
    )).returning();
    if (!updated) return res.status(409).json({ message: "The handover changed; refresh and try again" });

    let result = updated;
    if (updated.dispute_claimant_confirmed_at && updated.dispute_finder_confirmed_at) {
      const now = new Date();
      [result] = await db.update(handoverRequestsTable).set({
        status: "REQUESTED",
        handover_code: randomBytes(6).toString("hex").toUpperCase(),
        expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        claimant_confirmed_at: null,
        finder_confirmed_at: null,
        dispute_claimant_confirmed_at: null,
        dispute_finder_confirmed_at: null,
        objection_until: null,
        updated_at: now,
      }).where(and(
        eq(handoverRequestsTable.id, handover.id),
        eq(handoverRequestsTable.status, "DISPUTED"),
      )).returning();
      await createSystemMessage(conversation.id, "Both people confirmed the handover issue was resolved. The handover has resumed with a new QR code; both people must confirm again after meeting.");
    } else {
      await createSystemMessage(conversation.id, (isClaimant ? "The owner" : "The finder") + " confirmed the handover issue is resolved. Waiting for the other person to agree before resuming.");
    }
    return res.status(200).json({ success: true, handover: result });
  } catch (error) {
    console.error("Could not resolve handover issue:", error);
    return res.status(500).json({ message: "Could not resolve handover issue" });
  }
};

export const markConversationDelivered = async (_req, res) => {
  return res.status(410).json({ message: "Delivery now requires both people to confirm the handover." });
};

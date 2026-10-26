import { db } from "../index.js";
import { eq, desc, and, isNull, lt } from "drizzle-orm";
import {
  lostReportsTable,
  claimsTable,
  claimQuestionSessionsTable,
  foundItemsTable,
  conversationsTable,
  conversationMessagesTable,
  itemMatchesTable,
} from "../models/index.js";

import { enqueueAiJob } from "../../services/aiJobService.js";
import { generateClaimOwnershipQuestions } from "../../services/matchingService.js";
import { addFoundItem } from "./foundItem.controller.js";

export { addFoundItem };

const reportNumber = (id) => `ATH-${String(id).slice(0, 8).toUpperCase()}`;

const normalizeAnswer = (value) => String(value || "")
  .normalize("NFKC")
  .toLocaleLowerCase()
  .replace(/[أإآ]/g, "ا")
  .replace(/ى/g, "ي")
  .replace(/ة/g, "ه")
  .match(/[\p{L}\p{N}]+/gu)?.join(" ") || "";

const scoreOwnershipAnswer = (answer, expectedAnswer, acceptedAnswers = []) => {
  const normalizedAnswer = normalizeAnswer(answer);
  if (!normalizedAnswer) return 0;
  const candidates = [...new Set([expectedAnswer, ...(Array.isArray(acceptedAnswers) ? acceptedAnswers : [])])]
    .map(normalizeAnswer)
    .filter(Boolean);
  if (candidates.includes(normalizedAnswer)) return 100;

  const answerTokens = new Set(normalizedAnswer.split(/\s+/).filter(Boolean));
  let bestScore = 0;
  for (const candidate of candidates) {
    const expectedTokens = new Set(candidate.split(/\s+/).filter(Boolean));
    const overlap = [...answerTokens].filter((token) => expectedTokens.has(token)).length;
    const score = answerTokens.size + expectedTokens.size
      ? Math.round((2 * overlap / (answerTokens.size + expectedTokens.size)) * 100)
      : 0;
    bestScore = Math.max(bestScore, score);
  }
  return bestScore;
};

const coerceToObject = (value) => {
  if (value && typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : null;
    } catch (err) {
      return null;
    }
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  return null;
};

export const reportLostItem = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id)
      return res.status(401).json({ message: "Your are not logged in" });

    const { item_type, report_details, date_lost, location_lost, image_urls } =
      req.body;

    // Insert new lost report
    if (!item_type || !report_details || !date_lost || !location_lost) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const reportDetailsObj = coerceToObject(report_details);
    if (!reportDetailsObj) {
      return res.status(400).json({ message: "Invalid report details format" });
    }

    // Parse date_lost ISO string to Date object
    const parsedDate = new Date(date_lost);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Invalid date_lost format" });
    }

    // Ensure image_urls is an array
    const imageUrls = Array.isArray(image_urls) ? image_urls : [];

    const newReport = await db.transaction(async (tx) => {
      const [created] = await tx.insert(lostReportsTable).values({
        user_id,
        item_type,
        report_details: reportDetailsObj,
        date_lost: parsedDate,
        location_lost,
        image_urls: imageUrls,
        status: "OPEN",
        created_at: new Date(),
        updated_at: new Date(),
      }).returning();
      await enqueueAiJob(tx, "MATCH_LOST_REPORT", { lost_report_id: created.id }, `match-report:${created.id}`);
      return created;
    });

    return res.status(201).json({
      message: "Lost item reported successfully. Athar AI is checking found items in the background.",
      report: { ...newReport, report_number: reportNumber(newReport.id) },
      matching_status: "PROCESSING",
    });
  } catch (error) {
    console.error("Error reporting lost item:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMyReports = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id)
      return res.status(401).json({ message: "You are not logged in" });

    const reports = await db
      .select()
      .from(lostReportsTable)
      .where(eq(lostReportsTable.user_id, user_id))
      .orderBy(desc(lostReportsTable.created_at));

    const lostReports = reports.map((report) => ({
      ...report,
      report_number: reportNumber(report.id),
    }));

    res.status(200).json({ lostReports });
  } catch (error) {
    console.error("Error fetching user lost reports:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMyReportDetails = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ message: "Unauthorized" });

    const reportId = req.params.id;
    if (!reportId || typeof reportId !== "string") {
      return res.status(400).json({ message: "Invalid report ID" });
    }

    const lostReport = await db
      .select()
      .from(lostReportsTable)
      .where(
        and(
          eq(lostReportsTable.id, reportId),
          eq(lostReportsTable.user_id, user_id)
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!lostReport) {
      return res.status(404).json({ message: "Lost report not found" });
    }

    res.status(200).json({ lostReport });
  } catch (error) {
    console.error("Error fetching lost report details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateMyReport = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ message: "Unauthorized" });

    const reportId = req.params.id;
    if (!reportId || typeof reportId !== "string") {
      return res.status(400).json({ message: "Invalid report ID" });
    }

    const { item_type, report_details, date_lost, location_lost, image_urls } =
      req.body;

    const existingReport = await db
      .select()
      .from(lostReportsTable)
      .where(
        and(
          eq(lostReportsTable.id, reportId),
          eq(lostReportsTable.user_id, user_id)
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!existingReport) {
      return res.status(404).json({ message: "Lost report not found" });
    }

    if (existingReport.status !== "OPEN") {
      return res.status(400).json({
        message: "Cannot edit a report that is already resolved or matched.",
      });
    }

    const updatedFields = {};

    if (item_type) updatedFields.item_type = item_type;

    if (report_details) {
      const reportDetailsObj = coerceToObject(report_details);
      if (!reportDetailsObj) {
        return res
          .status(400)
          .json({ message: "Invalid report details format" });
      }
      updatedFields.report_details = reportDetailsObj;
    }

    if (date_lost) {
      const parsedDate = new Date(date_lost);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: "Invalid date_lost format" });
      }
      updatedFields.date_lost = parsedDate;
    }

    if (location_lost) updatedFields.location_lost = location_lost;

    if (image_urls) {
      updatedFields.image_urls = Array.isArray(image_urls) ? image_urls : [];
    }

    updatedFields.updated_at = new Date();

    const [updatedReport] = await db
      .update(lostReportsTable)
      .set(updatedFields)
      .where(
        and(
          eq(lostReportsTable.id, reportId),
          eq(lostReportsTable.user_id, user_id)
        )
      )
      .returning();

    res.status(200).json({
      message: "Lost report updated successfully",
      report: updatedReport,
    });
  } catch (error) {
    console.error("Error updating lost report:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteMyReport = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ message: "Unauthorized" });

    const reportId = req.params.id;
    if (!reportId || typeof reportId !== "string") {
      return res.status(400).json({ message: "Invalid report ID" });
    }

    const existingReport = await db
      .select()
      .from(lostReportsTable)
      .where(
        and(
          eq(lostReportsTable.id, reportId),
          eq(lostReportsTable.user_id, user_id)
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!existingReport) {
      return res.status(404).json({ message: "Lost report not found" });
    }

    await db
      .delete(lostReportsTable)
      .where(
        and(
          eq(lostReportsTable.id, reportId),
          eq(lostReportsTable.user_id, user_id)
        )
      );

    res.status(200).json({ message: "Lost report deleted successfully" });
  } catch (error) {
    console.error("Error deleting lost report:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createClaimQuestionSession = async (req, res) => {
  try {
    const user_id = req.user?.id;
    const foundItemId = req.params.id;
    const { lost_report_id } = req.body || {};
    if (!user_id) return res.status(401).json({ message: "Sign in to continue" });
    if (!lost_report_id) return res.status(400).json({ message: "Choose the lost report this claim belongs to" });

    const [item] = await db.select().from(foundItemsTable).where(eq(foundItemsTable.id, foundItemId)).limit(1);
    if (!item) return res.status(404).json({ message: "Item not found" });
    if (!["FOUND", "IN_AUCTION"].includes(item.status)) return res.status(409).json({ message: "This item is no longer available to claim" });
    const [report] = await db.select().from(lostReportsTable).where(and(
      eq(lostReportsTable.id, lost_report_id),
      eq(lostReportsTable.user_id, user_id),
    )).limit(1);
    if (!report) return res.status(404).json({ message: "Your lost report was not found" });
    if (report.status !== "OPEN") return res.status(409).json({ message: "This lost report is not open" });
    if (String(report.user_id) === String(item.finder_id)) {
      return res.status(409).json({ message: "You cannot claim an item that you uploaded" });
    }

    await db.delete(claimQuestionSessionsTable).where(and(
      eq(claimQuestionSessionsTable.user_id, user_id),
      lt(claimQuestionSessionsTable.expires_at, new Date()),
    ));
    const [existing] = await db.select().from(claimQuestionSessionsTable).where(and(
      eq(claimQuestionSessionsTable.user_id, user_id),
      eq(claimQuestionSessionsTable.found_item_id, item.id),
      eq(claimQuestionSessionsTable.lost_report_id, report.id),
      isNull(claimQuestionSessionsTable.used_at),
    )).orderBy(desc(claimQuestionSessionsTable.created_at)).limit(1);
    if (existing && new Date(existing.expires_at).getTime() > Date.now()) {
      return res.status(200).json({
        session_id: existing.id,
        expires_at: existing.expires_at,
        questions: (existing.questions || []).map(({ id, question, category }) => ({ id, question, category })),
      });
    }

    const questions = await generateClaimOwnershipQuestions({
      itemType: item.item_type,
      publicDetails: item.public_details,
      image: item.image_urls,
    });
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const [session] = await db.insert(claimQuestionSessionsTable).values({
      user_id,
      found_item_id: item.id,
      lost_report_id: report.id,
      questions,
      expires_at: expiresAt,
    }).returning();
    return res.status(201).json({
      session_id: session.id,
      expires_at: session.expires_at,
      questions: questions.map(({ id, question, category }) => ({ id, question, category })),
    });
  } catch (error) {
    console.error("Claim question generation failed:", error);
    return res.status(error.statusCode || 500).json({ message: error.message || "Could not prepare ownership questions" });
  }
};

export const myClaimSubmit = async (req, res) => {
  try {
    const user_id = req.user?.id;
    const claimedItemId = req.params.id;
    const { question_session_id, answers, image_urls, lost_report_id } = req.body || {};
    if (!user_id) return res.status(401).json({ message: "Sign in to submit a claim" });

    const [item] = await db.select().from(foundItemsTable).where(eq(foundItemsTable.id, claimedItemId)).limit(1);
    if (!item) return res.status(404).json({ message: "Item not found" });
    if (!["FOUND", "IN_AUCTION"].includes(item.status)) return res.status(409).json({ message: "This item is no longer available to claim" });
    if (!lost_report_id) return res.status(400).json({ message: "Choose the lost report this claim belongs to" });
    const [report] = await db.select().from(lostReportsTable).where(and(
      eq(lostReportsTable.id, lost_report_id),
      eq(lostReportsTable.user_id, user_id),
    )).limit(1);
    if (!report) return res.status(404).json({ message: "Your lost report was not found" });
    if (report.status !== "OPEN") return res.status(409).json({ message: "This lost report already has an active or completed claim" });
    if (String(report.user_id) === String(item.finder_id)) {
      return res.status(409).json({ message: "You cannot claim a found item that you uploaded. Sign in as the owner of the lost report." });
    }

    const [session] = question_session_id ? await db.select().from(claimQuestionSessionsTable).where(and(
      eq(claimQuestionSessionsTable.id, question_session_id),
      eq(claimQuestionSessionsTable.user_id, user_id),
      eq(claimQuestionSessionsTable.found_item_id, item.id),
      eq(claimQuestionSessionsTable.lost_report_id, report.id),
      isNull(claimQuestionSessionsTable.used_at),
    )).limit(1) : [];
    if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
      return res.status(409).json({ message: "Your AI questions expired. Generate a fresh set and answer them again." });
    }
    const questionList = Array.isArray(session.questions) ? session.questions : [];
    const submittedAnswers = Array.isArray(answers) ? answers : [];
    const answersById = new Map(submittedAnswers.map((entry) => [String(entry?.question_id || ""), String(entry?.answer || "").trim()]));
    if (answersById.size !== questionList.length || questionList.some((question) => !answersById.get(question.id))) {
      return res.status(400).json({ message: "Answer every AI ownership question before submitting" });
    }

    const ownershipQuestions = questionList.map((question) => {
      const answer = answersById.get(question.id).slice(0, 1000);
      return {
        id: question.id,
        question: question.question,
        category: question.category,
        answer,
        expected_answer: question.expected_answer,
        accepted_answers: question.accepted_answers || [question.expected_answer],
        answer_score: scoreOwnershipAnswer(answer, question.expected_answer, question.accepted_answers),
      };
    });
    const questionScore = Math.round(ownershipQuestions.reduce((sum, entry) => sum + entry.answer_score, 0) / ownershipQuestions.length);
    const [savedMatch] = await db.select({ match_score: itemMatchesTable.match_score })
      .from(itemMatchesTable)
      .where(and(
        eq(itemMatchesTable.lost_report_id, report.id),
        eq(itemMatchesTable.found_item_id, item.id),
      )).limit(1);

    const submission = await db.transaction(async (tx) => {
      const [lockedItem] = await tx.select().from(foundItemsTable)
        .where(eq(foundItemsTable.id, item.id)).for("update");
      if (!lockedItem || !["FOUND", "IN_AUCTION"].includes(lockedItem.status)) {
        throw Object.assign(new Error("This item is no longer available to claim"), { statusCode: 409 });
      }
      const [lockedSession] = await tx.select().from(claimQuestionSessionsTable)
        .where(eq(claimQuestionSessionsTable.id, session.id)).limit(1).for("update");
      if (!lockedSession || lockedSession.used_at || new Date(lockedSession.expires_at).getTime() <= Date.now()) {
        throw Object.assign(new Error("Your AI questions expired. Generate a fresh set and answer them again."), { statusCode: 409 });
      }

      let [conversation] = await tx.select().from(conversationsTable).where(and(
        eq(conversationsTable.lost_report_id, report.id),
        eq(conversationsTable.found_item_id, item.id),
      )).limit(1);
      if (!conversation) {
        [conversation] = await tx.insert(conversationsTable).values({
          lost_report_id: report.id,
          found_item_id: item.id,
          claimant_id: report.user_id,
          finder_id: item.finder_id,
          match_percentage: savedMatch?.match_score ?? -1,
          status: "SUGGESTED",
        }).onConflictDoNothing().returning();
        if (!conversation) {
          [conversation] = await tx.select().from(conversationsTable).where(and(
            eq(conversationsTable.lost_report_id, report.id),
            eq(conversationsTable.found_item_id, item.id),
          )).limit(1);
        }
      }
      if (!conversation) throw Object.assign(new Error("Could not create a chat for this claim"), { statusCode: 503 });
      if (conversation.status !== "SUGGESTED") return { conflict: true };

      const [claim] = await tx.insert(claimsTable).values({
        user_id,
        found_item_id: claimedItemId,
        lost_report_id: report.id,
        conversation_id: conversation.id,
        claim_details: {
          ownership_questions: ownershipQuestions,
          question_score: questionScore,
          item_snapshot: item.public_details,
          ai_review: {
            status: "COMPLETED",
            method: "AI-generated questions with backend answer scoring",
            question_score: questionScore,
            question_count: ownershipQuestions.length,
          },
        },
        image_urls: Array.isArray(image_urls) ? image_urls : [],
        match_percentage: questionScore,
        status: "PENDING",
      }).returning();

      await tx.update(foundItemsTable).set({ auction_notice_at: null, updated_at: new Date() })
        .where(eq(foundItemsTable.id, item.id));

      await tx.update(claimQuestionSessionsTable).set({ used_at: new Date() })
        .where(eq(claimQuestionSessionsTable.id, lockedSession.id));
      await tx.update(conversationsTable).set({ status: "PENDING_FINDER", updated_at: new Date() })
        .where(eq(conversationsTable.id, conversation.id));
      await tx.insert(conversationMessagesTable).values({
        conversation_id: conversation.id,
        sender_id: user_id,
        sender_name: "Claimant",
        message_type: "SYSTEM",
        message: `A claim was submitted for lost report ${reportNumber(report.id)}. The ownership answers scored ${questionScore}%; the finder can review each answer and make the final decision.`,
      });
      if (!savedMatch) {
        await enqueueAiJob(tx, "MATCH_PAIR", {
          lost_report_id: report.id,
          found_item_id: item.id,
        }, `match-pair:${report.id}:${item.id}`);
      }
      return { claim };
    });

    if (submission.conflict) {
      return res.status(409).json({ message: "A claim for this report and found item is already in progress" });
    }
    return res.status(201).json({ success: true, matching_status: "COMPLETED", claim: submission.claim });
  } catch (error) {
    console.error("Claim Submission Error:", error);
    return res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
  }
};

export const getMyClaims = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ message: "Unauthorized" });

    // 1. Fetch claims with a join, but select ONLY safe columns from foundItemsTable
    const claims = await db
      .select({
        claim_id: claimsTable.id,
        conversation_id: claimsTable.conversation_id,
        report_id: claimsTable.lost_report_id,
        status: claimsTable.status,
        match_percentage: claimsTable.match_percentage,
        claim_details: claimsTable.claim_details,
        created_at: claimsTable.created_at,
        // Only public info from the item
        item_type: foundItemsTable.item_type,
        item_images: foundItemsTable.image_urls,
        item_location: foundItemsTable.location_found,
      })
      .from(claimsTable)
      .leftJoin(
        foundItemsTable,
        eq(claimsTable.found_item_id, foundItemsTable.id)
      )
      .where(eq(claimsTable.user_id, user_id))
      .orderBy(desc(claimsTable.created_at));

    // 2. Format the data for a clean Frontend experience
    const defaultImage = "https://placehold.co/150x150?text=No+Image";

    const formattedClaims = claims.map((row) => ({
      id: row.claim_id,
      conversation_id: row.conversation_id,
      report_number: row.report_id ? reportNumber(row.report_id) : null,
      item_name: row.item_type || "Unknown Item",
      location: row.item_location || "N/A",
      // Use the first image from the found item as the thumbnail
      thumbnail:
        Array.isArray(row.item_images) && row.item_images.length > 0
          ? row.item_images[0]
          : defaultImage,
      status: row.status,
      match_score: row.match_percentage,
      verification_status: row.claim_details?.ai_review?.status || "COMPLETED",
      date_submitted: row.created_at,
    }));

    return res.status(200).json({
      success: true,
      count: formattedClaims.length,
      claims: formattedClaims,
    });
  } catch (error) {
    console.error("Error fetching user claims:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMyClaimDetails = async (req, res) => {
  try {
    const user_id = req.user?.id;
    const claimId = req.params.id;

    // Allow the claimant and the other conversation participant to review the
    // submitted proof. Keep the found item's private verification details out.
    const [result] = await db
      .select({
        claim: claimsTable,
        item_type: foundItemsTable.item_type,
        location_found: foundItemsTable.location_found,
        date_found: foundItemsTable.date_found,
        public_details: foundItemsTable.public_details,
        item_images: foundItemsTable.image_urls,
        conversation: {
          claimant_id: conversationsTable.claimant_id,
          finder_id: conversationsTable.finder_id,
        },
      })
      .from(claimsTable)
      .leftJoin(
        foundItemsTable,
        eq(claimsTable.found_item_id, foundItemsTable.id)
      )
      .leftJoin(
        conversationsTable,
        eq(claimsTable.conversation_id, conversationsTable.id)
      )
      .where(eq(claimsTable.id, claimId));

    const isClaimOwner = result && String(result.claim.user_id) === String(user_id);
    const isConversationParticipant = result?.conversation && [
      result.conversation.claimant_id,
      result.conversation.finder_id,
    ].some((participantId) => String(participantId) === String(user_id));

    if (!result || (!isClaimOwner && !isConversationParticipant)) {
      return res.status(404).json({ message: "Claim not found" });
    }

    const claimDetails = result.claim.claim_details || {};
    const safeClaimDetails = isClaimOwner && Array.isArray(claimDetails.ownership_questions)
      ? {
          ...claimDetails,
          ownership_questions: claimDetails.ownership_questions.map(({ expected_answer, accepted_answers, ...question }) => question),
        }
      : claimDetails;

    // 2. Return a structured response
    // We group item info together so the frontend can easily display it
    return res.status(200).json({
      success: true,
      claim: {
        ...result.claim,
        claim_details: safeClaimDetails,
        item_info: {
          type: result.item_type,
          location: result.location_found,
          date: result.date_found,
          public_details: result.public_details,
          images: result.item_images,
        },
        viewer_role: isClaimOwner ? "CLAIMANT" : "FINDER",
      },
    });
  } catch (error) {
    console.error("Error fetching claim details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteMyClaim = async (req, res) => {
  try {
    const user_id = req.user?.id;
    const claimId = req.params.id;

    // 1. Fetch the claim and verify ownership
    const [existingClaim] = await db
      .select()
      .from(claimsTable)
      .where(
        and(eq(claimsTable.id, claimId), eq(claimsTable.user_id, user_id))
      );

    if (!existingClaim) {
      return res
        .status(404)
        .json({ message: "Claim not found or unauthorized" });
    }

    // Keep the claim record once the finder has decided.
    if (existingClaim.status !== "PENDING") {
      return res.status(400).json({
        message: `You cannot delete a claim that has already been ${existingClaim.status.toLowerCase()}.`,
      });
    }

    // 3. Perform the deletion
    await db.transaction(async (tx) => {
      if (existingClaim.conversation_id) {
        await tx.update(conversationsTable)
          .set({ status: "SUGGESTED", updated_at: new Date() })
          .where(eq(conversationsTable.id, existingClaim.conversation_id));
        await tx.insert(conversationMessagesTable).values({
          conversation_id: existingClaim.conversation_id,
          sender_id: null,
          sender_name: "Athar AI Assistant",
          message_type: "SYSTEM",
          message: "The claimant withdrew this claim. The lost report remains open.",
        });
      }
      await tx.delete(claimsTable).where(eq(claimsTable.id, claimId));
    });

    return res.status(200).json({
      message: "Claim cancelled successfully.",
    });
  } catch (error) {
    console.error("Error deleting claim:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

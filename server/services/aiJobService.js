import { and, asc, eq, ilike, inArray, lt, lte } from "drizzle-orm";
import { db } from "../src/index.js";
import {
  aiProcessingJobsTable,
  claimsTable,
  conversationMessagesTable,
  conversationsTable,
  foundItemsTable,
  lostReportsTable,
} from "../src/models/index.js";
import { runAutoMatch, runAutoMatchForLostReport, runAutoMatchPair } from "./autoMatchService.js";
import { getMatchScore } from "./matchingService.js";

const MAX_ATTEMPTS = 5;
let isPumping = false;

export const recoverGroqAuthFailures = async () => {
  const failedJobs = await db.select().from(aiProcessingJobsTable).where(and(
    inArray(aiProcessingJobsTable.status, ["QUEUED", "FAILED"]),
    ilike(aiProcessingJobsTable.last_error, "%invalid api key%"),
  ));
  for (const job of failedJobs) {
    await db.transaction(async (tx) => {
      await tx.update(aiProcessingJobsTable).set({
        status: "QUEUED",
        attempts: 0,
        available_at: new Date(),
        updated_at: new Date(),
        last_error: null,
      }).where(eq(aiProcessingJobsTable.id, job.id));
      if (job.job_type === "VERIFY_CLAIM") {
        const claimId = job.payload?.claim_id;
        const [claim] = claimId
          ? await tx.select().from(claimsTable).where(eq(claimsTable.id, claimId)).limit(1)
          : [];
        if (claim?.claim_details?.ai_review?.status === "FAILED") {
          await tx.update(claimsTable).set({
            claim_details: { ...(claim.claim_details || {}), ai_review: { status: "PENDING" } },
            updated_at: new Date(),
          }).where(eq(claimsTable.id, claim.id));
        }
      }
    });
  }
  if (failedJobs.length) console.log(`Re-queued ${failedJobs.length} AI job(s) after a previous Groq API key rejection.`);
};

export const enqueueAiJob = async (executor, jobType, payload, dedupeKey) => {
  await executor.insert(aiProcessingJobsTable).values({
    job_type: jobType,
    payload,
    dedupe_key: dedupeKey,
    status: "QUEUED",
    attempts: 0,
    available_at: new Date(),
    updated_at: new Date(),
  }).onConflictDoNothing();
};

const claimNextJob = async () => db.transaction(async (tx) => {
  const [job] = await tx.select().from(aiProcessingJobsTable)
    .where(and(
      eq(aiProcessingJobsTable.status, "QUEUED"),
      lte(aiProcessingJobsTable.available_at, new Date()),
    ))
    .orderBy(asc(aiProcessingJobsTable.available_at), asc(aiProcessingJobsTable.created_at))
    .limit(1)
    .for("update", { skipLocked: true });
  if (!job) return null;
  const [claimed] = await tx.update(aiProcessingJobsTable)
    .set({ status: "PROCESSING", attempts: job.attempts + 1, updated_at: new Date(), last_error: null })
    .where(eq(aiProcessingJobsTable.id, job.id))
    .returning();
  return claimed;
});

const completeClaimVerification = async (claimId) => {
  const [claim] = await db.select().from(claimsTable).where(eq(claimsTable.id, claimId)).limit(1);
  if (!claim || claim.claim_details?.ai_review?.status === "COMPLETED") return;

  const item = await db.select().from(foundItemsTable)
    .where(eq(foundItemsTable.id, claim.found_item_id)).limit(1).then((rows) => rows[0]);
  if (!item) return;

  const includePrivateClaimDetails = process.env.GROQ_INCLUDE_PRIVATE_CLAIM_DETAILS === "true";
  const comparison = await getMatchScore(
    claim.claim_details?.user_proof || {},
    includePrivateClaimDetails ? item.hidden_details : item.public_details,
    { firstImage: claim.image_urls, secondImage: item.image_urls },
  );
  const score = Number.isFinite(comparison.visual_percentage)
    ? Math.round(comparison.percentage * 0.75 + comparison.visual_percentage * 0.25)
    : comparison.percentage;

  await db.transaction(async (tx) => {
    const [current] = await tx.select().from(claimsTable).where(eq(claimsTable.id, claim.id)).limit(1);
    if (!current || current.claim_details?.ai_review?.status === "COMPLETED") return;
    const nextDetails = {
      ...(current.claim_details || {}),
      ai_review: {
        status: "COMPLETED",
        text_similarity: comparison.percentage,
        visual_similarity: comparison.visual_percentage,
        visual_status: comparison.visual_status,
        visual_observations: comparison.visual_observations,
        vision_model: comparison.vision_model,
        text_comparison_scope: includePrivateClaimDetails ? "private_verification_details" : "public_item_details",
      },
    };
    await tx.update(claimsTable).set({
      claim_details: nextDetails,
      match_percentage: score,
      updated_at: new Date(),
    }).where(eq(claimsTable.id, current.id));
    if (current.conversation_id) {
      await tx.insert(conversationMessagesTable).values({
        conversation_id: current.conversation_id,
        sender_id: null,
        sender_name: "Athar AI Assistant",
        message_type: "SYSTEM",
        message: `Athar AI completed the ownership evidence check: ${score}%. This is a similarity score; the finder makes the final decision.`,
      });
    }
  });
};

const markClaimVerificationFailed = async (claimId, errorMessage) => {
  await db.transaction(async (tx) => {
    const [claim] = await tx.select().from(claimsTable).where(eq(claimsTable.id, claimId)).limit(1);
    if (!claim || claim.claim_details?.ai_review?.status === "COMPLETED") return;
    await tx.update(claimsTable).set({
      claim_details: {
        ...(claim.claim_details || {}),
        ai_review: { status: "FAILED", message: "AI could not calculate the score. The finder can still review the claim." },
      },
      updated_at: new Date(),
    }).where(eq(claimsTable.id, claim.id));
    if (claim.conversation_id) {
      await tx.insert(conversationMessagesTable).values({
        conversation_id: claim.conversation_id,
        sender_id: null,
        sender_name: "Athar AI Assistant",
        message_type: "SYSTEM",
        message: "Athar AI could not calculate the ownership evidence score. The claim is saved and the finder can still review it.",
      });
    }
  });
  console.error("Ownership verification job failed permanently:", errorMessage);
};

const processJob = async (job) => {
  const payload = job.payload || {};
  if (job.job_type === "MATCH_FOUND_ITEM") {
    const item = await db.select().from(foundItemsTable)
      .where(eq(foundItemsTable.id, payload.found_item_id)).limit(1).then((rows) => rows[0]);
    if (item) await runAutoMatch(item);
    return;
  }
  if (job.job_type === "MATCH_PAIR") {
    const [report] = await db.select().from(lostReportsTable)
      .where(eq(lostReportsTable.id, payload.lost_report_id)).limit(1);
    const [item] = await db.select().from(foundItemsTable)
      .where(eq(foundItemsTable.id, payload.found_item_id)).limit(1);
    if (report && item) await runAutoMatchPair(report, item);
    return;
  }
  if (job.job_type === "MATCH_LOST_REPORT") {
    const report = await db.select().from(lostReportsTable)
      .where(eq(lostReportsTable.id, payload.lost_report_id)).limit(1).then((rows) => rows[0]);
    if (report) await runAutoMatchForLostReport(report);
    return;
  }
  if (job.job_type === "VERIFY_CLAIM") {
    await completeClaimVerification(payload.claim_id);
    return;
  }
  throw new Error(`Unknown AI job type: ${job.job_type}`);
};

export const processAiJobQueue = async () => {
  if (isPumping) return;
  isPumping = true;
  try {
    // Re-queue work left processing if the server stopped during an API request.
    const staleBefore = new Date(Date.now() - 5 * 60 * 1000);
    await db.update(aiProcessingJobsTable)
      .set({ status: "QUEUED", available_at: new Date(), updated_at: new Date() })
      .where(and(eq(aiProcessingJobsTable.status, "PROCESSING"), lt(aiProcessingJobsTable.updated_at, staleBefore)));

    // Serial processing keeps free-tier verification usage and provider load predictable.
    for (let i = 0; i < 2; i += 1) {
      const job = await claimNextJob();
      if (!job) break;
      try {
        await processJob(job);
        await db.update(aiProcessingJobsTable)
          .set({ status: "COMPLETED", updated_at: new Date(), last_error: null })
          .where(eq(aiProcessingJobsTable.id, job.id));
      } catch (error) {
        const message = String(error?.message || "AI background job failed").slice(0, 1000);
        const rejectedApiKey = error?.code === "GROQ_INVALID_API_KEY" || [401, 403].includes(Number(error?.statusCode));
        const isFinalAttempt = rejectedApiKey || job.attempts >= MAX_ATTEMPTS;
        const backoffMs = Math.min(15 * 60 * 1000, 30 * 1000 * (2 ** (job.attempts - 1)));
        await db.update(aiProcessingJobsTable).set({
          status: isFinalAttempt ? "FAILED" : "QUEUED",
          available_at: isFinalAttempt ? new Date() : new Date(Date.now() + backoffMs),
          updated_at: new Date(),
          last_error: message,
        }).where(eq(aiProcessingJobsTable.id, job.id));
        if (isFinalAttempt && job.job_type === "VERIFY_CLAIM") {
          await markClaimVerificationFailed(job.payload?.claim_id, message);
        } else if (isFinalAttempt) {
          console.error("AI background job failed permanently:", message);
        } else {
          console.error(`AI background job attempt ${job.attempts} failed:`, message);
        }
      }
    }
  } catch (error) {
    console.error("AI background worker error:", error);
  } finally {
    isPumping = false;
  }
};

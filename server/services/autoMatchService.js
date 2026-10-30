import { db } from "../src/index.js";
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  foundItemsTable,
  lostReportsTable,
  itemMatchesTable,
  conversationsTable,
} from "../src/models/index.js";
import { getMatchScore } from "./matchingService.js";
import { appendAiChatMessages } from "../src/services/chatStore.js";

const normalizeText = (text) => {
  if (!text) return "";
  return String(text).toLowerCase().replace(/\s+/g, " ").trim();
};

const parseDetails = (value) => {
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { return {}; }
  }
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
};

const canonicalDetailKey = (key) => {
  const compact = String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
  const aliases = {
    brand: "Brand", manufacturer: "Brand", make: "Brand",
    color: "Color", colour: "Color",
    model: "Model", category: "Category", size: "Size", material: "Material",
  };
  return aliases[compact] || null;
};

const getExactDetailMatches = (reportDetails, foundDetails) => {
  const foundByKey = new Map(Object.entries(parseDetails(foundDetails))
    .map(([key, value]) => [canonicalDetailKey(key), value])
    .filter(([key, value]) => key && normalizeText(value)));
  return Object.entries(parseDetails(reportDetails))
    .map(([key, value]) => {
      const label = canonicalDetailKey(key);
      const foundValue = label ? foundByKey.get(label) : null;
      const lostText = normalizeText(value);
      const foundText = normalizeText(foundValue);
      return label && lostText && foundText && lostText === foundText
        ? `${label} matches (${String(value).trim()}).`
        : null;
    })
    .filter(Boolean)
    .slice(0, 3);
};

const similarityReason = (label, score) => {
  const level = score >= 75 ? "strong" : score >= 50 ? "some" : "limited";
  return `${label}: ${level} similarity (${score}%).`;
};
const locationSimilarity = (a, b) => {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return 0;

  const tokensA = na.split(" ");
  const tokensB = nb.split(" ").slice(0, 5);
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection = new Set([...setA].filter((token) => setB.has(token)));
  const union = new Set([...setA, ...setB]);
  let score = union.size ? (intersection.size / union.size) * 100 : 0;

  if (tokensA[0] && tokensA[0] === tokensB[0]) score = Math.min(100, score + 15);
  return Math.round(score);
};

const scoreAndStoreMatch = async (report, foundItem) => {
  const [existingMatch] = await db
    .select({ id: itemMatchesTable.id })
    .from(itemMatchesTable)
    .where(
      and(
        eq(itemMatchesTable.lost_report_id, report.id),
        eq(itemMatchesTable.found_item_id, foundItem.id),
      ),
    );
  if (existingMatch) return null;

  // A single Groq verification request compares written details, item type, and both photos.
  const detailsResult = await getMatchScore(
    report.report_details,
    foundItem.public_details,
    {
      firstItemType: report.item_type,
      secondItemType: foundItem.item_type,
      firstImage: report.image_urls,
      secondImage: foundItem.image_urls,
    },
  );
  const itemTypeResult = { percentage: detailsResult.item_type_percentage ?? 0 };
  const locScore = locationSimilarity(report.location_lost, foundItem.location_found);
  const hasVisualScore = Number.isFinite(detailsResult.visual_percentage);
  const hasDetails = Boolean(report.report_details && foundItem.public_details);
  const hasItemType = Boolean(normalizeText(report.item_type) && normalizeText(foundItem.item_type));
  const hasLocation = Boolean(normalizeText(report.location_lost) && normalizeText(foundItem.location_found));
  // Requested weights when all signals are available: photos 35%, text 30%, type 30%, location 5%.
  // Missing signals are excluded, then the remaining weights are normalized to 100%.
  const scoreSignals = [
    { score: detailsResult.visual_percentage, weight: 35, available: hasVisualScore },
    { score: detailsResult.percentage, weight: 30, available: hasDetails },
    { score: itemTypeResult.percentage, weight: 30, available: hasItemType },
    { score: locScore, weight: 5, available: hasLocation },
  ].filter((signal) => signal.available);
  const availableWeight = scoreSignals.reduce((sum, signal) => sum + signal.weight, 0);
  // Dates are intentionally excluded: an item can be found long after it was lost.
  const combinedScore = availableWeight
    ? Math.round(scoreSignals.reduce((sum, signal) => sum + signal.score * signal.weight, 0) / availableWeight)
    : 0;

  const exactDetailMatches = getExactDetailMatches(report.report_details, foundItem.public_details);
  const matchReasons = [
    similarityReason("Item type", itemTypeResult.percentage),
    ...exactDetailMatches,
    similarityReason("Item details", detailsResult.percentage),
    hasVisualScore
      ? similarityReason("Photos", detailsResult.visual_percentage)
      : "Photo comparison is unavailable and did not affect this score.",
    similarityReason("Location", locScore),
  ];

  let matchAlert = null;
  const inserted = await db.transaction(async (tx) => {
    const [saved] = await tx.insert(itemMatchesTable)
      .values({
        lost_report_id: report.id,
        found_item_id: foundItem.id,
        match_score: combinedScore,
        status: "PENDING",
      })
      .returning();

    if (combinedScore > 50) {
      const reportNumber = `ATH-${String(report.id).slice(0, 8).toUpperCase()}`;
      const foundPostUrl = `/found-items?item=${encodeURIComponent(foundItem.id)}`;
      const matchCard = {
        report_number: reportNumber,
        found_item_id: foundItem.id,
        item_type: foundItem.item_type,
        location: foundItem.location_found,
        match_percentage: combinedScore,
        match_reasons: matchReasons,
        url: foundPostUrl,
      };
      matchAlert = {
        id: randomUUID(),
        role: "assistant",
        content: `I found a possible match for your lost report #${reportNumber}. Match score: ${combinedScore}%. Review the match details below.`,
        matches: [matchCard],
        mode: "match_alert",
        created_at: new Date().toISOString(),
      };
    }

    await tx.update(conversationsTable)
      .set({ match_percentage: combinedScore, updated_at: new Date() })
      .where(and(
        eq(conversationsTable.lost_report_id, report.id),
        eq(conversationsTable.found_item_id, foundItem.id),
      ));
    return saved;
  });

  if (matchAlert) {
    try {
      await appendAiChatMessages(report.user_id, [matchAlert]);
    } catch (error) {
      console.error("Could not save the temporary Athar AI match alert:", error.message);
    }
  }

  return {
    match_id: inserted.id,
    report_id: report.id,
    found_item_id: foundItem.id,
    match_score: combinedScore,
    details_score: detailsResult.percentage,
    item_type_score: itemTypeResult.percentage,
    location_score: locScore,
    visual_score: detailsResult.visual_percentage,
    visual_status: detailsResult.visual_status,
    visual_observations: detailsResult.visual_observations,
    match_reasons: matchReasons,
    ai_agent: detailsResult.agent,
    conversation_id: null,
  };
};
export const runAutoMatchPair = async (report, foundItem) => {
  if (!report || report.status !== "OPEN" || !foundItem || foundItem.status !== "FOUND") return null;
  if (String(report.user_id) === String(foundItem.finder_id)) return null;
  return scoreAndStoreMatch(report, foundItem);
};

// Run after a found item is recorded or updated.
export const runAutoMatch = async (newFoundItem) => {
  if (!newFoundItem || newFoundItem.status !== "FOUND") return [];

  {
    const openReports = await db
      .select()
      .from(lostReportsTable)
      .where(eq(lostReportsTable.status, "OPEN"))
      .orderBy(desc(lostReportsTable.created_at));
    const candidates = openReports.filter((report) => report.user_id !== newFoundItem.finder_id);
    const results = [];
    for (const report of candidates) {
      const result = await scoreAndStoreMatch(report, newFoundItem);
      if (result) results.push(result);
    }
    return results;
  }
};

// Also run after a lost report is filed, so order of submission does not matter.
export const runAutoMatchForLostReport = async (newLostReport) => {
  if (!newLostReport || newLostReport.status !== "OPEN") return [];

  {
    const foundItems = await db
      .select()
      .from(foundItemsTable)
      .where(eq(foundItemsTable.status, "FOUND"))
      .orderBy(desc(foundItemsTable.created_at));
    const candidates = foundItems.filter((item) => item.finder_id !== newLostReport.user_id);
    const results = [];
    for (const item of candidates) {
      const result = await scoreAndStoreMatch(newLostReport, item);
      if (result) results.push(result);
    }
    return results;
  }
};


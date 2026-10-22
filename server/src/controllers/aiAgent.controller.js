import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../index.js";
import {
  aiAssistantMessagesTable,
  conversationMessagesTable,
  conversationsTable,
  foundItemsTable,
  itemMatchesTable,
  lostReportsTable,
} from "../models/index.js";
import { generateAssistantReply, getMatchScore } from "../../services/matchingService.js";

const normalizeHistory = (history) => {
  if (!Array.isArray(history)) return [];
  return history
    .filter((turn) => ["user", "assistant"].includes(turn?.role))
    .slice(-8)
    .map((turn) => ({ role: turn.role, content: String(turn.content || "").slice(0, 1200) }))
    .filter((turn) => turn.content);
};

const isMatchQuestion = (question) =>
  /\b(match(?:ing|es)?|find|found|lost|missing|looking for|possible match|score|percentage)\b|%|مطابق|مطابقة|تطابق|ماتش|مفقود|مفقودة|ضاع|ضاعت|فقدت|لقيت|بلاغ|نسبة|درجة/iu.test(question);

const isScoreQuestion = (question) =>
  /\b(score|percentage|percent)\b|%|نسب[هة]|درج[هة]/iu.test(question);

const isArabicMessage = (value) => /[\u0600-\u06FF]/u.test(String(value || ""));

const reportNumberFromQuestion = (question) =>
  question.match(/\bATH-[0-9A-F]{8}\b/i)?.[0]?.toUpperCase() || null;

const searchableText = (value) => {
  if (value == null) return "";
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? searchableText(parsed) : String(parsed);
    } catch { return value; }
  }
  if (Array.isArray(value)) return value.map(searchableText).join(" ");
  if (typeof value === "object") {
    return Object.entries(value).map(([key, child]) => `${key} ${searchableText(child)}`).join(" ");
  }
  return String(value);
};

const tokenSet = (value) => new Set(
  searchableText(value).toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || [],
);

const tokenSimilarity = (first, second) => {
  const a = tokenSet(first);
  const b = tokenSet(second);
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union ? Math.round((intersection / union) * 100) : 0;
};

const locationSimilarity = (first, second) => {
  const left = String(first ?? "").toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const right = String(second ?? "").toLocaleLowerCase().trim().split(/\s+/).slice(0, 5).filter(Boolean);
  if (!left.length || !right.length) return null;
  const a = new Set(left);
  const b = new Set(right);
  const union = new Set([...a, ...b]).size;
  let score = union ? (new Set([...a].filter((token) => b.has(token))).size / union) * 100 : 0;
  if (left[0] === right[0]) score = Math.min(100, score + 15);
  return Math.round(score);
};

const weightedMatchScore = ({ text, type, location, visual, hasText, hasType, hasLocation }) => {
  const signals = [
    { score: text, weight: 30, available: hasText },
    { score: type, weight: 30, available: hasType },
    { score: location, weight: 5, available: hasLocation },
    { score: visual, weight: 35, available: visual != null },
  ].filter((signal) => signal.available);
  const weight = signals.reduce((sum, signal) => sum + signal.weight, 0);
  return weight
    ? Math.round(signals.reduce((sum, signal) => sum + signal.score * signal.weight, 0) / weight)
    : 0;
};

const scoreQuestionReply = (matches, question = "") => {
  if (matches.length) {
    return isArabicMessage(question)
      ? "نسبة التشابه الحالية " + matches[0].match_percentage + "% للبلاغ " + matches[0].report_number + ". دي نتيجة مبدئية، ومش إثبات لملكية الغرض."
      : "The current match score is " + matches[0].match_percentage + "% for report " + matches[0].report_number + ". This is only a suggestion, not proof of ownership.";
  }
  return isArabicMessage(question)
    ? "مش لاقي درجة مطابقة محفوظة للبلاغ ده لسه. ضيف تفاصيل أكتر أو جرّب تاني بعد إضافة أغراض جديدة."
    : "I could not find a saved match score for that report yet. Add more item details or try again after new found items are posted.";
};

const hasInventedPercentage = (message, matches) => {
  const knownScores = new Set(matches.map((match) => String(match.match_percentage)));
  return [...String(message).matchAll(/\b(\d{1,3})\s*%/g)]
    .some(([, score]) => !knownScores.has(score));
};

const asDetailsObject = (details) => {
  if (typeof details === "string") {
    try { details = JSON.parse(details); } catch { return {}; }
  }
  return details && typeof details === "object" && !Array.isArray(details) ? details : {};
};

const detailLabel = (key) => {
  const compact = String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
  const labels = {
    brand: "Brand", manufacturer: "Brand", make: "Brand",
    color: "Color", colour: "Color",
    model: "Model", category: "Category", size: "Size", material: "Material",
  };
  return labels[compact] || null;
};

const normalizeDetail = (value) => String(value ?? "").trim().toLocaleLowerCase().replace(/\s+/g, " ");

const getAlertMatchReasons = (message, row) => {
  const reasonBlock = message.match(/Why it may match:\s*([\s\S]*?)(?:\n\s*Take a look:|$)/i)?.[1];
  const savedReasons = reasonBlock
    ? reasonBlock.split(/\r?\n/).map((line) => line.replace(/^\s*[•*-]\s*/, "").trim()).filter(Boolean)
    : [];
  if (savedReasons.length) return savedReasons;

  const lostDetails = asDetailsObject(row.report_details);
  const foundDetails = asDetailsObject(row.found_details);
  const foundByLabel = new Map(Object.entries(foundDetails)
    .map(([key, value]) => [detailLabel(key), value])
    .filter(([label, value]) => label && normalizeDetail(value)));
  const reasons = [];
  const lostType = String(row.lost_item_type || "").trim();
  const foundType = String(row.item_type || "").trim();
  if (lostType && foundType) {
    reasons.push(normalizeDetail(lostType) === normalizeDetail(foundType)
      ? `Item type matches (${foundType}).`
      : `Item types compared: ${lostType} and ${foundType}.`);
  }

  for (const [key, value] of Object.entries(lostDetails)) {
    const label = detailLabel(key);
    const foundValue = label ? foundByLabel.get(label) : null;
    if (!label || !normalizeDetail(value) || !normalizeDetail(foundValue)) continue;
    reasons.push(normalizeDetail(value) === normalizeDetail(foundValue)
      ? `${label} matches (${String(value).trim()}).`
      : `${label} differs (${String(value).trim()} vs. ${String(foundValue).trim()}).`);
    if (reasons.length >= 4) break;
  }

  if (reasons.length === 0) reasons.push("No exact shared attributes were found in the saved details.");
  reasons.push("The saved score used item type, public details, and location; its full breakdown was not saved.");
  reasons.push("Photo comparison details are not available for this saved match.");
  return reasons;
};

const cleanAlertMessage = (message) => message
  .replace(/\n\s*Why it may match:[\s\S]*?(?=\n\s*Take a look:|$)/i, "")
  .replace(/\n?\s*Take a look:\s*https?:\/\/\S+/i, "")
  .replace(/https?:\/\/\S+/g, "")
  .trim();

const toClientMessage = (row) => ({
  id: row.id,
  role: row.role,
  content: row.content,
  matches: Array.isArray(row.matches) ? row.matches : [],
  mode: row.mode || undefined,
  hint: row.hint || undefined,
  created_at: row.created_at,
});

export const getAiChatHistory = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Sign in to view your Athar AI chat." });

  try {
    const rows = await db.select().from(aiAssistantMessagesTable)
      .where(eq(aiAssistantMessagesTable.user_id, userId))
      .orderBy(desc(aiAssistantMessagesTable.created_at))
      .limit(100);

    return res.status(200).json({ messages: rows.reverse().map(toClientMessage) });
  } catch (error) {
    console.error("Could not load Athar AI chat history:", error);
    return res.status(500).json({ message: "Could not load your saved Athar AI chat." });
  }
};

export const chatWithAiAgent = async (req, res) => {
  const question = String(req.body?.question || "").trim();
  if (!question || question.length > 1500) {
    return res.status(400).json({ message: "Write a question up to 1,500 characters." });
  }

  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Sign in to talk to Athar AI." });

    // Only the caller's own reports and public found-item details are sent to Groq.
    // Hidden verification details and finder contact information stay in Node.
    const [reports, foundItems, previousMessages, savedAlerts] = await Promise.all([
      db.select({
        id: lostReportsTable.id,
        item_type: lostReportsTable.item_type,
        report_details: lostReportsTable.report_details,
        date_lost: lostReportsTable.date_lost,
        location_lost: lostReportsTable.location_lost,
        image_urls: lostReportsTable.image_urls,
        status: lostReportsTable.status,
      }).from(lostReportsTable)
        .where(and(
          eq(lostReportsTable.user_id, userId),
          inArray(lostReportsTable.status, ["OPEN", "MATCHED"]),
        ))
        .orderBy(desc(lostReportsTable.created_at))
        .limit(50),
      db.select({
        id: foundItemsTable.id,
        item_type: foundItemsTable.item_type,
        public_details: foundItemsTable.public_details,
        date_found: foundItemsTable.date_found,
        location_found: foundItemsTable.location_found,
        image_urls: foundItemsTable.image_urls,
        finder_id: foundItemsTable.finder_id,
        status: foundItemsTable.status,
      }).from(foundItemsTable)
        .where(eq(foundItemsTable.status, "FOUND"))
        .orderBy(desc(foundItemsTable.created_at))
        .limit(100),
      db.select({ role: aiAssistantMessagesTable.role, content: aiAssistantMessagesTable.content })
        .from(aiAssistantMessagesTable)
        .where(eq(aiAssistantMessagesTable.user_id, userId))
        .orderBy(desc(aiAssistantMessagesTable.created_at))
        .limit(8),
      db.select({ matches: aiAssistantMessagesTable.matches })
        .from(aiAssistantMessagesTable)
        .where(and(
          eq(aiAssistantMessagesTable.user_id, userId),
          eq(aiAssistantMessagesTable.mode, "match_alert"),
        ))
        .orderBy(desc(aiAssistantMessagesTable.created_at))
        .limit(100),
    ]);

    const savedMatchRows = reports.length
      ? await db.select({
          lost_report_id: itemMatchesTable.lost_report_id,
          found_item_id: itemMatchesTable.found_item_id,
          match_score: itemMatchesTable.match_score,
          created_at: itemMatchesTable.created_at,
        }).from(itemMatchesTable)
          .where(inArray(itemMatchesTable.lost_report_id, reports.map((report) => report.id)))
          .orderBy(asc(itemMatchesTable.created_at))
      : [];

    const reportIdByNumber = new Map(reports.map((report) => [
      `ATH-${String(report.id).slice(0, 8).toUpperCase()}`,
      report.id,
    ]));
    const matchResultMap = new Map(savedMatchRows.map((row) => [
      `${row.lost_report_id}:${row.found_item_id}`,
      {
        report_id: row.lost_report_id,
        found_item_id: row.found_item_id,
        match_percentage: row.match_score,
        match_reasons: null,
      },
    ]));
    for (const alert of savedAlerts) {
      for (const match of Array.isArray(alert.matches) ? alert.matches : []) {
        const reportId = reportIdByNumber.get(String(match.report_number || "").toUpperCase());
        const foundItemId = match.found_item_id;
        if (!reportId || !foundItemId) continue;
        const key = `${reportId}:${foundItemId}`;
        const existing = matchResultMap.get(key);
        if (existing) {
          if (!existing.match_reasons && Array.isArray(match.match_reasons)) {
            existing.match_reasons = match.match_reasons;
          }
          continue;
        }
        if (!Number.isFinite(Number(match.match_percentage))) continue;
        matchResultMap.set(key, {
          report_id: reportId,
          found_item_id: foundItemId,
          match_percentage: Number(match.match_percentage),
          match_reasons: Array.isArray(match.match_reasons) ? match.match_reasons : null,
        });
      }
    }

    const reportsById = new Map(reports.map((report) => [String(report.id), report]));
    const foundById = new Map(foundItems.map((item) => [String(item.id), item]));
    const wantedReportNumber = reportNumberFromQuestion(question);
    const savedMatches = [...matchResultMap.values()]
      .map((match) => {
        const report = reportsById.get(String(match.report_id));
        const item = foundById.get(String(match.found_item_id));
        if (!report || !item || item.status !== "FOUND") return null;
        return {
          report_number: `ATH-${String(report.id).slice(0, 8).toUpperCase()}`,
          found_item_id: item.id,
          item_type: item.item_type,
          location: item.location_found,
          match_percentage: Math.max(0, Math.min(100, Math.round(Number(match.match_percentage) || 0))),
          match_reasons: Array.isArray(match.match_reasons) && match.match_reasons.length
            ? match.match_reasons
            : ["This is a saved Athar match score."],
          url: `/found-items?item=${encodeURIComponent(item.id)}`,
        };
      })
      .filter(Boolean)
      .filter((match) => !wantedReportNumber || match.report_number === wantedReportNumber)
      .sort((a, b) => b.match_percentage - a.match_percentage);

    let matches = savedMatches.slice(0, 8);
    const reportsToSearch = reports.filter((report) =>
      !wantedReportNumber
        ? true
        : `ATH-${String(report.id).slice(0, 8).toUpperCase()}` === wantedReportNumber,
    );

    // If no saved result exists, compare only the three strongest candidate pairs.
    // This preserves chat-based search without making one chat query scan every pair.
    if (isMatchQuestion(question) && !matches.length && reportsToSearch.length && foundItems.length) {
      const alreadyScored = new Set(savedMatchRows.map((row) => `${row.lost_report_id}:${row.found_item_id}`));
      const candidatePairs = [];
      for (const report of reportsToSearch) {
        for (const item of foundItems) {
          if (item.status !== "FOUND" || String(item.finder_id) === String(userId)) continue;
          const pairKey = `${report.id}:${item.id}`;
          if (alreadyScored.has(pairKey)) continue;
          const detailText = tokenSimilarity(report.report_details, item.public_details);
          const typeScore = tokenSimilarity(report.item_type, item.item_type);
          const locScore = locationSimilarity(report.location_lost, item.location_found);
          const rank = weightedMatchScore({
            text: detailText,
            type: typeScore,
            location: locScore,
            visual: null,
            hasText: Boolean(report.report_details && item.public_details),
            hasType: Boolean(report.item_type && item.item_type),
            hasLocation: locScore != null,
          });
          candidatePairs.push({ report, item, rank });
        }
      }
      candidatePairs.sort((a, b) => b.rank - a.rank);
      const evaluated = await Promise.all(candidatePairs.slice(0, 3).map(async ({ report, item }) => {
        const compared = await getMatchScore(
          report.report_details,
          item.public_details,
          {
            firstItemType: report.item_type,
            secondItemType: item.item_type,
            firstImage: report.image_urls,
            secondImage: item.image_urls,
          },
        );
        const locScore = locationSimilarity(report.location_lost, item.location_found);
        const score = weightedMatchScore({
          text: compared.percentage,
          type: compared.item_type_percentage ?? 0,
          location: locScore,
          visual: compared.visual_percentage,
          hasText: Boolean(report.report_details && item.public_details),
          hasType: Boolean(report.item_type && item.item_type),
          hasLocation: locScore != null,
        });
        if (score < 45) return null;
        return {
          report_number: `ATH-${String(report.id).slice(0, 8).toUpperCase()}`,
          found_item_id: item.id,
          item_type: item.item_type,
          location: item.location_found,
          match_percentage: score,
          match_reasons: [
            `Item details similarity: ${compared.percentage}%.`,
            `Item type similarity: ${compared.item_type_percentage ?? 0}%.`,
            ...(compared.visual_percentage == null ? [] : [`Photo similarity: ${compared.visual_percentage}%.`]),
            ...(locScore == null ? [] : [`Location similarity: ${locScore}%.`]),
          ],
          url: `/found-items?item=${encodeURIComponent(item.id)}`,
        };
      }));
      matches = evaluated.filter(Boolean).sort((a, b) => b.match_percentage - a.match_percentage).slice(0, 8);
    }

    const history = normalizeHistory(previousMessages.reverse());
    const scoreOnlyReply = isScoreQuestion(question);
    const noReportsReply = isMatchQuestion(question) && reportsToSearch.length === 0;
    let assistantContent;
    let usedGroq = false;
    if (scoreOnlyReply) {
      assistantContent = scoreQuestionReply(matches, question);
    } else if (noReportsReply) {
      assistantContent = isArabicMessage(question)
        ? "مش لاقي البلاغ ده على حسابك. سجّل بلاغ مفقود الأول، وبعدها اطلب مني أدور على تطابقات."
        : "I could not find that lost report on your account. Add a report first, then ask me to search again.";
    } else if (isMatchQuestion(question) && !matches.length) {
      assistantContent = isArabicMessage(question)
        ? "ملقتش تطابق محتمل بين الأغراض المتاحة حاليًا. تقدر تطلب مني أدور تاني لما أغراض جديدة تتسجل."
        : "I could not find a likely match in the available found items yet. You can ask me to check again when new items are posted.";
    } else {
      const context = {
        lost_reports: reports.slice(0, 5).map((report) => ({
          report_number: `ATH-${String(report.id).slice(0, 8).toUpperCase()}`,
          item_type: report.item_type,
          report_details: String(report.report_details || "").slice(0, 300),
          date_lost: report.date_lost,
          location_lost: report.location_lost,
          status: report.status,
        })),
        public_found_items: foundItems.slice(0, 5).map((item) => ({
          id: item.id,
          item_type: item.item_type,
          public_details: String(item.public_details || "").slice(0, 300),
          date_found: item.date_found,
          location_found: item.location_found,
        })),
        possible_matches: matches,
      };
      assistantContent = await generateAssistantReply({ question, history, context });
      usedGroq = true;
      if (hasInventedPercentage(assistantContent, matches)) {
        usedGroq = false;
        assistantContent = matches.length
          ? scoreQuestionReply(matches, question)
          : isArabicMessage(question)
            ? "مش لاقي درجة مطابقة محفوظة لسه. دي نتيجة مبدئية ومش إثبات لملكية الغرض."
            : "I could not find a saved match score yet. This is only a suggestion, not proof of ownership.";
      }
    }

    const result = {
      message: assistantContent,
      matches,
      mode: usedGroq ? "groq_agent" : "athar_agent",
      agent_model: usedGroq ? process.env.GROQ_CHAT_MODEL?.trim() || "allam-2-7b" : "Athar rules",
    };
    const [userMessage, assistantMessage] = await db.transaction(async (tx) => {
      const [savedUserMessage] = await tx.insert(aiAssistantMessagesTable).values({
        user_id: userId,
        role: "user",
        content: question,
        matches: [],
      }).returning();
      const [savedAssistantMessage] = await tx.insert(aiAssistantMessagesTable).values({
        user_id: userId,
        role: "assistant",
        content: assistantContent,
        matches: result.matches,
        mode: result.mode,
        hint: null,
      }).returning();
      return [savedUserMessage, savedAssistantMessage];
    });

    return res.status(200).json({
      ...result,
      message: assistantContent,
      user_message: toClientMessage(userMessage),
      assistant_message: toClientMessage(assistantMessage),
    });
  } catch (error) {
    console.error("Athar AI chat failed:", error);
    const status = Number(error.statusCode) || 503;
    const errorText = String(error.message || "");
    const missingKey = errorText.includes("GROQ_CHAT_API_KEY")
      ? "Groq chat is not configured. Add GROQ_CHAT_API_KEY to server/.env and restart the server."
      : errorText.includes("GROQ_VERIFICATION_API_KEY")
        ? "Groq verification is not configured. Add GROQ_VERIFICATION_API_KEY to server/.env and restart the server."
        : null;
    const rejectedKey = error.code === "GROQ_INVALID_API_KEY"
      ? `Groq rejected the ${error.purpose === "chat" ? "chat" : "verification"} API key. Check that it is active and copied from the correct Groq project.`
      : null;
    const message = missingKey || rejectedKey
      || (status === 429
        ? "Groq's request limit was reached. Wait a little and try again."
        : status === 504
          ? "Groq timed out. Please retry in a moment."
          : status === 503
            ? "Groq is temporarily busy. Please retry in a moment."
            : status === 502
              ? "Groq could not process that request. Please try again."
              : "Groq is temporarily unavailable. Please try again shortly.");
    return res.status(status >= 400 && status < 600 ? status : 503).json({ message });
  }
};

export const getAiMatchAlerts = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Sign in to view Athar AI alerts." });

  try {
    const savedRows = await db.select().from(aiAssistantMessagesTable)
      .where(and(
        eq(aiAssistantMessagesTable.user_id, userId),
        eq(aiAssistantMessagesTable.role, "assistant"),
      ))
      .orderBy(desc(aiAssistantMessagesTable.created_at))
      .limit(100);
    const savedAlerts = savedRows
      .filter((row) => row.mode === "match_alert" && Array.isArray(row.matches) && row.matches.length > 0)
      .map(toClientMessage);

    // Keep previously created alerts available in Athar AI, but never place them in the Chats inbox.
    const legacyRows = await db
      .select({
        id: conversationMessagesTable.id,
        message: conversationMessagesTable.message,
        created_at: conversationMessagesTable.created_at,
        report_id: lostReportsTable.id,
        lost_item_type: lostReportsTable.item_type,
        report_details: lostReportsTable.report_details,
        found_item_id: foundItemsTable.id,
        item_type: foundItemsTable.item_type,
        found_details: foundItemsTable.public_details,
        location: foundItemsTable.location_found,
        match_percentage: conversationsTable.match_percentage,
      })
      .from(conversationMessagesTable)
      .innerJoin(conversationsTable, eq(conversationMessagesTable.conversation_id, conversationsTable.id))
      .innerJoin(lostReportsTable, eq(conversationsTable.lost_report_id, lostReportsTable.id))
      .innerJoin(foundItemsTable, eq(conversationsTable.found_item_id, foundItemsTable.id))
      .where(and(
        eq(conversationsTable.claimant_id, userId),
        eq(conversationMessagesTable.sender_name, "Athar AI Assistant"),
        eq(conversationMessagesTable.message_type, "AI_ASSISTANT"),
      ))
      .orderBy(asc(conversationMessagesTable.created_at))
      .limit(100);

    const legacyAlerts = legacyRows
      .filter((row) => typeof row.message === "string" && row.message.includes("/found-items?item="))
      .map((row) => ({
        id: row.id,
        role: "assistant",
        content: cleanAlertMessage(row.message),
        created_at: row.created_at,
        matches: [{
          report_number: `ATH-${String(row.report_id).slice(0, 8).toUpperCase()}`,
          found_item_id: row.found_item_id,
          item_type: row.item_type,
          location: row.location,
          match_percentage: row.match_percentage,
          match_reasons: getAlertMatchReasons(row.message, row),
          url: `/found-items?item=${encodeURIComponent(row.found_item_id)}`,
        }],
      }));

    const uniqueAlerts = [...savedAlerts, ...legacyAlerts]
      .filter((alert, index, all) => all.findIndex((candidate) => candidate.id === alert.id) === index)
      .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    return res.status(200).json({ alerts: uniqueAlerts });
  } catch (error) {
    console.error("Could not load Athar AI match alerts:", error);
    return res.status(500).json({ message: "Could not load Athar AI alerts." });
  }
};

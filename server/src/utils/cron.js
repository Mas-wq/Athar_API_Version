import cron from "node-cron";
import { db } from "../index.js";
import { usersPendingTable } from "../models/index.js";
import { lt } from "drizzle-orm";
import { finalizeDueHandovers } from "../controllers/conversation.controller.js";
import { processAiJobQueue, recoverGroqAuthFailures } from "../../services/aiJobService.js";
import {
  closeDueAuctions,
  handleNoShows,
  runNoticeStep,
  runStartStep,
  sendEndingSoonNotifications,
} from "../../services/auctionService.js";

export const initCronJobs = () => {
  // Runs every hour
  cron.schedule("0 * * * *", async () => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      await db
        .delete(usersPendingTable)
        .where(lt(usersPendingTable.created_at, twentyFourHoursAgo));

      console.log("Successfully cleaned up old pending users");
      await runNoticeStep();
      await runStartStep();
    } catch (err) {
      console.error("Cleanup Cron Failed:", err);
    }
  });

  cron.schedule("* * * * *", async () => {
    try {
      await finalizeDueHandovers();
    } catch (err) {
      console.error("Handover finalization job failed:", err);
    }
  });

  cron.schedule("* * * * *", async () => {
    try {
      await closeDueAuctions();
      await handleNoShows();
      await sendEndingSoonNotifications();
    } catch (err) {
      console.error("Auction cron job failed:", err);
    }
  });

  void recoverGroqAuthFailures()
    .then(() => processAiJobQueue())
    .catch((error) => console.error("Could not recover Groq-rejected AI jobs:", error));
  setInterval(() => void processAiJobQueue(), 5000);
  console.log("Cron Jobs Initialized 🚀");
};

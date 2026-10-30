BEGIN;

-- These tables contain old conversation, Athar AI, or legacy claim message text.
-- Chat messages now live in Redis with a seven-day inactivity expiration.
DROP TABLE IF EXISTS conversation_messages;
DROP TABLE IF EXISTS ai_assistant_messages;
DROP TABLE IF EXISTS claim_messages;

COMMIT;

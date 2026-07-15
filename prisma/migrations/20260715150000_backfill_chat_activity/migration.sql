-- Keep existing conversations ordered by their latest message after deploying
-- the transactional activity updates used for all new messages.
UPDATE "SwapRequest" AS swap
SET "updatedAt" = GREATEST(swap."updatedAt", activity."lastMessageAt")
FROM (
  SELECT "swapId", MAX("createdAt") AS "lastMessageAt"
  FROM "DealMessage"
  GROUP BY "swapId"
) AS activity
WHERE activity."swapId" = swap."id";

UPDATE "ItemThread" AS thread
SET "updatedAt" = GREATEST(thread."updatedAt", activity."lastMessageAt")
FROM (
  SELECT "threadId", MAX("createdAt") AS "lastMessageAt"
  FROM "ItemThreadMessage"
  GROUP BY "threadId"
) AS activity
WHERE activity."threadId" = thread."id";

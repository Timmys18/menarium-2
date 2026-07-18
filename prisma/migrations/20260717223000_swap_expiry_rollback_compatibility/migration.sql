-- Keep the previous application version able to create swaps after an app rollback.
ALTER TABLE "SwapRequest"
ALTER COLUMN "expiresAt" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days');

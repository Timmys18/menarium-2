-- Expand first: existing application versions keep using the legacy display columns.
ALTER TABLE "User" ADD COLUMN "cityId" TEXT;
ALTER TABLE "Item" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "Item" ADD COLUMN "cityId" TEXT;

CREATE INDEX "User_cityId_idx" ON "User"("cityId");
CREATE INDEX "Item_categoryId_status_idx" ON "Item"("categoryId", "status");
CREATE INDEX "Item_cityId_status_idx" ON "Item"("cityId", "status");

-- Russian full-text search supports word forms; pg_trgm provides a typo-tolerant fallback.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Item_search_fts_idx" ON "Item" USING GIN (
  to_tsvector('russian'::regconfig, coalesce("title", '') || ' ' || coalesce("description", '') || ' ' || coalesce("category", ''))
);
CREATE INDEX "Item_search_trgm_idx" ON "Item" USING GIN (
  lower(coalesce("title", '') || ' ' || coalesce("description", '') || ' ' || coalesce("category", '')) gin_trgm_ops
);

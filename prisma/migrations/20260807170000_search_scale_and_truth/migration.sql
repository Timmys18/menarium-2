-- Search columns match the exact expressions used by the application. Keeping
-- them stored means PostgreSQL never rebuilds a document for every search.
ALTER TABLE "Item"
  ADD COLUMN "searchVector" tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'russian'::regconfig,
      coalesce("title", '') || ' ' ||
      coalesce("description", '') || ' ' ||
      coalesce(array_to_string("desired", ' '), '') || ' ' ||
      coalesce("category", '')
    )
  ) STORED,
  ADD COLUMN "searchText" TEXT GENERATED ALWAYS AS (
    lower(
      coalesce("title", '') || ' ' ||
      coalesce("description", '') || ' ' ||
      coalesce(array_to_string("desired", ' '), '') || ' ' ||
      coalesce("category", '')
    )
  ) STORED;

CREATE INDEX "Item_search_vector_idx" ON "Item" USING GIN ("searchVector");
CREATE INDEX "Item_search_text_trgm_idx" ON "Item" USING GIN ("searchText" gin_trgm_ops);

-- Replaced by the generated columns above. They cannot serve the new query.
DROP INDEX IF EXISTS "Item_search_fts_idx";
DROP INDEX IF EXISTS "Item_search_trgm_idx";

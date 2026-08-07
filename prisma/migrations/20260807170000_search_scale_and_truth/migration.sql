-- Generated columns cannot call PostgreSQL's text search functions: they are
-- deliberately not marked immutable. A trigger keeps ordinary stored columns
-- in sync instead, so search still reads prebuilt data rather than rebuilding
-- a document for every row.
ALTER TABLE "Item"
  ADD COLUMN "searchVector" tsvector,
  ADD COLUMN "searchText" TEXT;

CREATE OR REPLACE FUNCTION "refresh_item_search"()
RETURNS trigger AS $$
BEGIN
  NEW."searchText" := lower(
    coalesce(NEW."title", '') || ' ' ||
    coalesce(NEW."description", '') || ' ' ||
    coalesce(array_to_string(NEW."desired", ' '), '') || ' ' ||
    coalesce(NEW."category", '')
  );
  NEW."searchVector" := to_tsvector('russian'::regconfig, NEW."searchText");
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

UPDATE "Item"
SET
  "searchText" = lower(
    coalesce("title", '') || ' ' ||
    coalesce("description", '') || ' ' ||
    coalesce(array_to_string("desired", ' '), '') || ' ' ||
    coalesce("category", '')
  ),
  "searchVector" = to_tsvector(
    'russian'::regconfig,
    lower(
      coalesce("title", '') || ' ' ||
      coalesce("description", '') || ' ' ||
      coalesce(array_to_string("desired", ' '), '') || ' ' ||
      coalesce("category", '')
    )
  );

CREATE TRIGGER "Item_refresh_search"
BEFORE INSERT OR UPDATE OF "title", "description", "desired", "category" ON "Item"
FOR EACH ROW EXECUTE FUNCTION "refresh_item_search"();

CREATE INDEX "Item_search_vector_idx" ON "Item" USING GIN ("searchVector");
CREATE INDEX "Item_search_text_trgm_idx" ON "Item" USING GIN ("searchText" gin_trgm_ops);

-- Replaced by the generated columns above. They cannot serve the new query.
DROP INDEX IF EXISTS "Item_search_fts_idx";
DROP INDEX IF EXISTS "Item_search_trgm_idx";

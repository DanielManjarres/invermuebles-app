ALTER TABLE "Customer"
ADD COLUMN "referenceName" TEXT,
ADD COLUMN "referenceRelation" TEXT,
ADD COLUMN "referencePhone" TEXT;

UPDATE "Customer"
SET "referenceName" = "contactReferences"
WHERE "contactReferences" IS NOT NULL AND "contactReferences" <> '';

ALTER TABLE "Customer"
DROP COLUMN "contactReferences";

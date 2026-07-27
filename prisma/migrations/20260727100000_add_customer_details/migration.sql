-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'OVERDUE', 'INACTIVE', 'BLOCKED');

-- AlterTable
ALTER TABLE "Customer"
ADD COLUMN "neighborhood" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "contactReferences" TEXT,
ADD COLUMN "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "notes" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_document_key" ON "Customer"("document");

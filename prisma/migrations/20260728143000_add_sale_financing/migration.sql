ALTER TYPE "SaleStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';
ALTER TYPE "SaleStatus" ADD VALUE IF NOT EXISTS 'PENDING_DELIVERY';
ALTER TYPE "SaleStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';

CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER');

ALTER TABLE "Sale"
  ADD COLUMN "sistecreditoApproval" TEXT,
  ADD COLUMN "reservedUntil" TIMESTAMP(3),
  ADD COLUMN "stockApplied" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Credit"
  ADD COLUMN "saleId" TEXT,
  ADD COLUMN "principal" DECIMAL(12,2),
  ADD COLUMN "interestRate" DECIMAL(5,2),
  ADD COLUMN "outstandingPrincipal" DECIMAL(12,2),
  ADD COLUMN "interestBalance" DECIMAL(12,2);

UPDATE "Credit"
SET
  "principal" = "total",
  "interestRate" = 0,
  "outstandingPrincipal" = "total",
  "interestBalance" = 0
WHERE "principal" IS NULL;

ALTER TABLE "Credit"
  ALTER COLUMN "principal" SET NOT NULL,
  ALTER COLUMN "interestRate" SET NOT NULL,
  ALTER COLUMN "outstandingPrincipal" SET NOT NULL,
  ALTER COLUMN "interestBalance" SET NOT NULL;

CREATE UNIQUE INDEX "Credit_saleId_key" ON "Credit"("saleId");

ALTER TABLE "Credit"
  ADD CONSTRAINT "Credit_saleId_fkey"
  FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SalePayment" (
  "id" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "creditId" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "reference" TEXT,
  "note" TEXT,
  "principalAmount" DECIMAL(12,2),
  "interestAmount" DECIMAL(12,2),
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SalePayment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SalePayment"
  ADD CONSTRAINT "SalePayment_saleId_fkey"
  FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "SalePayment_creditId_fkey"
  FOREIGN KEY ("creditId") REFERENCES "Credit"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "SalePayment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

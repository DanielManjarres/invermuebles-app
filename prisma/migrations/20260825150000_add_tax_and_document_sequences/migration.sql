-- Add purchase tax data to products and variants.
ALTER TABLE "Product"
ADD COLUMN "baseCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 19;

ALTER TABLE "ProductVariant"
ADD COLUMN "baseCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 19;

UPDATE "Product" SET "baseCost" = ROUND("cost" / 1.19, 2);
UPDATE "ProductVariant" SET "baseCost" = ROUND("cost" / 1.19, 2);

-- Preserve the tax breakdown and user-facing numbering on each sale.
ALTER TABLE "Sale"
ADD COLUMN "taxableBase" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "saleNumber" INTEGER,
ADD COLUMN "invoicePrefix" TEXT,
ADD COLUMN "invoiceNumber" INTEGER;

ALTER TABLE "SaleItem"
ADD COLUMN "baseCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 19,
ADD COLUMN "taxableBase" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "SalePayment" ADD COLUMN "receiptNumber" INTEGER;

CREATE TABLE "DocumentSequence" (
  "key" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "nextNumber" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentSequence_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX "Sale_saleNumber_key" ON "Sale"("saleNumber");
CREATE UNIQUE INDEX "Sale_invoicePrefix_invoiceNumber_key"
ON "Sale"("invoicePrefix", "invoiceNumber");
CREATE UNIQUE INDEX "SalePayment_receiptNumber_key" ON "SalePayment"("receiptNumber");

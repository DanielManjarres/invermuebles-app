ALTER TABLE "SalePayment"
  ADD COLUMN "isInitial" BOOLEAN NOT NULL DEFAULT false;

UPDATE "SalePayment"
SET "isInitial" = true
WHERE "note" = 'Pago inicial al registrar la venta.';

CREATE INDEX "SalePayment_saleId_isInitial_idx"
  ON "SalePayment"("saleId", "isInitial");

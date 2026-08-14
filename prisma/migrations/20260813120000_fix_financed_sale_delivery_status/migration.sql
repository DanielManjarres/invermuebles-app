UPDATE "Sale" AS sale
SET
  "status" = 'PENDING_DELIVERY'::"SaleStatus",
  "updatedAt" = CURRENT_TIMESTAMP
WHERE sale."status" = 'PENDING_PAYMENT'::"SaleStatus"
  AND sale."type" IN ('CREDIT'::"SaleType", 'CREDIT_CASH'::"SaleType")
  AND sale."amountPaid" > 0
  AND EXISTS (
    SELECT 1
    FROM "Credit" AS credit
    WHERE credit."saleId" = sale."id"
  );

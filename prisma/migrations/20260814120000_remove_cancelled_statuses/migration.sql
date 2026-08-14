DELETE FROM "Credit"
WHERE "status" = 'CANCELLED'
   OR "saleId" IN (
     SELECT "id"
     FROM "Sale"
     WHERE "status" = 'CANCELLED'
   );

DELETE FROM "Sale"
WHERE "status" = 'CANCELLED';

DELETE FROM "Order"
WHERE "status" = 'CANCELLED';

ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'CONTACTED', 'CONFIRMED');
ALTER TABLE "Order"
  ALTER COLUMN "status" TYPE "OrderStatus_new"
  USING ("status"::text::"OrderStatus_new");
DROP TYPE "OrderStatus";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "Sale" ALTER COLUMN "status" DROP DEFAULT;
CREATE TYPE "SaleStatus_new" AS ENUM (
  'COMPLETED',
  'PENDING_PAYMENT',
  'PENDING_DELIVERY',
  'DELIVERED'
);
ALTER TABLE "Sale"
  ALTER COLUMN "status" TYPE "SaleStatus_new"
  USING ("status"::text::"SaleStatus_new");
DROP TYPE "SaleStatus";
ALTER TYPE "SaleStatus_new" RENAME TO "SaleStatus";
ALTER TABLE "Sale" ALTER COLUMN "status" SET DEFAULT 'COMPLETED';

ALTER TABLE "Credit" ALTER COLUMN "status" DROP DEFAULT;
CREATE TYPE "CreditStatus_new" AS ENUM ('ACTIVE', 'PAID', 'OVERDUE');
ALTER TABLE "Credit"
  ALTER COLUMN "status" TYPE "CreditStatus_new"
  USING ("status"::text::"CreditStatus_new");
DROP TYPE "CreditStatus";
ALTER TYPE "CreditStatus_new" RENAME TO "CreditStatus";
ALTER TABLE "Credit" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

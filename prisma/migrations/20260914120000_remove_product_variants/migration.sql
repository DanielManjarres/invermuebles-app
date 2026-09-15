ALTER TABLE "ProductImage" DROP COLUMN "variantId";
ALTER TABLE "StockMovement" DROP COLUMN "variantId";
ALTER TABLE "OrderItem"
  DROP COLUMN "variantId",
  DROP COLUMN "variantName";
ALTER TABLE "SaleItem"
  DROP COLUMN "variantId",
  DROP COLUMN "variantName",
  DROP COLUMN "variantAttributes";

DROP TABLE "VariantAttributeValue";
DROP TABLE "ProductVariant";

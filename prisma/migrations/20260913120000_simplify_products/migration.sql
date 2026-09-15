ALTER TABLE "Product"
  ADD COLUMN "minimumStock" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "location" TEXT;

CREATE TABLE "ProductAttributeValue" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "attributeId" TEXT NOT NULL,
  "optionId" TEXT,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductAttributeValue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductAttributeValue_productId_attributeId_key"
  ON "ProductAttributeValue"("productId", "attributeId");

ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_attributeId_fkey"
  FOREIGN KEY ("attributeId") REFERENCES "AttributeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_optionId_fkey"
  FOREIGN KEY ("optionId") REFERENCES "AttributeOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

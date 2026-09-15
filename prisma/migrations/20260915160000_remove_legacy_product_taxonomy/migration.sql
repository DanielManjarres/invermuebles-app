DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Product" WHERE "catalogProductTypeId" IS NULL) THEN
    RAISE EXCEPTION 'No se puede eliminar la taxonomia heredada: existen productos sin tipo de catalogo.';
  END IF;
END $$;

ALTER TABLE "Product"
  DROP CONSTRAINT "Product_productClassId_fkey",
  DROP CONSTRAINT "Product_productTypeId_fkey",
  ALTER COLUMN "catalogProductTypeId" SET NOT NULL,
  DROP COLUMN "productClassId",
  DROP COLUMN "productTypeId";

DROP TABLE "ProductClass";
DROP TABLE "ProductType";

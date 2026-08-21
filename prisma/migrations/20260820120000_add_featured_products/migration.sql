ALTER TABLE "Product"
ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "featuredOrder" INTEGER;

CREATE INDEX "Product_featured_featuredOrder_idx"
ON "Product"("featured", "featuredOrder");

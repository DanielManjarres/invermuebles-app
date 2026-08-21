import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_FEATURED_PRODUCTS,
  validateFeaturedProductChange,
} from "../../lib/featured-product-policy.ts";

test("allows featuring a published product while capacity remains", () => {
  assert.equal(
    validateFeaturedProductChange({
      alreadyFeatured: false,
      featured: true,
      featuredCount: MAX_FEATURED_PRODUCTS - 1,
      visible: true,
    }),
    "",
  );
});

test("blocks hidden products and selections above the featured limit", () => {
  assert.match(
    validateFeaturedProductChange({
      alreadyFeatured: false,
      featured: true,
      featuredCount: 0,
      visible: false,
    }),
    /Publica el producto/,
  );
  assert.match(
    validateFeaturedProductChange({
      alreadyFeatured: false,
      featured: true,
      featuredCount: MAX_FEATURED_PRODUCTS,
      visible: true,
    }),
    /Solo puedes destacar 6 productos/,
  );
});

test("allows keeping or removing an existing featured product", () => {
  assert.equal(
    validateFeaturedProductChange({
      alreadyFeatured: true,
      featured: true,
      featuredCount: MAX_FEATURED_PRODUCTS,
      visible: true,
    }),
    "",
  );
  assert.equal(
    validateFeaturedProductChange({
      alreadyFeatured: true,
      featured: false,
      featuredCount: MAX_FEATURED_PRODUCTS,
      visible: false,
    }),
    "",
  );
});

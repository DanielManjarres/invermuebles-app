export const MAX_FEATURED_PRODUCTS = 6;

type FeaturedProductChange = {
  alreadyFeatured: boolean;
  featured: boolean;
  featuredCount: number;
  visible: boolean;
};

export function validateFeaturedProductChange({
  alreadyFeatured,
  featured,
  featuredCount,
  visible,
}: FeaturedProductChange) {
  if (!featured) {
    return "";
  }

  if (!visible) {
    return "Publica el producto en el catálogo antes de destacarlo.";
  }

  if (!alreadyFeatured && featuredCount >= MAX_FEATURED_PRODUCTS) {
    return `Solo puedes destacar ${MAX_FEATURED_PRODUCTS} productos en la página principal.`;
  }

  return "";
}

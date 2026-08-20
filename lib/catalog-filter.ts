import type { Product } from "@/lib/products";

export const ALL_CATALOG_CATEGORIES = "Todos";

export function getCatalogCategory(product: Product) {
  return product.catalogCategory || product.category;
}

export function filterCatalogProducts(
  products: Product[],
  activeCategory: string,
  query: string,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase("es");

  return products.filter((product) => {
    if (
      activeCategory !== ALL_CATALOG_CATEGORIES &&
      getCatalogCategory(product) !== activeCategory
    ) {
      return false;
    }
    if (!normalizedQuery) return true;

    return [
      product.name,
      product.reference,
      product.catalogCategory,
      product.catalogProductType,
      product.category,
      product.productClass,
      ...((product.variants ?? []).flatMap((variant) => [
        variant.name,
        variant.reference,
        ...variant.attributes.map((attribute) => attribute.value),
      ])),
    ].some((value) =>
      value?.toLocaleLowerCase("es").includes(normalizedQuery),
    );
  });
}

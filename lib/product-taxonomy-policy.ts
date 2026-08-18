type CategoryDependencies = {
  productTypes: number;
};

type ProductTypeDependencies = {
  attributes: number;
  products: number;
};

export function normalizeTaxonomyName(value?: string) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function validateTaxonomyName(value: string, label: string) {
  if (!value) {
    return `Escribe el nombre ${label}.`;
  }

  if (value.length < 2 || value.length > 80) {
    return `El nombre ${label} debe tener entre 2 y 80 caracteres.`;
  }

  return "";
}

export function canDeleteCategory(dependencies: CategoryDependencies) {
  const allowed = dependencies.productTypes === 0;

  return {
    allowed,
    reason: allowed
      ? ""
      : "No puedes eliminar una categoría que contiene tipos de producto.",
  };
}

export function canDeleteCatalogProductType(
  dependencies: ProductTypeDependencies,
) {
  const allowed =
    dependencies.attributes === 0 && dependencies.products === 0;

  return {
    allowed,
    reason: allowed
      ? ""
      : "No puedes eliminar un tipo que tiene productos o atributos configurados.",
  };
}

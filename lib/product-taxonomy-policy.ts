type CategoryDependencies = {
  productTypes: number;
};

type ProductTypeDependencies = {
  attributes: number;
  products: number;
};

type AttributeDependencies = {
  options: number;
  values: number;
};

type AttributeOptionDependencies = {
  selectedValues: number;
};

const attributeDataTypes = new Set(["TEXT", "NUMBER", "OPTION", "BOOLEAN"]);

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

export function createAttributeKey(value?: string) {
  return normalizeTaxonomyName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

export function isProductAttributeDataType(value?: string) {
  return Boolean(value && attributeDataTypes.has(value));
}

export function normalizeAttributePosition(value?: number) {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : 0;
}

export function validateAttributeDefinition(input: {
  dataType?: string;
  key?: string;
  name?: string;
  unit?: string;
}) {
  const nameError = validateTaxonomyName(
    normalizeTaxonomyName(input.name),
    "del atributo",
  );
  if (nameError) return nameError;

  if (!createAttributeKey(input.key || input.name)) {
    return "El atributo debe generar una clave válida.";
  }

  if (!isProductAttributeDataType(input.dataType)) {
    return "Selecciona un tipo de dato válido para el atributo.";
  }

  if (normalizeTaxonomyName(input.unit).length > 20) {
    return "La unidad del atributo no puede superar 20 caracteres.";
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

export function canChangeAttributeDataType(
  dependencies: AttributeDependencies,
) {
  const allowed = dependencies.options === 0 && dependencies.values === 0;
  return {
    allowed,
    reason: allowed
      ? ""
      : "No puedes cambiar el tipo de dato de un atributo que ya tiene opciones o valores registrados.",
  };
}

export function canDeleteAttribute(dependencies: AttributeDependencies) {
  const allowed = dependencies.values === 0;
  return {
    allowed,
    reason: allowed
      ? ""
      : "No puedes eliminar un atributo que ya está usado por variantes.",
  };
}

export function canDeleteAttributeOption(
  dependencies: AttributeOptionDependencies,
) {
  const allowed = dependencies.selectedValues === 0;
  return {
    allowed,
    reason: allowed
      ? ""
      : "No puedes eliminar una opción que ya está seleccionada en variantes.",
  };
}

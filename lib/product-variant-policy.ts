export type VariantAttributeInput = {
  attributeId: string;
  optionId?: string;
  value?: string;
};

type VariantAttributeDefinition = {
  active: boolean;
  dataType: "TEXT" | "NUMBER" | "OPTION" | "BOOLEAN";
  id: string;
  name: string;
  options: Array<{
    active: boolean;
    id: string;
    value: string;
  }>;
  required: boolean;
  unit?: string | null;
};

export type NormalizedVariantAttribute = {
  attributeId: string;
  optionId: string | null;
  value: string;
};

type VariantDeleteMovement = {
  note: string | null;
  reason: string;
  type: string;
};

export const INITIAL_STOCK_REASON = "Inventario inicial";
export const PRODUCT_VARIANT_INITIAL_NOTE =
  "Variante creada desde gestión de productos";
export const CATALOG_PRODUCT_INITIAL_NOTE =
  "Variante creada junto con el producto";

function cleanText(value?: string) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function normalizeVariantReference(value?: string) {
  return cleanText(value).toUpperCase();
}

export function buildVariantName(
  definitions: VariantAttributeDefinition[],
  values: NormalizedVariantAttribute[],
  reference: string,
) {
  const valueByAttribute = new Map(
    values.map((value) => [value.attributeId, value.value]),
  );
  const parts = definitions.flatMap((definition) => {
    if (!definition.active) return [];
    const value = valueByAttribute.get(definition.id);
    if (!value) return [];

    if (definition.dataType === "NUMBER" && definition.unit) {
      return [`${value} ${cleanText(definition.unit).toLocaleLowerCase("es")}`];
    }
    if (definition.dataType === "BOOLEAN") {
      return [`${definition.name}: ${value === "true" ? "Sí" : "No"}`];
    }
    return [value];
  });

  return (parts.join(" · ") || normalizeVariantReference(reference))
    .slice(0, 100)
    .trim();
}

export function validateVariantInput(input: {
  cost?: number;
  minimumStock?: number;
  name?: string;
  reference?: string;
  salePrice?: number;
  stock?: number;
}) {
  const name = cleanText(input.name);
  if (name.length < 2 || name.length > 100) {
    return "El nombre de la variante debe tener entre 2 y 100 caracteres.";
  }

  const reference = normalizeVariantReference(input.reference);
  if (reference.length < 2 || reference.length > 50) {
    return "La referencia debe tener entre 2 y 50 caracteres.";
  }

  if (!Number.isFinite(Number(input.cost)) || Number(input.cost) < 0) {
    return "El costo debe ser un número válido mayor o igual a cero.";
  }

  if (!Number.isFinite(Number(input.salePrice)) || Number(input.salePrice) < 0) {
    return "El precio de venta debe ser un número válido mayor o igual a cero.";
  }

  if (!Number.isInteger(Number(input.stock)) || Number(input.stock) < 0) {
    return "El stock inicial debe ser un número entero mayor o igual a cero.";
  }

  if (
    !Number.isInteger(Number(input.minimumStock)) ||
    Number(input.minimumStock) < 0
  ) {
    return "El stock mínimo debe ser un número entero mayor o igual a cero.";
  }

  return "";
}

export function normalizeVariantAttributes(
  definitions: VariantAttributeDefinition[],
  inputs: VariantAttributeInput[],
) {
  const inputByAttribute = new Map<string, VariantAttributeInput>();
  for (const input of inputs) {
    if (inputByAttribute.has(input.attributeId)) {
      return { error: "No repitas atributos en la misma variante.", values: [] };
    }
    inputByAttribute.set(input.attributeId, input);
  }

  const definitionById = new Map(
    definitions.map((definition) => [definition.id, definition]),
  );
  if (inputs.some((input) => !definitionById.has(input.attributeId))) {
    return {
      error: "Uno de los atributos no pertenece al tipo de producto.",
      values: [],
    };
  }

  const values: NormalizedVariantAttribute[] = [];
  for (const definition of definitions.filter((item) => item.active)) {
    const input = inputByAttribute.get(definition.id);
    const rawValue = cleanText(input?.value);

    if (!input || (!rawValue && !input.optionId)) {
      if (definition.required) {
        return {
          error: `Completa el atributo obligatorio ${definition.name}.`,
          values: [],
        };
      }
      continue;
    }

    if (definition.dataType === "OPTION") {
      const option = definition.options.find(
        (item) => item.id === input.optionId && item.active,
      );
      if (!option) {
        return {
          error: `Selecciona una opción válida para ${definition.name}.`,
          values: [],
        };
      }
      values.push({
        attributeId: definition.id,
        optionId: option.id,
        value: option.value,
      });
      continue;
    }

    if (definition.dataType === "NUMBER") {
      const numberValue = Number(rawValue.replace(",", "."));
      if (!Number.isFinite(numberValue)) {
        return {
          error: `${definition.name} debe contener un número válido.`,
          values: [],
        };
      }
      values.push({
        attributeId: definition.id,
        optionId: null,
        value: String(numberValue),
      });
      continue;
    }

    if (definition.dataType === "BOOLEAN") {
      const booleanValue = rawValue.toLowerCase();
      if (booleanValue !== "true" && booleanValue !== "false") {
        return {
          error: `${definition.name} debe indicar verdadero o falso.`,
          values: [],
        };
      }
      values.push({
        attributeId: definition.id,
        optionId: null,
        value: booleanValue,
      });
      continue;
    }

    values.push({
      attributeId: definition.id,
      optionId: null,
      value: rawValue,
    });
  }

  return { error: "", values };
}

export function canDeleteProductVariant(input: {
  activeAlternativeCount: number;
  isDefault: boolean;
  orderItemsCount: number;
  saleItemsCount: number;
  stockMovements: VariantDeleteMovement[];
  variantCount: number;
}) {
  if (input.variantCount <= 1) {
    return {
      allowed: false,
      reason: "Cada producto debe conservar al menos una variante.",
    };
  }

  if (input.orderItemsCount > 0 || input.saleItemsCount > 0) {
    return {
      allowed: false,
      reason:
        "Esta variante tiene pedidos o ventas registrados. Desactívala para conservar el historial.",
    };
  }

  const hasOnlyInitialEntries = input.stockMovements.every(
    (movement) =>
      movement.type === "ENTRY" &&
      movement.reason === INITIAL_STOCK_REASON &&
      (movement.note === PRODUCT_VARIANT_INITIAL_NOTE ||
        movement.note === CATALOG_PRODUCT_INITIAL_NOTE),
  );
  if (!hasOnlyInitialEntries) {
    return {
      allowed: false,
      reason:
        "Esta variante tiene movimientos de inventario posteriores a su creación y no puede eliminarse.",
    };
  }

  if (input.isDefault && input.activeAlternativeCount === 0) {
    return {
      allowed: false,
      reason:
        "Activa otra variante antes de eliminar la variante predeterminada.",
    };
  }

  return { allowed: true, reason: "" };
}

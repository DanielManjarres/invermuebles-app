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
};

export type NormalizedVariantAttribute = {
  attributeId: string;
  optionId: string | null;
  value: string;
};

function cleanText(value?: string) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function normalizeVariantReference(value?: string) {
  return cleanText(value).toUpperCase();
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

function cleanText(value?: string) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function normalizeCatalogProductInput(input: {
  brand?: string;
  details?: string;
  model?: string;
  name?: string;
  primaryImageUrl?: string;
}) {
  return {
    brand: cleanText(input.brand),
    details: input.details?.trim() ?? "",
    model: cleanText(input.model),
    name: cleanText(input.name),
    primaryImageUrl: input.primaryImageUrl?.trim() ?? "",
  };
}

export function validateCatalogProductInput(input: {
  brand: string;
  details: string;
  model: string;
  name: string;
  primaryImageUrl: string;
}) {
  if (input.name.length < 2 || input.name.length > 120) {
    return "El nombre del producto debe tener entre 2 y 120 caracteres.";
  }

  if (input.details.length < 2 || input.details.length > 2000) {
    return "La descripción debe tener entre 2 y 2000 caracteres.";
  }

  if (input.brand.length > 100) {
    return "La marca no puede superar los 100 caracteres.";
  }

  if (input.model.length > 100) {
    return "El modelo no puede superar los 100 caracteres.";
  }

  if (input.primaryImageUrl) {
    if (
      input.primaryImageUrl.startsWith("/") &&
      !input.primaryImageUrl.startsWith("//") &&
      !/\s/.test(input.primaryImageUrl)
    ) {
      return "";
    }

    try {
      const url = new URL(input.primaryImageUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return "La imagen principal debe usar una URL válida.";
      }
    } catch {
      return "La imagen principal debe usar una URL válida.";
    }
  }

  return "";
}

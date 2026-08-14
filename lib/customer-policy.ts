import type { CustomerStatus } from "@prisma/client";

type CustomerValidationInput = {
  document?: string;
  email?: string;
  fullName?: string;
  phone?: string;
  referencePhone?: string;
  status?: CustomerStatus;
};

type CustomerHistoryCounts = {
  credits: number;
  orders: number;
  sales: number;
};

const editableStatuses = new Set<CustomerStatus>([
  "ACTIVE",
  "INACTIVE",
  "BLOCKED",
]);

function cleanText(value?: string) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function normalizeCustomerDocument(value?: string) {
  return cleanText(value).replace(/\D/g, "");
}

function normalizePhone(value?: string) {
  return cleanText(value).replace(/\D/g, "");
}

export function isEditableCustomerStatus(
  status?: CustomerStatus
): status is CustomerStatus {
  return Boolean(status && editableStatuses.has(status));
}

export function validateCustomerInput(input: CustomerValidationInput) {
  if (!cleanText(input.fullName)) {
    return "Escribe el nombre completo del cliente.";
  }

  const document = normalizeCustomerDocument(input.document);
  if (document.length < 6 || document.length > 15) {
    return "La cédula debe tener entre 6 y 15 números.";
  }

  const phone = normalizePhone(input.phone);
  if (phone.length < 7 || phone.length > 15) {
    return "El teléfono debe tener entre 7 y 15 números.";
  }

  const referencePhone = normalizePhone(input.referencePhone);
  if (referencePhone && (referencePhone.length < 7 || referencePhone.length > 15)) {
    return "El teléfono del contacto debe tener entre 7 y 15 números.";
  }

  const email = cleanText(input.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Escribe un correo válido para el cliente.";
  }

  if (input.status && !isEditableCustomerStatus(input.status)) {
    return "Selecciona un estado válido para el cliente.";
  }

  return "";
}

export function canDeleteCustomer(history: CustomerHistoryCounts) {
  const hasHistory =
    history.credits > 0 || history.orders > 0 || history.sales > 0;

  return {
    allowed: !hasHistory,
    reason: hasHistory
      ? "Este cliente ya tiene historial de pedidos, ventas o créditos. No se puede eliminar; puedes marcarlo como inactivo para conservar sus registros."
      : "",
  };
}

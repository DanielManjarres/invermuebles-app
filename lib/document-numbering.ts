import type { Prisma } from "@prisma/client";

export const DOCUMENT_SEQUENCE_KEYS = {
  invoice: "INVOICE",
  paymentReceipt: "PAYMENT_RECEIPT",
  sale: "SALE",
} as const;

export type InitialSaleNumbering = {
  invoicePrefix: string;
  invoiceStart: number;
  saleStart: number;
};

export function normalizeInvoicePrefix(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

export function validateInitialSaleNumbering(value?: InitialSaleNumbering) {
  if (!value) return "Configura los consecutivos iniciales de venta y factura electrónica.";
  if (!Number.isInteger(value.saleStart) || value.saleStart < 1) {
    return "El primer número de venta debe ser un entero mayor que cero.";
  }
  if (!Number.isInteger(value.invoiceStart) || value.invoiceStart < 1) {
    return "El primer número de factura electrónica debe ser un entero mayor que cero.";
  }
  if (!normalizeInvoicePrefix(value.invoicePrefix)) {
    return "Indica el prefijo autorizado para la factura electrónica.";
  }
  return "";
}

export async function initializeSaleSequences(
  tx: Prisma.TransactionClient,
  value: InitialSaleNumbering,
) {
  const validationError = validateInitialSaleNumbering(value);
  if (validationError) throw new Error(`INVALID_NUMBERING:${validationError}`);

  await tx.documentSequence.createMany({
    data: [
      { key: DOCUMENT_SEQUENCE_KEYS.sale, nextNumber: value.saleStart, prefix: "" },
      {
        key: DOCUMENT_SEQUENCE_KEYS.invoice,
        nextNumber: value.invoiceStart,
        prefix: normalizeInvoicePrefix(value.invoicePrefix),
      },
    ],
    skipDuplicates: true,
  });
}

export async function consumeSequence(tx: Prisma.TransactionClient, key: string) {
  const sequence = await tx.documentSequence.update({
    data: { nextNumber: { increment: 1 } },
    where: { key },
  });
  return { number: sequence.nextNumber - 1, prefix: sequence.prefix };
}

export async function consumePaymentReceiptNumber(tx: Prisma.TransactionClient) {
  await tx.documentSequence.upsert({
    create: { key: DOCUMENT_SEQUENCE_KEYS.paymentReceipt, nextNumber: 1, prefix: "RC" },
    update: {},
    where: { key: DOCUMENT_SEQUENCE_KEYS.paymentReceipt },
  });
  return (await consumeSequence(tx, DOCUMENT_SEQUENCE_KEYS.paymentReceipt)).number;
}

export function formatInvoiceNumber(prefix: string | null, number: number | null) {
  return prefix && number ? `${prefix}-${number}` : "";
}

export function formatReceiptNumber(number: number | null) {
  return number ? `RC-${String(number).padStart(6, "0")}` : "";
}

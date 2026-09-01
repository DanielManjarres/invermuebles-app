"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { IntegerInput } from "@/components/ui/integer-input";
import type { InitialSaleNumbering } from "@/lib/document-numbering";

type NumberingSetupModalProps = {
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (numbering: InitialSaleNumbering) => Promise<boolean>;
};

export function NumberingSetupModal({
  isSaving,
  onClose,
  onSubmit,
}: NumberingSetupModalProps) {
  const [saleStart, setSaleStart] = useState<number | "">("");
  const [invoicePrefix, setInvoicePrefix] = useState("FE");
  const [invoiceStart, setInvoiceStart] = useState<number | "">("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saleStart === "" || invoiceStart === "") return;
    const saved = await onSubmit({ invoicePrefix, invoiceStart, saleStart });
    if (saved) onClose();
  }

  return (
    <div className="adminModalBackdrop" role="dialog" aria-modal="true">
      <form className="adminModal" onSubmit={handleSubmit}>
        <div className="modalHeader">
          <div>
            <p className="eyebrow">Configuración inicial</p>
            <h2>Consecutivos de ventas</h2>
          </div>
          <button className="modalClose" disabled={isSaving} type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <p className="formHint adminFormWide">
          Esta configuración se solicita una sola vez. Usa el siguiente número disponible del
          talonario físico y el rango autorizado para facturación electrónica.
        </p>
        <div className="adminFormGrid">
          <label>
            Primer número de venta (talonario)
            <IntegerInput min={1} required value={saleStart} onValueChange={setSaleStart} />
          </label>
          <label>
            Prefijo de factura electrónica
            <input
              maxLength={4}
              required
              value={invoicePrefix}
              onChange={(event) => setInvoicePrefix(event.target.value.toUpperCase())}
            />
          </label>
          <label>
            Primer número de factura electrónica
            <IntegerInput min={1} required value={invoiceStart} onValueChange={setInvoiceStart} />
          </label>
        </div>
        <div className="modalActions">
          <button className="secondaryButton" disabled={isSaving} type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primaryButton" disabled={isSaving} type="submit">
            {isSaving ? "Guardando..." : "Configurar y registrar venta"}
          </button>
        </div>
      </form>
    </div>
  );
}

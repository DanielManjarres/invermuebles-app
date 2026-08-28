import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useRef } from "react";
import { SelectMenu } from "@/components/ui/select-menu";
import { useModalAccessibility } from "@/components/ui/use-modal-accessibility";
import { customerStatusLabels, type AdminCustomer } from "@/lib/customers";

export type CustomerFormState = {
  address: string;
  city: string;
  document: string;
  email: string;
  fullName: string;
  neighborhood: string;
  notes: string;
  phone: string;
  referenceName: string;
  referencePhone: string;
  referenceRelation: string;
  status: AdminCustomer["status"];
};

type CustomerFormModalProps = {
  error: string;
  form: CustomerFormState;
  isEditing: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setForm: Dispatch<SetStateAction<CustomerFormState>>;
};

const customerStatusOptions: Array<{
  label: string;
  value: AdminCustomer["status"];
}> = ["ACTIVE", "INACTIVE", "BLOCKED"].map((status) => ({
  label: customerStatusLabels[status as AdminCustomer["status"]],
  value: status as AdminCustomer["status"],
}));

export function CustomerFormModal({
  error,
  form,
  isEditing,
  isSaving,
  onClose,
  onSubmit,
  setForm,
}: CustomerFormModalProps) {
  const dialogRef = useRef<HTMLFormElement>(null);
  const titleId = isEditing
    ? "edit-customer-dialog-title"
    : "create-customer-dialog-title";
  const errorId = `${titleId}-error`;

  useModalAccessibility({
    blockClose: isSaving,
    dialogRef,
    onClose,
  });

  function updateField<Key extends keyof CustomerFormState>(
    field: Key,
    value: CustomerFormState[Key]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="modalOverlay" role="presentation">
      <form
        aria-busy={isSaving}
        aria-describedby={error ? errorId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="adminModal customerModal"
        onSubmit={onSubmit}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="modalHeader">
          <div>
            <p className="eyebrow">
              {isEditing ? "Editar cliente" : "Nuevo cliente"}
            </p>
            <h2 id={titleId}>
              {isEditing ? "Actualizar cliente" : "Registrar cliente"}
            </h2>
          </div>
          <button
            aria-label="Cerrar formulario"
            className="modalClose"
            disabled={isSaving}
            type="button"
            onClick={onClose}
          >
            x
          </button>
        </div>

        {error ? (
          <div className="formError" id={errorId} role="alert">
            {error}
          </div>
        ) : null}

        <div className="adminFormGrid">
          <label>
            Nombre completo
            <input
              placeholder="Ej: Daniel Manjarres"
              value={form.fullName}
              onChange={(event) => updateField("fullName", event.target.value)}
            />
          </label>
          <label>
            Cédula
            <input
              inputMode="numeric"
              placeholder="Ej: 1094..."
              value={form.document}
              onChange={(event) => updateField("document", event.target.value)}
            />
          </label>
          <label>
            Teléfono
            <input
              inputMode="tel"
              placeholder="Ej: 321 6417360"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
            />
          </label>
          <label>
            Correo
            <input
              placeholder="Ej: cliente@correo.com"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
            />
          </label>
          <label>
            Estado
            <SelectMenu
              options={customerStatusOptions}
              placeholder="Selecciona un estado"
              value={form.status}
              onChange={(value) =>
                updateField(
                  "status",
                  (value || "ACTIVE") as AdminCustomer["status"]
                )
              }
            />
          </label>
          <label>
            Dirección
            <input
              placeholder="Ej: Carrera 25 #33-44"
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
            />
          </label>
          <label>
            Barrio
            <input
              placeholder="Ej: Centro"
              value={form.neighborhood}
              onChange={(event) => updateField("neighborhood", event.target.value)}
            />
          </label>
          <label>
            Ciudad
            <input
              placeholder="Ej: Calarcá"
              value={form.city}
              onChange={(event) => updateField("city", event.target.value)}
            />
          </label>
          <label>
            Nombre del contacto de referencia
            <input
              placeholder="Ej: María Gómez"
              value={form.referenceName}
              onChange={(event) => updateField("referenceName", event.target.value)}
            />
          </label>
          <label>
            Relación con el cliente
            <input
              placeholder="Ej: Madre, hermano, vecino"
              value={form.referenceRelation}
              onChange={(event) =>
                updateField("referenceRelation", event.target.value)
              }
            />
          </label>
          <label>
            Teléfono del contacto
            <input
              inputMode="tel"
              placeholder="Ej: 310 555 1234"
              value={form.referencePhone}
              onChange={(event) =>
                updateField("referencePhone", event.target.value)
              }
            />
          </label>
        </div>

        <label className="adminFormSingle">
          Observaciones
          <textarea
            placeholder="Ej: Cliente frecuente, pendiente validar crédito, etc."
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
          />
        </label>

        <div className="modalActions">
          <button className="secondaryButton" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primaryButton" disabled={isSaving} type="submit">
            {isSaving ? "Guardando..." : "Guardar cliente"}
          </button>
        </div>
      </form>
    </div>
  );
}

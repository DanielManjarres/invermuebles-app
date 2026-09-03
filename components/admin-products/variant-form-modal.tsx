"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import type {
  CatalogProductRecord,
  CatalogProductType,
  CatalogProductVariant,
} from "@/lib/catalog-products";
import { VariantPricingFields } from "@/components/admin-products/variant-pricing-fields";
import { IntegerInput } from "@/components/ui/integer-input";
import { SelectMenu } from "@/components/ui/select-menu";
import { useModalAccessibility } from "@/components/ui/use-modal-accessibility";

type VariantFormModalProps = {
  onClose: () => void;
  product: CatalogProductRecord;
  productType: CatalogProductType;
  variant?: CatalogProductVariant;
};

type VariantFormState = {
  active: boolean;
  attributeValues: Record<string, string>;
  baseCost: number;
  location: string;
  minimumStock: number;
  reference: string;
  salePrice: number;
  stock: number;
};

function createForm(variant?: CatalogProductVariant): VariantFormState {
  return {
    active: variant?.active ?? true,
    attributeValues: Object.fromEntries(
      (variant?.attributeValues ?? []).map((value) => [
        value.attributeId,
        value.optionId || value.value,
      ]),
    ),
    baseCost: variant?.baseCost ?? 0,
    location: variant?.location ?? "",
    minimumStock: variant?.minimumStock ?? 0,
    reference: variant?.reference ?? "",
    salePrice: variant?.salePrice ?? 0,
    stock: 0,
  };
}

export function VariantFormModal({
  onClose,
  product,
  productType,
  variant,
}: VariantFormModalProps) {
  const [form, setForm] = useState(() => createForm(variant));
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dialogRef = useRef<HTMLFormElement>(null);
  const activeAttributes = useMemo(
    () => productType.attributes.filter((attribute) => attribute.active),
    [productType.attributes],
  );
  const isEditing = Boolean(variant);
  const titleId = isEditing ? "edit-variant-dialog-title" : "create-variant-dialog-title";
  const errorId = `${titleId}-error`;
  const warningId = `${titleId}-delete-warning`;
  const describedBy = [confirmDelete ? warningId : "", error ? errorId : ""]
    .filter(Boolean)
    .join(" ") || undefined;

  useModalAccessibility({
    blockClose: isSaving || isDeleting,
    dialogRef,
    onClose,
  });

  function updateForm(changes: Partial<VariantFormState>) {
    setForm((current) => ({ ...current, ...changes }));
  }

  function buildAttributeValues() {
    return activeAttributes
      .filter((attribute) => form.attributeValues[attribute.id])
      .map((attribute) =>
        attribute.dataType === "OPTION"
          ? {
              attributeId: attribute.id,
              optionId: form.attributeValues[attribute.id],
            }
          : {
              attributeId: attribute.id,
              value: form.attributeValues[attribute.id],
            },
      );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    const response = await fetch(
      isEditing ? `/api/product-variants/${variant?.id}` : "/api/product-variants",
      {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active: form.active,
          attributeValues: buildAttributeValues(),
          baseCost: form.baseCost,
          location: form.location,
          minimumStock: form.minimumStock,
          productId: product.id,
          reference: form.reference,
          salePrice: form.salePrice,
          ...(isEditing ? {} : { stock: form.stock }),
        }),
      },
    ).catch(() => null);
    setIsSaving(false);
    const result = response
      ? ((await response.json().catch(() => ({}))) as { message?: string })
      : {};
    if (!response?.ok) {
      setError(result.message ?? "No se pudo guardar la variante.");
      return;
    }
    window.location.reload();
  }

  async function deleteVariant() {
    if (!variant) return;
    setError("");
    setIsDeleting(true);
    const response = await fetch(`/api/product-variants/${variant.id}`, {
      method: "DELETE",
    }).catch(() => null);
    setIsDeleting(false);
    const result = response
      ? ((await response.json().catch(() => ({}))) as { message?: string })
      : {};
    if (!response?.ok) {
      setError(result.message ?? "No se pudo eliminar la variante.");
      setConfirmDelete(false);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="adminModalBackdrop" role="presentation">
      <form
        aria-busy={isSaving || isDeleting}
        aria-describedby={describedBy}
        aria-labelledby={titleId}
        aria-modal="true"
        className="adminModal catalogProductModal"
        onSubmit={handleSubmit}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="modalHeader">
          <div>
            <p className="eyebrow">{isEditing ? "Editar variante" : "Nueva variante"}</p>
            <h2 id={titleId}>{product.name}</h2>
          </div>
          <button
            aria-label="Cerrar formulario de variante"
            className="modalClose"
            disabled={isSaving || isDeleting}
            type="button"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="catalogProductModalBody">
          <div className="adminFormGrid">
          <label>
            Referencia
            <input
              maxLength={50}
              required
              value={form.reference}
              onChange={(event) => updateForm({ reference: event.target.value })}
            />
          </label>
          <div className="formHint">
            El nombre se genera automáticamente con los atributos de la variante.
          </div>
          <VariantPricingFields
            baseCost={form.baseCost}
            salePrice={form.salePrice}
            onChange={(pricing) => updateForm(pricing)}
          />
          {!isEditing ? (
            <label>
              Stock inicial
              <IntegerInput
                allowEmpty={false}
                min={0}
                onValueChange={(stock) => {
                  if (stock !== "") updateForm({ stock });
                }}
                required
                value={form.stock}
              />
            </label>
          ) : (
            <div className="formHint">
              Stock actual: <strong>{variant?.stock}</strong>. Los cambios de existencias se
              registran desde Inventario.
            </div>
          )}
          <label>
            Stock mínimo
            <IntegerInput
              allowEmpty={false}
              min={0}
              onValueChange={(minimumStock) => {
                if (minimumStock !== "") updateForm({ minimumStock });
              }}
              required
              value={form.minimumStock}
            />
          </label>
          <label>
            Ubicación
            <input
              value={form.location}
              onChange={(event) => updateForm({ location: event.target.value })}
            />
          </label>

          {activeAttributes.map((attribute) => (
            <label key={attribute.id}>
              {attribute.name}{attribute.unit ? ` (${attribute.unit})` : ""}
              {attribute.dataType === "OPTION" ? (
                <SelectMenu
                  options={attribute.options
                    .filter((option) => option.active)
                    .map((option) => ({
                      label: option.value,
                      value: option.id,
                    }))}
                  placeholder="Selecciona una opción"
                  value={form.attributeValues[attribute.id] ?? ""}
                  onChange={(value) =>
                    updateForm({
                      attributeValues: {
                        ...form.attributeValues,
                        [attribute.id]: value,
                      },
                    })
                  }
                />
              ) : attribute.dataType === "BOOLEAN" ? (
                <SelectMenu
                  options={[
                    { label: "Sí", value: "true" },
                    { label: "No", value: "false" },
                  ]}
                  placeholder="Selecciona"
                  value={form.attributeValues[attribute.id] ?? ""}
                  onChange={(value) =>
                    updateForm({
                      attributeValues: {
                        ...form.attributeValues,
                        [attribute.id]: value,
                      },
                    })
                  }
                />
              ) : (
                <input
                  inputMode={attribute.dataType === "NUMBER" ? "decimal" : undefined}
                  required={attribute.required}
                  value={form.attributeValues[attribute.id] ?? ""}
                  onChange={(event) =>
                    updateForm({
                      attributeValues: {
                        ...form.attributeValues,
                        [attribute.id]: event.target.value,
                      },
                    })
                  }
                />
              )}
            </label>
          ))}

          <label className="checkRow">
            <input
              checked={form.active}
              type="checkbox"
              onChange={(event) => updateForm({ active: event.target.checked })}
            />
            Variante activa
          </label>
          </div>

          {confirmDelete ? (
            <div className="recordDeleteWarning" id={warningId}>
              <p>
                Se eliminarán esta variante y únicamente su entrada inicial. No se permite
                si tiene ventas, pedidos o movimientos posteriores.
              </p>
            </div>
          ) : null}
          {error ? <p className="formError" id={errorId}>{error}</p> : null}
        </div>
        <div className="modalActions variantModalActions">
          {variant ? (
            confirmDelete ? (
              <button
                className="dangerButton"
                disabled={isDeleting}
                type="button"
                onClick={deleteVariant}
              >
                <Trash2 size={16} />
                {isDeleting ? "Eliminando..." : "Confirmar eliminación"}
              </button>
            ) : (
              <button
                className="dangerButton"
                type="button"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={16} />
                Eliminar variante
              </button>
            )
          ) : null}
          <button className="secondaryButton" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primaryButton" disabled={isSaving || isDeleting}>
            {isSaving ? "Guardando..." : "Guardar variante"}
          </button>
        </div>
      </form>
    </div>
  );
}

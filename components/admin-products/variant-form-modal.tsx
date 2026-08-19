"use client";

import { FormEvent, useMemo, useState } from "react";
import { Trash2, X } from "lucide-react";
import type {
  CatalogProductRecord,
  CatalogProductType,
  CatalogProductVariant,
} from "@/lib/catalog-products";
import { ProductMoneyField } from "@/components/admin-products/form-controls";

type VariantFormModalProps = {
  onClose: () => void;
  product: CatalogProductRecord;
  productType: CatalogProductType;
  variant?: CatalogProductVariant;
};

type VariantFormState = {
  active: boolean;
  attributeValues: Record<string, string>;
  cost: number;
  isDefault: boolean;
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
    cost: variant?.cost ?? 0,
    isDefault: variant?.isDefault ?? false,
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
  const activeAttributes = useMemo(
    () => productType.attributes.filter((attribute) => attribute.active),
    [productType.attributes],
  );
  const isEditing = Boolean(variant);

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
          cost: form.cost,
          isDefault: form.isDefault,
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
    <div className="adminModalBackdrop" role="dialog" aria-modal="true">
      <form className="adminModal catalogProductModal" onSubmit={handleSubmit}>
        <div className="modalHeader">
          <div>
            <p className="eyebrow">{isEditing ? "Editar variante" : "Nueva variante"}</p>
            <h2>{product.name}</h2>
          </div>
          <button className="modalClose" type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

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
          <ProductMoneyField
            label="Costo"
            value={form.cost}
            onChange={(cost) => updateForm({ cost })}
          />
          <ProductMoneyField
            label="Precio de venta"
            value={form.salePrice}
            onChange={(salePrice) => updateForm({ salePrice })}
          />
          {!isEditing ? (
            <label>
              Stock inicial
              <input
                min={0}
                required
                type="number"
                value={form.stock}
                onChange={(event) => updateForm({ stock: Number(event.target.value) })}
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
            <input
              min={0}
              required
              type="number"
              value={form.minimumStock}
              onChange={(event) =>
                updateForm({ minimumStock: Number(event.target.value) })
              }
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
                <select
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
                >
                  <option value="">Selecciona una opción</option>
                  {attribute.options
                    .filter((option) => option.active)
                    .map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.value}
                      </option>
                    ))}
                </select>
              ) : attribute.dataType === "BOOLEAN" ? (
                <select
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
                >
                  <option value="">Selecciona</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
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
              disabled={variant?.isDefault}
              type="checkbox"
              onChange={(event) => updateForm({ active: event.target.checked })}
            />
            Variante activa
          </label>
          <label className="checkRow">
            <input
              checked={form.isDefault}
              disabled={variant?.isDefault}
              type="checkbox"
              onChange={(event) => updateForm({ isDefault: event.target.checked })}
            />
            Variante predeterminada
          </label>
        </div>

        {confirmDelete ? (
          <div className="recordDeleteWarning">
            <p>
              Se eliminarán esta variante y únicamente su entrada inicial. No se permite
              si tiene ventas, pedidos o movimientos posteriores.
            </p>
          </div>
        ) : null}
        {error ? <p className="formError">{error}</p> : null}
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

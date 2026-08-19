"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { Upload, X } from "lucide-react";
import type {
  CatalogCategory,
  CatalogProductRecord,
} from "@/lib/catalog-products";
import { ProductMoneyField } from "@/components/admin-products/form-controls";

type ProductFormModalProps = {
  categories: CatalogCategory[];
  onClose: () => void;
  product?: CatalogProductRecord;
};

type ProductFormState = {
  attributeValues: Record<string, string>;
  brand: string;
  categoryId: string;
  cost: number;
  details: string;
  imageUrl: string;
  location: string;
  minimumStock: number;
  model: string;
  name: string;
  productTypeId: string;
  reference: string;
  salePrice: number;
  stock: number;
  variantName: string;
  visible: boolean;
};

function createForm(product?: CatalogProductRecord): ProductFormState {
  return {
    attributeValues: {},
    brand: product?.brand ?? "",
    categoryId: product?.categoryId ?? "",
    cost: 0,
    details: product?.details ?? "",
    imageUrl: product?.imageUrl ?? "",
    location: "",
    minimumStock: 0,
    model: product?.model ?? "",
    name: product?.name ?? "",
    productTypeId: product?.productTypeId ?? "",
    reference: "",
    salePrice: 0,
    stock: 0,
    variantName: "",
    visible: product?.visible ?? false,
  };
}

export function ProductFormModal({
  categories,
  onClose,
  product,
}: ProductFormModalProps) {
  const [form, setForm] = useState(() => createForm(product));
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === form.categoryId),
    [categories, form.categoryId],
  );
  const selectedType = useMemo(
    () =>
      selectedCategory?.productTypes.find(
        (productType) => productType.id === form.productTypeId,
      ),
    [form.productTypeId, selectedCategory],
  );
  const isEditing = Boolean(product);

  function updateForm(changes: Partial<ProductFormState>) {
    setForm((current) => ({ ...current, ...changes }));
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setError("Selecciona una imagen PNG, JPG o WEBP de máximo 5 MB.");
      return;
    }

    const data = new FormData();
    data.append("image", file);
    setError("");
    setIsUploading(true);
    const response = await fetch("/api/product-images", {
      method: "POST",
      body: data,
    }).catch(() => null);
    setIsUploading(false);
    const result = response
      ? ((await response.json().catch(() => ({}))) as {
          imageUrl?: string;
          message?: string;
        })
      : {};
    if (!response?.ok || !result.imageUrl) {
      setError(result.message ?? "No se pudo subir la imagen.");
      return;
    }
    updateForm({ imageUrl: result.imageUrl });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isEditing && (!form.categoryId || !form.productTypeId)) {
      setError("Selecciona la categoría y el tipo de producto.");
      return;
    }

    setError("");
    setIsSaving(true);
    const response = await fetch(
      isEditing ? `/api/catalog-products/${product?.id}` : "/api/catalog-products",
      {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditing
            ? {
                brand: form.brand,
                details: form.details,
                model: form.model,
                name: form.name,
                primaryImageUrl: form.imageUrl,
                visible: form.visible,
              }
            : {
                brand: form.brand,
                catalogProductTypeId: form.productTypeId,
                defaultVariant: {
                  attributeValues: (selectedType?.attributes ?? [])
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
                    ),
                  cost: form.cost,
                  location: form.location,
                  minimumStock: form.minimumStock,
                  name: form.variantName,
                  reference: form.reference,
                  salePrice: form.salePrice,
                  stock: form.stock,
                },
                details: form.details,
                model: form.model,
                name: form.name,
                primaryImageUrl: form.imageUrl,
                visible: form.visible,
              },
        ),
      },
    ).catch(() => null);
    setIsSaving(false);

    const result = response
      ? ((await response.json().catch(() => ({}))) as { message?: string })
      : {};
    if (!response?.ok) {
      setError(result.message ?? "No se pudo guardar el producto.");
      return;
    }

    window.location.reload();
  }

  return (
    <div className="adminModalBackdrop" role="dialog" aria-modal="true">
      <form className="adminModal catalogProductModal" onSubmit={handleSubmit}>
        <div className="modalHeader">
          <div>
            <p className="eyebrow">{isEditing ? "Editar producto" : "Nuevo producto"}</p>
            <h2>{isEditing ? product?.name : "Registrar producto"}</h2>
          </div>
          <button className="modalClose" type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="adminFormGrid">
          <label>
            Nombre
            <input
              maxLength={120}
              required
              value={form.name}
              onChange={(event) => updateForm({ name: event.target.value })}
            />
          </label>
          <label>
            Marca
            <input
              maxLength={100}
              value={form.brand}
              onChange={(event) => updateForm({ brand: event.target.value })}
            />
          </label>
          <label>
            Modelo
            <input
              maxLength={100}
              value={form.model}
              onChange={(event) => updateForm({ model: event.target.value })}
            />
          </label>
          {!isEditing ? (
            <>
              <label>
                Categoría
                <select
                  required
                  value={form.categoryId}
                  onChange={(event) =>
                    updateForm({
                      attributeValues: {},
                      categoryId: event.target.value,
                      productTypeId: "",
                    })
                  }
                >
                  <option value="">Selecciona una categoría</option>
                  {categories
                    .filter((category) => category.active)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Tipo de producto
                <select
                  required
                  value={form.productTypeId}
                  onChange={(event) =>
                    updateForm({
                      attributeValues: {},
                      productTypeId: event.target.value,
                    })
                  }
                >
                  <option value="">Selecciona un tipo</option>
                  {(selectedCategory?.productTypes ?? [])
                    .filter((productType) => productType.active)
                    .map((productType) => (
                      <option key={productType.id} value={productType.id}>
                        {productType.name}
                      </option>
                    ))}
                </select>
              </label>
            </>
          ) : (
            <div className="adminFormWide formHint">
              Clasificación: <strong>{product?.categoryName}</strong> / {product?.productTypeName}.
              La clasificación no cambia al editar los datos generales.
            </div>
          )}
          <label className="adminFormWide">
            Descripción
            <textarea
              maxLength={2000}
              required
              rows={3}
              value={form.details}
              onChange={(event) => updateForm({ details: event.target.value })}
            />
          </label>
          <label className="adminFormWide">
            Imagen principal
            <input
              placeholder="URL externa o ruta de una imagen subida"
              value={form.imageUrl}
              onChange={(event) => updateForm({ imageUrl: event.target.value })}
            />
            <span className="uploadImageControl">
              <Upload size={16} />
              {isUploading ? "Subiendo imagen..." : "Subir imagen"}
              <input
                accept="image/png,image/jpeg,image/webp"
                disabled={isUploading}
                type="file"
                onChange={handleImageUpload}
              />
            </span>
          </label>

          {!isEditing ? (
            <>
              <div className="adminFormWide catalogFormSectionTitle">
                <strong>Variante predeterminada</strong>
                <span>Define la primera presentación y su inventario inicial.</span>
              </div>
              <label>
                Nombre de la variante
                <input
                  maxLength={100}
                  required
                  placeholder="Ej: 55 pulgadas"
                  value={form.variantName}
                  onChange={(event) => updateForm({ variantName: event.target.value })}
                />
              </label>
              <label>
                Referencia
                <input
                  maxLength={50}
                  required
                  value={form.reference}
                  onChange={(event) => updateForm({ reference: event.target.value })}
                />
              </label>
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
              {(selectedType?.attributes ?? [])
                .filter((attribute) => attribute.active)
                .map((attribute) => (
                  <label key={attribute.id}>
                    {attribute.name}
                    {attribute.unit ? ` (${attribute.unit})` : ""}
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
            </>
          ) : null}

          <label className="checkRow adminFormWide">
            <input
              checked={form.visible}
              type="checkbox"
              onChange={(event) => updateForm({ visible: event.target.checked })}
            />
            Mostrar en el catálogo web
          </label>
        </div>

        {error ? <p className="formError">{error}</p> : null}
        <div className="modalActions">
          <button className="secondaryButton" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primaryButton" disabled={isSaving || isUploading}>
            {isSaving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear producto"}
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { FormEvent, useMemo, useState } from "react";
import { Pencil, Plus, Settings2, Trash2, X } from "lucide-react";
import { SelectMenu } from "@/components/select-menu";
import type {
  CatalogAttributeDataType,
  CatalogCategory,
} from "@/lib/catalog-products";

type TaxonomyManagerProps = {
  categories: CatalogCategory[];
};

type TaxonomyTarget = {
  endpoint: string;
  field: "name" | "value";
  id: string;
  label: string;
};

async function mutateTaxonomy(
  endpoint: string,
  method: "POST" | "PUT" | "DELETE",
  body: Record<string, unknown>,
) {
  const response = await fetch(endpoint, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  const result = response
    ? ((await response.json().catch(() => ({}))) as { message?: string })
    : {};
  if (!response?.ok) {
    throw new Error(result.message ?? "No se pudo guardar la configuración.");
  }
}

export function TaxonomyManager({ categories }: TaxonomyManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [productTypeId, setProductTypeId] = useState(
    categories[0]?.productTypes[0]?.id ?? "",
  );
  const [categoryName, setCategoryName] = useState("");
  const [productTypeName, setProductTypeName] = useState("");
  const [attributeName, setAttributeName] = useState("");
  const [attributeType, setAttributeType] =
    useState<CatalogAttributeDataType>("TEXT");
  const [attributeUnit, setAttributeUnit] = useState("");
  const [attributeRequired, setAttributeRequired] = useState(false);
  const [optionAttributeId, setOptionAttributeId] = useState("");
  const [optionValue, setOptionValue] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editTarget, setEditTarget] = useState<TaxonomyTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaxonomyTarget | null>(null);
  const [editValue, setEditValue] = useState("");

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId),
    [categories, categoryId],
  );
  const selectedType = useMemo(
    () =>
      selectedCategory?.productTypes.find(
        (productType) => productType.id === productTypeId,
      ) ?? selectedCategory?.productTypes[0],
    [productTypeId, selectedCategory],
  );
  const optionAttributes = (selectedType?.attributes ?? []).filter(
    (attribute) => attribute.dataType === "OPTION",
  );
  const categoryOptions = categories.map((category) => ({
    label: `${category.name}${category.active ? "" : " (inactiva)"}`,
    value: category.id,
  }));
  const productTypeOptions = (selectedCategory?.productTypes ?? []).map(
    (productType) => ({
      label: `${productType.name}${productType.active ? "" : " (inactivo)"}`,
      value: productType.id,
    }),
  );

  async function runMutation(action: () => Promise<void>) {
    setError("");
    setIsSaving(true);
    try {
      await action();
      window.location.reload();
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "No se pudo guardar la configuración.",
      );
      setIsSaving(false);
    }
  }

  function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runMutation(() =>
      mutateTaxonomy("/api/product-categories", "POST", { name: categoryName }),
    );
  }

  function addProductType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runMutation(() =>
      mutateTaxonomy("/api/catalog-product-types", "POST", {
        categoryId,
        name: productTypeName,
      }),
    );
  }

  function addAttribute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runMutation(() =>
      mutateTaxonomy("/api/product-attributes", "POST", {
        dataType: attributeType,
        name: attributeName,
        productTypeId: selectedType?.id,
        required: attributeRequired,
        unit: attributeType === "NUMBER" ? attributeUnit : "",
      }),
    );
  }

  function addOption(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runMutation(() =>
      mutateTaxonomy("/api/product-attribute-options", "POST", {
        attributeId: optionAttributeId,
        value: optionValue,
      }),
    );
  }

  function openEdit(target: TaxonomyTarget) {
    setError("");
    setEditTarget(target);
    setEditValue(target.label);
  }

  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editTarget) return;
    void runMutation(() =>
      mutateTaxonomy(editTarget.endpoint, "PUT", {
        id: editTarget.id,
        [editTarget.field]: editValue,
      }),
    );
  }

  function deleteSelected() {
    if (!deleteTarget) return;
    void runMutation(() =>
      mutateTaxonomy(deleteTarget.endpoint, "DELETE", { id: deleteTarget.id }),
    );
  }

  return (
    <section className="tableSection catalogTaxonomySection">
      <div className="catalogTaxonomyToggle">
        <div>
          <p className="eyebrow">Configuración de productos</p>
          <h2>Categorías, tipos y atributos</h2>
          <p>Define la estructura que usarán los productos y sus variantes.</p>
        </div>
        <button
          className="secondaryButton"
          type="button"
          onClick={() => setIsOpen((current) => !current)}
        >
          <Settings2 size={17} />
          {isOpen ? "Cerrar configuración" : "Administrar estructura"}
        </button>
      </div>

      {isOpen ? (
        <div className="catalogTaxonomyWorkspace">
          <div className="catalogTaxonomyForms">
            <form onSubmit={addCategory}>
              <label>
                Nueva categoría
                <input
                  required
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                />
              </label>
              <button className="primaryButton" disabled={isSaving}>
                <Plus size={15} /> Agregar
              </button>
            </form>

            <form onSubmit={addProductType}>
              <label>
                Categoría
                <SelectMenu
                  disabled={!categories.length}
                  options={categoryOptions}
                  placeholder={
                    categories.length ? "Selecciona una categoría" : "Primero crea una categoría"
                  }
                  value={categoryId}
                  onChange={(value) => {
                    const nextCategory = categories.find(
                      (category) => category.id === value,
                    );
                    setCategoryId(value);
                    setProductTypeId(nextCategory?.productTypes[0]?.id ?? "");
                  }}
                />
              </label>
              <label>
                Nuevo tipo de producto
                <input
                  disabled={!categories.length}
                  required
                  value={productTypeName}
                  onChange={(event) => setProductTypeName(event.target.value)}
                />
              </label>
              <button className="primaryButton" disabled={isSaving || !categoryId}>
                <Plus size={15} /> Agregar
              </button>
            </form>
          </div>

          <div className="catalogTaxonomySelector">
            <label>
              Categoría a configurar
              <SelectMenu
                disabled={!categories.length}
                options={categoryOptions}
                placeholder={
                  categories.length ? "Selecciona una categoría" : "Sin categorías registradas"
                }
                value={categoryId}
                onChange={(value) => {
                  const nextCategory = categories.find(
                    (category) => category.id === value,
                  );
                  setCategoryId(value);
                  setProductTypeId(nextCategory?.productTypes[0]?.id ?? "");
                }}
              />
            </label>
            <label>
              Tipo de producto
              <SelectMenu
                disabled={!selectedCategory?.productTypes.length}
                options={productTypeOptions}
                placeholder={
                  selectedCategory?.productTypes.length
                    ? "Selecciona un tipo"
                    : "Sin tipos registrados"
                }
                value={selectedType?.id ?? ""}
                onChange={(value) => {
                  setProductTypeId(value);
                  setOptionAttributeId("");
                }}
              />
            </label>
          </div>

          {selectedCategory ? (
            <div className="catalogTaxonomySelectedActions">
              <strong>{selectedCategory.name}</strong>
              <button
                className="secondaryButton"
                disabled={isSaving}
                type="button"
                onClick={() =>
                  void runMutation(() =>
                    mutateTaxonomy("/api/product-categories", "PUT", {
                      active: !selectedCategory.active,
                      id: selectedCategory.id,
                    }),
                  )
                }
              >
                {selectedCategory.active ? "Desactivar categoría" : "Activar categoría"}
              </button>
              <button
                className="secondaryButton"
                type="button"
                onClick={() =>
                  openEdit({
                    endpoint: "/api/product-categories",
                    field: "name",
                    id: selectedCategory.id,
                    label: selectedCategory.name,
                  })
                }
              >
                <Pencil size={14} /> Editar
              </button>
              <button
                className="dangerButton"
                type="button"
                onClick={() =>
                  setDeleteTarget({
                    endpoint: "/api/product-categories",
                    field: "name",
                    id: selectedCategory.id,
                    label: selectedCategory.name,
                  })
                }
              >
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          ) : null}

          {selectedType ? (
            <div className="catalogTaxonomySelectedActions">
              <strong>{selectedType.name}</strong>
              <button
                className="secondaryButton"
                disabled={isSaving}
                type="button"
                onClick={() =>
                  void runMutation(() =>
                    mutateTaxonomy("/api/catalog-product-types", "PUT", {
                      active: !selectedType.active,
                      id: selectedType.id,
                    }),
                  )
                }
              >
                {selectedType.active ? "Desactivar tipo" : "Activar tipo"}
              </button>
              <button
                className="secondaryButton"
                type="button"
                onClick={() =>
                  openEdit({
                    endpoint: "/api/catalog-product-types",
                    field: "name",
                    id: selectedType.id,
                    label: selectedType.name,
                  })
                }
              >
                <Pencil size={14} /> Editar
              </button>
              <button
                className="dangerButton"
                type="button"
                onClick={() =>
                  setDeleteTarget({
                    endpoint: "/api/catalog-product-types",
                    field: "name",
                    id: selectedType.id,
                    label: selectedType.name,
                  })
                }
              >
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          ) : null}

          {selectedType ? (
            <>
              <form className="catalogAttributeForm" onSubmit={addAttribute}>
                <label>
                  Nombre del atributo
                  <input
                    required
                    placeholder="Ej: Color, pulgadas o material"
                    value={attributeName}
                    onChange={(event) => setAttributeName(event.target.value)}
                  />
                </label>
                <label>
                  Tipo de dato
                  <select
                    value={attributeType}
                    onChange={(event) =>
                      setAttributeType(event.target.value as CatalogAttributeDataType)
                    }
                  >
                    <option value="TEXT">Texto</option>
                    <option value="NUMBER">Número</option>
                    <option value="OPTION">Lista de opciones</option>
                    <option value="BOOLEAN">Sí / No</option>
                  </select>
                </label>
                {attributeType === "NUMBER" ? (
                  <label>
                    Unidad
                    <input
                      placeholder="cm, kg, pulgadas..."
                      value={attributeUnit}
                      onChange={(event) => setAttributeUnit(event.target.value)}
                    />
                  </label>
                ) : null}
                <label className="checkRow">
                  <input
                    checked={attributeRequired}
                    type="checkbox"
                    onChange={(event) => setAttributeRequired(event.target.checked)}
                  />
                  Obligatorio
                </label>
                <button className="primaryButton" disabled={isSaving}>
                  <Plus size={15} /> Agregar atributo
                </button>
              </form>

              <div className="catalogAttributeList">
                {selectedType.attributes.map((attribute) => (
                  <article key={attribute.id}>
                    <div>
                      <strong>{attribute.name}</strong>
                      <span>
                        {attribute.dataType}
                        {attribute.unit ? ` · ${attribute.unit}` : ""}
                        {attribute.required ? " · Obligatorio" : " · Opcional"}
                      </span>
                      {attribute.dataType === "OPTION" && attribute.options.length ? (
                        <span className="catalogAttributeOptions">
                          {attribute.options.map((option) => (
                            <span className="catalogAttributeOption" key={option.id}>
                              <button
                                className={option.active ? "active" : ""}
                                disabled={isSaving}
                                type="button"
                                onClick={() =>
                                  void runMutation(() =>
                                    mutateTaxonomy(
                                      "/api/product-attribute-options",
                                      "PUT",
                                      { active: !option.active, id: option.id },
                                    ),
                                  )
                                }
                              >
                                {option.value}
                              </button>
                              <button
                                aria-label={`Editar ${option.value}`}
                                type="button"
                                onClick={() =>
                                  openEdit({
                                    endpoint: "/api/product-attribute-options",
                                    field: "value",
                                    id: option.id,
                                    label: option.value,
                                  })
                                }
                              >
                                <Pencil size={11} />
                              </button>
                              <button
                                aria-label={`Eliminar ${option.value}`}
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    endpoint: "/api/product-attribute-options",
                                    field: "value",
                                    id: option.id,
                                    label: option.value,
                                  })
                                }
                              >
                                <Trash2 size={11} />
                              </button>
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </div>
                    <div className="catalogAttributeActions">
                      <button
                        className="secondaryButton"
                        disabled={isSaving}
                        type="button"
                        onClick={() =>
                          void runMutation(() =>
                            mutateTaxonomy("/api/product-attributes", "PUT", {
                              active: !attribute.active,
                              id: attribute.id,
                            }),
                          )
                        }
                      >
                        {attribute.active ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        className="secondaryButton"
                        type="button"
                        onClick={() =>
                          openEdit({
                            endpoint: "/api/product-attributes",
                            field: "name",
                            id: attribute.id,
                            label: attribute.name,
                          })
                        }
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="dangerButton"
                        type="button"
                        onClick={() =>
                          setDeleteTarget({
                            endpoint: "/api/product-attributes",
                            field: "name",
                            id: attribute.id,
                            label: attribute.name,
                          })
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              {optionAttributes.length ? (
                <form className="catalogOptionForm" onSubmit={addOption}>
                  <label>
                    Atributo con opciones
                    <select
                      required
                      value={optionAttributeId}
                      onChange={(event) => setOptionAttributeId(event.target.value)}
                    >
                      <option value="">Selecciona</option>
                      {optionAttributes.map((attribute) => (
                        <option key={attribute.id} value={attribute.id}>
                          {attribute.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Nueva opción
                    <input
                      required
                      placeholder="Ej: Nogal, gris, 55 pulgadas"
                      value={optionValue}
                      onChange={(event) => setOptionValue(event.target.value)}
                    />
                  </label>
                  <button
                    className="primaryButton"
                    disabled={isSaving || !optionAttributeId}
                  >
                    <Plus size={15} /> Agregar opción
                  </button>
                </form>
              ) : null}
            </>
          ) : (
            <p className="emptyNote">Agrega un tipo de producto para configurar atributos.</p>
          )}

          {error ? <p className="formError">{error}</p> : null}
        </div>
      ) : null}

      {editTarget ? (
        <div className="adminModalBackdrop" role="dialog" aria-modal="true">
          <form className="adminModal smallModal" onSubmit={saveEdit}>
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Editar configuración</p>
                <h2>{editTarget.label}</h2>
              </div>
              <button className="modalClose" type="button" onClick={() => setEditTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <label className="adminFormSingle">
              Nuevo nombre
              <input
                autoFocus
                required
                value={editValue}
                onChange={(event) => setEditValue(event.target.value)}
              />
            </label>
            {error ? <p className="formError">{error}</p> : null}
            <div className="modalActions">
              <button className="secondaryButton" type="button" onClick={() => setEditTarget(null)}>
                Cancelar
              </button>
              <button className="primaryButton" disabled={isSaving}>
                {isSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="adminModalBackdrop" role="dialog" aria-modal="true">
          <div className="adminModal smallModal">
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Eliminar configuración</p>
                <h2>{deleteTarget.label}</h2>
              </div>
              <button className="modalClose" type="button" onClick={() => setDeleteTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="recordDeleteWarning">
              <p>
                Solo se eliminará si no está siendo utilizada por productos, variantes
                u otros elementos de la estructura.
              </p>
            </div>
            {error ? <p className="formError">{error}</p> : null}
            <div className="modalActions">
              <button className="secondaryButton" type="button" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </button>
              <button className="dangerButton" disabled={isSaving} type="button" onClick={deleteSelected}>
                <Trash2 size={15} />
                {isSaving ? "Eliminando..." : "Eliminar permanentemente"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { FormEvent, useMemo, useState } from "react";
import { Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  TaxonomyDialogs,
  type TaxonomyTarget,
} from "@/components/admin-products/taxonomy-dialogs";
import { TaxonomyCreateForms } from "@/components/admin-products/taxonomy-create-forms";
import { TaxonomySelection } from "@/components/admin-products/taxonomy-selection";
import { TaxonomyAttributes } from "@/components/admin-products/taxonomy-attributes";
import type {
  CatalogAttributeDataType,
  CatalogCategory,
} from "@/lib/catalog-products";

type TaxonomyManagerProps = {
  categories: CatalogCategory[];
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
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [productTypeCategoryId, setProductTypeCategoryId] = useState(
    categories[0]?.id ?? "",
  );
  const [productTypeId, setProductTypeId] = useState(
    categories[0]?.productTypes[0]?.id ?? "",
  );
  const [categoryName, setCategoryName] = useState("");
  const [productTypeName, setProductTypeName] = useState("");
  const [attributeName, setAttributeName] = useState("");
  const [attributeType, setAttributeType] =
    useState<CatalogAttributeDataType | "">("");
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
      ),
    [productTypeId, selectedCategory],
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
      router.refresh();
      setIsSaving(false);
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
    void runMutation(async () => {
      await mutateTaxonomy("/api/product-categories", "POST", {
        name: categoryName,
      });
      setCategoryName("");
    });
  }

  function addProductType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!productTypeCategoryId) return;
    void runMutation(async () => {
      await mutateTaxonomy("/api/catalog-product-types", "POST", {
        categoryId: productTypeCategoryId,
        name: productTypeName,
      });
      setProductTypeName("");
    });
  }

  function addAttribute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!attributeType || !selectedType) return;
    void runMutation(async () => {
      await mutateTaxonomy("/api/product-attributes", "POST", {
        dataType: attributeType,
        name: attributeName,
        productTypeId: selectedType?.id,
        required: attributeRequired,
        unit: attributeType === "NUMBER" ? attributeUnit : "",
      });
      setAttributeName("");
      setAttributeRequired(false);
      setAttributeType("");
      setAttributeUnit("");
    });
  }

  function addOption(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!optionAttributeId) return;
    void runMutation(async () => {
      await mutateTaxonomy("/api/product-attribute-options", "POST", {
        attributeId: optionAttributeId,
        value: optionValue,
      });
      setOptionValue("");
    });
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
          <TaxonomyCreateForms
            categoriesAvailable={categories.length > 0}
            categoryName={categoryName}
            categoryOptions={categoryOptions}
            isSaving={isSaving}
            onAddCategory={addCategory}
            onAddProductType={addProductType}
            onCategoryNameChange={setCategoryName}
            onProductTypeCategoryChange={setProductTypeCategoryId}
            onProductTypeNameChange={setProductTypeName}
            productTypeCategoryId={productTypeCategoryId}
            productTypeName={productTypeName}
          />

          <TaxonomySelection
            categoriesAvailable={categories.length > 0}
            categoryId={categoryId}
            categoryOptions={categoryOptions}
            isSaving={isSaving}
            onCategoryChange={(value) => {
              const nextCategory = categories.find(
                (category) => category.id === value,
              );
              setCategoryId(value);
              setProductTypeId(nextCategory?.productTypes[0]?.id ?? "");
            }}
            onDelete={setDeleteTarget}
            onEdit={openEdit}
            onProductTypeChange={(value) => {
              setProductTypeId(value);
              setOptionAttributeId("");
            }}
            onToggleCategory={() =>
              void runMutation(() =>
                mutateTaxonomy("/api/product-categories", "PUT", {
                  active: !selectedCategory?.active,
                  id: selectedCategory?.id,
                }),
              )
            }
            onToggleProductType={() =>
              void runMutation(() =>
                mutateTaxonomy("/api/catalog-product-types", "PUT", {
                  active: !selectedType?.active,
                  id: selectedType?.id,
                }),
              )
            }
            productTypeOptions={productTypeOptions}
            selectedCategory={selectedCategory}
            selectedType={selectedType}
          />

          <TaxonomyAttributes
            attributeName={attributeName}
            attributeRequired={attributeRequired}
            attributeType={attributeType}
            attributeUnit={attributeUnit}
            isSaving={isSaving}
            onAddAttribute={addAttribute}
            onAddOption={addOption}
            onAttributeNameChange={setAttributeName}
            onAttributeRequiredChange={setAttributeRequired}
            onAttributeTypeChange={setAttributeType}
            onAttributeUnitChange={setAttributeUnit}
            onDelete={setDeleteTarget}
            onEdit={openEdit}
            onOptionAttributeChange={setOptionAttributeId}
            onOptionValueChange={setOptionValue}
            onToggleAttribute={(id, active) =>
              void runMutation(() =>
                mutateTaxonomy("/api/product-attributes", "PUT", {
                  active: !active,
                  id,
                }),
              )
            }
            onToggleOption={(id, active) =>
              void runMutation(() =>
                mutateTaxonomy("/api/product-attribute-options", "PUT", {
                  active: !active,
                  id,
                }),
              )
            }
            optionAttributeId={optionAttributeId}
            optionValue={optionValue}
            selectedType={selectedType}
          />

          {error ? <p className="formError">{error}</p> : null}
        </div>
      ) : null}

      <TaxonomyDialogs
        deleteTarget={deleteTarget}
        editTarget={editTarget}
        editValue={editValue}
        error={error}
        isSaving={isSaving}
        onCloseDelete={() => setDeleteTarget(null)}
        onCloseEdit={() => setEditTarget(null)}
        onDelete={deleteSelected}
        onEditSubmit={saveEdit}
        onEditValueChange={setEditValue}
      />
    </section>
  );
}

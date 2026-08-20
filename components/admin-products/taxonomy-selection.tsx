import { Pencil, Trash2 } from "lucide-react";
import { SelectMenu } from "@/components/select-menu";
import type { CatalogCategory } from "@/lib/catalog-products";
import type { TaxonomyTarget } from "@/components/admin-products/taxonomy-dialogs";

type CatalogProductType = CatalogCategory["productTypes"][number];

type SelectOption = {
  label: string;
  value: string;
};

type TaxonomySelectionProps = {
  categoriesAvailable: boolean;
  categoryId: string;
  categoryOptions: SelectOption[];
  isSaving: boolean;
  onCategoryChange: (value: string) => void;
  onDelete: (target: TaxonomyTarget) => void;
  onEdit: (target: TaxonomyTarget) => void;
  onProductTypeChange: (value: string) => void;
  onToggleCategory: () => void;
  onToggleProductType: () => void;
  productTypeOptions: SelectOption[];
  selectedCategory?: CatalogCategory;
  selectedType?: CatalogProductType;
};

export function TaxonomySelection({
  categoriesAvailable,
  categoryId,
  categoryOptions,
  isSaving,
  onCategoryChange,
  onDelete,
  onEdit,
  onProductTypeChange,
  onToggleCategory,
  onToggleProductType,
  productTypeOptions,
  selectedCategory,
  selectedType,
}: TaxonomySelectionProps) {
  return (
    <>
      <div className="catalogTaxonomySelector">
        <label>
          Categoría a configurar
          <SelectMenu
            disabled={!categoriesAvailable}
            options={categoryOptions}
            placeholder={
              categoriesAvailable
                ? "Selecciona una categoría"
                : "Sin categorías registradas"
            }
            value={categoryId}
            onChange={onCategoryChange}
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
            onChange={onProductTypeChange}
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
            onClick={onToggleCategory}
          >
            {selectedCategory.active
              ? "Desactivar categoría"
              : "Activar categoría"}
          </button>
          <button
            className="secondaryButton"
            type="button"
            onClick={() =>
              onEdit({
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
              onDelete({
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
            onClick={onToggleProductType}
          >
            {selectedType.active ? "Desactivar tipo" : "Activar tipo"}
          </button>
          <button
            className="secondaryButton"
            type="button"
            onClick={() =>
              onEdit({
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
              onDelete({
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
    </>
  );
}

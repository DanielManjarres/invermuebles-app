import type { FormEvent } from "react";
import { Plus } from "lucide-react";
import { SelectMenu } from "@/components/select-menu";

type SelectOption = {
  label: string;
  value: string;
};

type TaxonomyCreateFormsProps = {
  categoriesAvailable: boolean;
  categoryName: string;
  categoryOptions: SelectOption[];
  isSaving: boolean;
  onAddCategory: (event: FormEvent<HTMLFormElement>) => void;
  onAddProductType: (event: FormEvent<HTMLFormElement>) => void;
  onCategoryNameChange: (value: string) => void;
  onProductTypeCategoryChange: (value: string) => void;
  onProductTypeNameChange: (value: string) => void;
  productTypeCategoryId: string;
  productTypeName: string;
};

export function TaxonomyCreateForms({
  categoriesAvailable,
  categoryName,
  categoryOptions,
  isSaving,
  onAddCategory,
  onAddProductType,
  onCategoryNameChange,
  onProductTypeCategoryChange,
  onProductTypeNameChange,
  productTypeCategoryId,
  productTypeName,
}: TaxonomyCreateFormsProps) {
  return (
    <div className="catalogTaxonomyForms">
      <form onSubmit={onAddCategory}>
        <label>
          Nueva categoría
          <input
            required
            value={categoryName}
            onChange={(event) => onCategoryNameChange(event.target.value)}
          />
        </label>
        <button className="primaryButton" disabled={isSaving}>
          <Plus size={15} /> Agregar
        </button>
      </form>

      <form onSubmit={onAddProductType}>
        <label>
          Categoría
          <SelectMenu
            disabled={!categoriesAvailable}
            options={categoryOptions}
            placeholder={
              categoriesAvailable
                ? "Selecciona una categoría"
                : "Primero crea una categoría"
            }
            value={productTypeCategoryId}
            onChange={onProductTypeCategoryChange}
          />
        </label>
        <label>
          Nuevo tipo de producto
          <input
            disabled={!categoriesAvailable}
            required
            value={productTypeName}
            onChange={(event) => onProductTypeNameChange(event.target.value)}
          />
        </label>
        <button
          className="primaryButton"
          disabled={isSaving || !productTypeCategoryId}
        >
          <Plus size={15} /> Agregar
        </button>
      </form>
    </div>
  );
}

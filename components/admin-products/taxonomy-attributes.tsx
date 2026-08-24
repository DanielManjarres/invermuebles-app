import type { FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { SelectMenu } from "@/components/ui/select-menu";
import type {
  CatalogAttributeDataType,
  CatalogCategory,
} from "@/lib/catalog-products";
import type { TaxonomyTarget } from "@/components/admin-products/taxonomy-dialogs";

type CatalogProductType = CatalogCategory["productTypes"][number];

type TaxonomyAttributesProps = {
  attributeName: string;
  attributeRequired: boolean;
  attributeType: CatalogAttributeDataType | "";
  attributeUnit: string;
  isSaving: boolean;
  onAddAttribute: (event: FormEvent<HTMLFormElement>) => void;
  onAddOption: (event: FormEvent<HTMLFormElement>) => void;
  onAttributeNameChange: (value: string) => void;
  onAttributeRequiredChange: (required: boolean) => void;
  onAttributeTypeChange: (type: CatalogAttributeDataType | "") => void;
  onAttributeUnitChange: (value: string) => void;
  onDelete: (target: TaxonomyTarget) => void;
  onEdit: (target: TaxonomyTarget) => void;
  onOptionAttributeChange: (id: string) => void;
  onOptionValueChange: (value: string) => void;
  onToggleAttribute: (id: string, active: boolean) => void;
  onToggleOption: (id: string, active: boolean) => void;
  optionAttributeId: string;
  optionValue: string;
  selectedType?: CatalogProductType;
};

const attributeTypeLabels: Record<CatalogAttributeDataType, string> = {
  BOOLEAN: "Sí / No",
  NUMBER: "Número",
  OPTION: "Lista de opciones",
  TEXT: "Texto",
};

const attributeTypeOptions = [
  { label: "Texto", value: "TEXT" },
  { label: "Número", value: "NUMBER" },
  { label: "Lista de opciones", value: "OPTION" },
  { label: "Sí / No", value: "BOOLEAN" },
];

export function TaxonomyAttributes({
  attributeName,
  attributeRequired,
  attributeType,
  attributeUnit,
  isSaving,
  onAddAttribute,
  onAddOption,
  onAttributeNameChange,
  onAttributeRequiredChange,
  onAttributeTypeChange,
  onAttributeUnitChange,
  onDelete,
  onEdit,
  onOptionAttributeChange,
  onOptionValueChange,
  onToggleAttribute,
  onToggleOption,
  optionAttributeId,
  optionValue,
  selectedType,
}: TaxonomyAttributesProps) {
  if (!selectedType) {
    return (
      <p className="emptyNote">
        Agrega un tipo de producto para configurar atributos.
      </p>
    );
  }

  const optionAttributes = selectedType.attributes.filter(
    (attribute) => attribute.dataType === "OPTION",
  );

  return (
    <>
      <form className="catalogAttributeForm" onSubmit={onAddAttribute}>
        <label>
          Nombre del atributo
          <input
            required
            placeholder="Ej: Color, pulgadas o material"
            value={attributeName}
            onChange={(event) => onAttributeNameChange(event.target.value)}
          />
        </label>
        <label>
          Tipo de dato
          <SelectMenu
            options={attributeTypeOptions}
            placeholder="Selecciona un tipo de dato"
            value={attributeType}
            onChange={(value) =>
              onAttributeTypeChange(value as CatalogAttributeDataType | "")
            }
          />
        </label>
        {attributeType === "NUMBER" ? (
          <label>
            Unidad
            <input
              placeholder="cm, kg, pulgadas..."
              value={attributeUnit}
              onChange={(event) => onAttributeUnitChange(event.target.value)}
            />
          </label>
        ) : null}
        <label className="checkRow">
          <input
            checked={attributeRequired}
            type="checkbox"
            onChange={(event) =>
              onAttributeRequiredChange(event.target.checked)
            }
          />
          Obligatorio
        </label>
        <button className="primaryButton" disabled={isSaving || !attributeType}>
          <Plus size={15} /> Agregar atributo
        </button>
      </form>

      <div className="catalogAttributeList">
        {selectedType.attributes.map((attribute) => (
          <article key={attribute.id}>
            <div>
              <strong>{attribute.name}</strong>
              <span>
                {attributeTypeLabels[attribute.dataType]}
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
                        onClick={() => onToggleOption(option.id, option.active)}
                      >
                        {option.value}
                      </button>
                      <button
                        aria-label={`Editar ${option.value}`}
                        type="button"
                        onClick={() =>
                          onEdit({
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
                          onDelete({
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
                onClick={() => onToggleAttribute(attribute.id, attribute.active)}
              >
                {attribute.active ? "Desactivar" : "Activar"}
              </button>
              <button
                className="secondaryButton"
                type="button"
                onClick={() =>
                  onEdit({
                    endpoint: "/api/product-attributes",
                    field: "name",
                    id: attribute.id,
                    label: attribute.name,
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
                    endpoint: "/api/product-attributes",
                    field: "name",
                    id: attribute.id,
                    label: attribute.name,
                  })
                }
              >
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </article>
        ))}
      </div>

      {optionAttributes.length ? (
        <form className="catalogOptionForm" onSubmit={onAddOption}>
          <label>
            Atributo con opciones
            <SelectMenu
              options={optionAttributes.map((attribute) => ({
                label: attribute.name,
                value: attribute.id,
              }))}
              placeholder="Selecciona un atributo"
              value={optionAttributeId}
              onChange={onOptionAttributeChange}
            />
          </label>
          <label>
            Nueva opción
            <input
              required
              placeholder="Ej: Nogal, gris, 55 pulgadas"
              value={optionValue}
              onChange={(event) => onOptionValueChange(event.target.value)}
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
  );
}

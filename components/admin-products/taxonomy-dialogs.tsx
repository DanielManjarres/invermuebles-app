import type { FormEvent } from "react";
import { Trash2, X } from "lucide-react";

export type TaxonomyTarget = {
  endpoint: string;
  field: "name" | "value";
  id: string;
  label: string;
};

type TaxonomyDialogsProps = {
  deleteTarget: TaxonomyTarget | null;
  editTarget: TaxonomyTarget | null;
  editValue: string;
  error: string;
  isSaving: boolean;
  onCloseDelete: () => void;
  onCloseEdit: () => void;
  onDelete: () => void;
  onEditSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEditValueChange: (value: string) => void;
};

export function TaxonomyDialogs({
  deleteTarget,
  editTarget,
  editValue,
  error,
  isSaving,
  onCloseDelete,
  onCloseEdit,
  onDelete,
  onEditSubmit,
  onEditValueChange,
}: TaxonomyDialogsProps) {
  return (
    <>
      {editTarget ? (
        <div className="adminModalBackdrop" role="dialog" aria-modal="true">
          <form className="adminModal smallModal" onSubmit={onEditSubmit}>
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Editar configuración</p>
                <h2>{editTarget.label}</h2>
              </div>
              <button className="modalClose" type="button" onClick={onCloseEdit}>
                <X size={18} />
              </button>
            </div>
            <label className="adminFormSingle">
              Nuevo nombre
              <input
                autoFocus
                required
                value={editValue}
                onChange={(event) => onEditValueChange(event.target.value)}
              />
            </label>
            {error ? <p className="formError">{error}</p> : null}
            <div className="modalActions">
              <button className="secondaryButton" type="button" onClick={onCloseEdit}>
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
              <button className="modalClose" type="button" onClick={onCloseDelete}>
                <X size={18} />
              </button>
            </div>
            <div className="recordDeleteWarning">
              <p>
                Solo se eliminará si no está siendo utilizada por productos,
                variantes u otros elementos de la estructura.
              </p>
            </div>
            {error ? <p className="formError">{error}</p> : null}
            <div className="modalActions">
              <button
                className="secondaryButton"
                type="button"
                onClick={onCloseDelete}
              >
                Cancelar
              </button>
              <button
                className="dangerButton"
                disabled={isSaving}
                type="button"
                onClick={onDelete}
              >
                <Trash2 size={15} />
                {isSaving ? "Eliminando..." : "Eliminar permanentemente"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

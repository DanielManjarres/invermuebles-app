import { useRef, type FormEvent } from "react";
import { Trash2, X } from "lucide-react";
import { useModalAccessibility } from "@/components/ui/use-modal-accessibility";

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
  const editDialogRef = useRef<HTMLFormElement>(null);
  const deleteDialogRef = useRef<HTMLDivElement>(null);

  useModalAccessibility({
    active: Boolean(editTarget),
    blockClose: isSaving,
    dialogRef: editDialogRef,
    onClose: onCloseEdit,
  });

  useModalAccessibility({
    active: Boolean(deleteTarget),
    blockClose: isSaving,
    dialogRef: deleteDialogRef,
    onClose: onCloseDelete,
  });

  return (
    <>
      {editTarget ? (
        <div className="adminModalBackdrop" role="presentation">
          <form
            aria-busy={isSaving}
            aria-describedby={error ? "edit-taxonomy-error" : undefined}
            aria-labelledby="edit-taxonomy-title"
            aria-modal="true"
            className="adminModal smallModal productTaxonomyDialog"
            onSubmit={onEditSubmit}
            ref={editDialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Configuración de productos</p>
                <h2 id="edit-taxonomy-title">Editar nombre</h2>
              </div>
              <button
                aria-label="Cerrar edición de configuración"
                className="modalClose"
                disabled={isSaving}
                type="button"
                onClick={onCloseEdit}
              >
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
            {error ? <p className="formError" id="edit-taxonomy-error">{error}</p> : null}
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
        <div className="adminModalBackdrop" role="presentation">
          <div
            aria-busy={isSaving}
            aria-describedby={
              error
                ? "delete-taxonomy-warning delete-taxonomy-error"
                : "delete-taxonomy-warning"
            }
            aria-labelledby="delete-taxonomy-title"
            aria-modal="true"
            className="adminModal smallModal productTaxonomyDialog"
            ref={deleteDialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Acción permanente</p>
                <h2 id="delete-taxonomy-title">Eliminar configuración</h2>
              </div>
              <button
                aria-label="Cerrar eliminación de configuración"
                className="modalClose"
                disabled={isSaving}
                type="button"
                onClick={onCloseDelete}
              >
                <X size={18} />
              </button>
            </div>
            <div className="recordDeleteWarning" id="delete-taxonomy-warning">
              <p>
                Solo se eliminará si no está siendo utilizada por productos,
                variantes u otros elementos de la estructura.
              </p>
            </div>
            <div className="deleteSummary">
              <span>Elemento seleccionado</span>
              <strong>{deleteTarget.label}</strong>
            </div>
            {error ? <p className="formError" id="delete-taxonomy-error">{error}</p> : null}
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

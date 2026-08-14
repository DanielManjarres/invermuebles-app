"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  Edit3,
  FileText,
  MapPin,
  Phone,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  customerStatusDescriptions,
  customerStatusLabels,
  type AdminCustomer,
} from "@/lib/customers";
import { validateCustomerInput } from "@/lib/customer-policy";
import {
  CustomerFormModal,
  type CustomerFormState,
} from "@/components/admin-customers/customer-form-modal";
import { CustomerCommercialHistory } from "@/components/admin-customers/customer-commercial-history";

type AdminCustomerDetailProps = {
  customer: AdminCustomer;
};

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function createFormFromCustomer(customer: AdminCustomer): CustomerFormState {
  return {
    address: customer.address,
    city: customer.city,
    document: customer.document,
    email: customer.email,
    fullName: customer.fullName,
    neighborhood: customer.neighborhood,
    notes: customer.notes,
    phone: customer.phone,
    referenceName: customer.referenceName,
    referencePhone: customer.referencePhone,
    referenceRelation: customer.referenceRelation,
    status: customer.status === "OVERDUE" ? "ACTIVE" : customer.status,
  };
}

function buildCustomerFromForm(
  form: CustomerFormState,
  base: AdminCustomer
): AdminCustomer {
  return {
    ...base,
    address: cleanText(form.address),
    city: cleanText(form.city),
    document: cleanText(form.document).replace(/\D/g, ""),
    email: cleanText(form.email).toLowerCase(),
    fullName: cleanText(form.fullName),
    neighborhood: cleanText(form.neighborhood),
    notes: cleanText(form.notes),
    phone: cleanText(form.phone),
    referenceName: cleanText(form.referenceName),
    referencePhone: cleanText(form.referencePhone),
    referenceRelation: cleanText(form.referenceRelation),
    status:
      form.status === "INACTIVE" || form.status === "BLOCKED"
        ? form.status
        : base.overdueCreditsCount > 0
          ? "OVERDUE"
          : "ACTIVE",
    updatedAt: new Date().toLocaleString("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
    }),
  };
}

export function AdminCustomerDetail({ customer }: AdminCustomerDetailProps) {
  const router = useRouter();
  const [currentCustomer, setCurrentCustomer] = useState(customer);
  const [form, setForm] = useState<CustomerFormState>(
    createFormFromCustomer(customer)
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => setNotice(""), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function openEditForm() {
    setForm(createFormFromCustomer(currentCustomer));
    setFormError("");
    setIsFormOpen(true);
  }

  async function handleCustomerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const validationError = validateCustomerInput(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/customers", {
        body: JSON.stringify({
          ...form,
          id: currentCustomer.id,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      const result = (await response.json()) as { id?: string; message?: string };

      if (!response.ok || !result.id) {
        setFormError(result.message ?? "No se pudo guardar el cliente.");
        return;
      }

      const savedCustomer = buildCustomerFromForm(form, currentCustomer);
      setCurrentCustomer(savedCustomer);
      setIsFormOpen(false);
      setNotice(`${savedCustomer.fullName} fue actualizado.`);
    } catch {
      setFormError("No se pudo conectar con el sistema.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCustomerDelete() {
    setIsDeleting(true);

    try {
      const response = await fetch("/api/customers", {
        body: JSON.stringify({ id: currentCustomer.id }),
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        setNotice(result.message ?? "No se pudo eliminar el cliente.");
        setIsDeleteOpen(false);
        return;
      }

      router.push("/admin/clientes");
    } catch {
      setNotice("No se pudo conectar con el sistema.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="tableSection customersSection">
      {notice ? (
        <div className="orderToast floatingToast" role="status">
          <span>{notice}</span>
        </div>
      ) : null}

      <Link className="backLink" href="/admin/clientes">
        <ArrowLeft size={18} />
        Volver a clientes
      </Link>

      <article className="customerProfile customerDetailProfile">
        <div className="customerProfileHeader">
          <div>
            <p className="eyebrow">Perfil del cliente</p>
            <h2>{currentCustomer.fullName}</h2>
            <span className={`customerStatus ${currentCustomer.status.toLowerCase()}`}>
              {customerStatusLabels[currentCustomer.status]}
            </span>
          </div>
          <div className="customerHeaderActions">
            <button className="secondaryButton" type="button" onClick={openEditForm}>
              <Edit3 size={18} />
              Editar
            </button>
            <button
              className="dangerButton"
              type="button"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2 size={18} />
              Eliminar
            </button>
          </div>
        </div>

        <div className="customerDataGrid">
          <div>
            <FileText size={18} />
            <span>Cédula</span>
            <strong>{currentCustomer.document}</strong>
          </div>
          <div>
            <Phone size={18} />
            <span>Teléfono</span>
            <strong>{currentCustomer.phone}</strong>
          </div>
          <div>
            <FileText size={18} />
            <span>Correo</span>
            <strong>{currentCustomer.email || "Sin registrar"}</strong>
          </div>
          <div>
            <MapPin size={18} />
            <span>Dirección</span>
            <strong>{currentCustomer.address || "Sin registrar"}</strong>
          </div>
          <div>
            <UserRound size={18} />
            <span>Barrio / ciudad</span>
            <strong>
              {[currentCustomer.neighborhood, currentCustomer.city]
                .filter(Boolean)
                .join(" - ") || "Sin registrar"}
            </strong>
          </div>
        </div>

        <div className="customerNotes">
          <strong>Contacto de referencia</strong>
          <p>
            {currentCustomer.referenceName
              ? [
                  currentCustomer.referenceName,
                  currentCustomer.referenceRelation,
                  currentCustomer.referencePhone,
                ]
                  .filter(Boolean)
                  .join(" - ")
              : "Sin contacto de referencia registrado."}
          </p>
        </div>

        <div className="customerNotes">
          <strong>Observaciones</strong>
          <p>
            {currentCustomer.notes ||
              customerStatusDescriptions[currentCustomer.status]}
          </p>
        </div>

        <CustomerCommercialHistory customer={currentCustomer} />
      </article>

      {isDeleteOpen ? (
        <div className="modalOverlay" role="presentation">
          <div className="adminModal recordDeleteModal">
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Correccion de registros</p>
                <h2>Eliminar cliente</h2>
              </div>
              <button
                aria-label="Cerrar confirmacion"
                className="modalClose"
                type="button"
                onClick={() => setIsDeleteOpen(false)}
              >
                x
              </button>
            </div>

            <div className="recordDeleteWarning">
              <AlertTriangle size={20} />
              <p>
                Solo se eliminara si no tiene pedidos, ventas ni creditos
                relacionados. Si ya tiene historial, el cliente se conserva y
                puedes marcarlo como inactivo.
              </p>
            </div>

            <div className="recordDeleteTarget">
              <span>Cliente seleccionado</span>
              <strong>{currentCustomer.fullName}</strong>
              <small>CC {currentCustomer.document}</small>
            </div>

            <div className="modalActions">
              <button
                className="secondaryButton"
                type="button"
                onClick={() => setIsDeleteOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="dangerButton"
                disabled={isDeleting}
                type="button"
                onClick={handleCustomerDelete}
              >
                <Trash2 size={18} />
                {isDeleting ? "Revisando..." : "Eliminar cliente"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isFormOpen ? (
        <CustomerFormModal
          error={formError}
          form={form}
          isEditing
          isSaving={isSaving}
          setForm={setForm}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleCustomerSubmit}
        />
      ) : null}
    </section>
  );
}

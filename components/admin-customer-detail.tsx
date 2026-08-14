"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  BadgeCheck,
  Ban,
  CreditCard,
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
import { SelectMenu } from "@/components/select-menu";

type CustomerFormState = {
  address: string;
  city: string;
  document: string;
  email: string;
  fullName: string;
  neighborhood: string;
  notes: string;
  phone: string;
  referenceName: string;
  referencePhone: string;
  referenceRelation: string;
  status: AdminCustomer["status"];
};

type AdminCustomerDetailProps = {
  customer: AdminCustomer;
};

const customerStatuses: AdminCustomer["status"][] = [
  "ACTIVE",
  "OVERDUE",
  "INACTIVE",
  "BLOCKED",
];

const customerStatusOptions = customerStatuses.map((status) => ({
  label: customerStatusLabels[status],
  value: status,
}));

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
    status: customer.status,
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
    status: form.status,
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

    if (!cleanText(form.fullName)) {
      setFormError("Escribe el nombre completo del cliente.");
      return;
    }

    const document = cleanText(form.document).replace(/\D/g, "");
    if (document.length < 6 || document.length > 15) {
      setFormError("La cédula debe tener entre 6 y 15 números.");
      return;
    }

    const phone = cleanText(form.phone).replace(/\D/g, "");
    if (phone.length < 7 || phone.length > 15) {
      setFormError("El teléfono debe tener entre 7 y 15 números.");
      return;
    }

    const referencePhone = cleanText(form.referencePhone).replace(/\D/g, "");
    if (
      referencePhone &&
      (referencePhone.length < 7 || referencePhone.length > 15)
    ) {
      setFormError("El teléfono del contacto debe tener entre 7 y 15 números.");
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

        <div className="customerHistoryGrid">
          <article>
            <BadgeCheck size={20} />
            <span>Compras / pedidos</span>
            <strong>{currentCustomer.ordersCount}</strong>
            <small>Último pedido: {currentCustomer.lastOrderAt}</small>
          </article>
          <article>
            <CreditCard size={20} />
            <span>Créditos registrados</span>
            <strong>{currentCustomer.creditsCount}</strong>
            <small>Activos o en mora: {currentCustomer.activeCreditsCount}</small>
          </article>
          <article>
            <Ban size={20} />
            <span>Pagos y cartera</span>
            <strong>Próxima fase</strong>
            <small>Aquí se verán cuotas, pagos y atrasos.</small>
          </article>
        </div>
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
        <div className="modalOverlay" role="presentation">
          <form className="adminModal customerModal" onSubmit={handleCustomerSubmit}>
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Editar cliente</p>
                <h2>Actualizar cliente</h2>
              </div>
              <button
                aria-label="Cerrar formulario"
                className="modalClose"
                type="button"
                onClick={() => setIsFormOpen(false)}
              >
                x
              </button>
            </div>

            {formError ? <div className="formError">{formError}</div> : null}

            <div className="adminFormGrid">
              <label>
                Nombre completo
                <input
                  placeholder="Ej: Daniel Manjarres"
                  value={form.fullName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      fullName: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Cedula
                <input
                  inputMode="numeric"
                  placeholder="Ej: 1094..."
                  value={form.document}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      document: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Telefono
                <input
                  placeholder="Ej: 321 6417360"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Correo
                <input
                  placeholder="Ej: cliente@correo.com"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Estado
                <SelectMenu
                  options={customerStatusOptions}
                  placeholder="Selecciona un estado"
                  value={form.status}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      status: (value || "ACTIVE") as AdminCustomer["status"],
                    }))
                  }
                />
              </label>
              <label>
                Dirección
                <input
                  placeholder="Ej: Carrera 25 #33-44"
                  value={form.address}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Barrio
                <input
                  placeholder="Ej: Centro"
                  value={form.neighborhood}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      neighborhood: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Ciudad
                <input
                  placeholder="Ej: Calarca"
                  value={form.city}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Nombre del contacto de referencia
                <input
                  placeholder="Ej: Maria Gomez"
                  value={form.referenceName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      referenceName: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Relacion con el cliente
                <input
                  placeholder="Ej: Madre, hermano, vecino"
                  value={form.referenceRelation}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      referenceRelation: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Telefono del contacto
                <input
                  placeholder="Ej: 310 555 1234"
                  value={form.referencePhone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      referencePhone: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <label className="adminFormSingle">
              Observaciones
              <textarea
                placeholder="Ej: Cliente frecuente, pendiente validar credito, etc."
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </label>

            <div className="modalActions">
              <button
                className="secondaryButton"
                type="button"
                onClick={() => setIsFormOpen(false)}
              >
                Cancelar
              </button>
              <button className="primaryButton" disabled={isSaving} type="submit">
                {isSaving ? "Guardando..." : "Guardar cliente"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Eye,
  Plus,
  Search,
} from "lucide-react";
import {
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

type AdminCustomersManagerProps = {
  customers: AdminCustomer[];
};

const emptyCustomerForm: CustomerFormState = {
  address: "",
  city: "",
  document: "",
  email: "",
  fullName: "",
  neighborhood: "",
  notes: "",
  phone: "",
  referenceName: "",
  referencePhone: "",
  referenceRelation: "",
  status: "ACTIVE",
};

const customerStatuses: AdminCustomer["status"][] = [
  "ACTIVE",
  "OVERDUE",
  "INACTIVE",
  "BLOCKED",
];

const editableCustomerStatuses: AdminCustomer["status"][] = [
  "ACTIVE",
  "INACTIVE",
  "BLOCKED",
];

const customerStatusOptions = editableCustomerStatuses.map((status) => ({
  label: customerStatusLabels[status],
  value: status,
}));

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function buildCustomerFromForm(
  form: CustomerFormState,
  id: string,
  base?: AdminCustomer
): AdminCustomer {
  const now = new Date().toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return {
    id,
    fullName: cleanText(form.fullName),
    document: cleanText(form.document).replace(/\D/g, ""),
    phone: cleanText(form.phone),
    address: cleanText(form.address),
    neighborhood: cleanText(form.neighborhood),
    city: cleanText(form.city),
    referenceName: cleanText(form.referenceName),
    referencePhone: cleanText(form.referencePhone),
    referenceRelation: cleanText(form.referenceRelation),
    email: cleanText(form.email).toLowerCase(),
    status:
      form.status === "INACTIVE" || form.status === "BLOCKED"
        ? form.status
        : (base?.overdueCreditsCount ?? 0) > 0
          ? "OVERDUE"
          : "ACTIVE",
    notes: cleanText(form.notes),
    createdAt: base?.createdAt ?? now,
    updatedAt: now,
    ordersCount: base?.ordersCount ?? 0,
    creditsCount: base?.creditsCount ?? 0,
    activeCreditsCount: base?.activeCreditsCount ?? 0,
    overdueCreditsCount: base?.overdueCreditsCount ?? 0,
    lastOrderAt: base?.lastOrderAt ?? "Sin registros",
  };
}

export function AdminCustomersManager({
  customers: initialCustomers,
}: AdminCustomersManagerProps) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState<AdminCustomer["status"] | "ALL">(
    "ALL"
  );
  const [form, setForm] = useState<CustomerFormState>(emptyCustomerForm);
  const [editingCustomerId, setEditingCustomerId] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setCustomers(initialCustomers);
  }, [initialCustomers]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => setNotice(""), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = normalize(query.trim());

    return customers.filter((customer) => {
      const matchesStatus =
        activeStatus === "ALL" ||
        (activeStatus === "OVERDUE"
          ? customer.overdueCreditsCount > 0
          : customer.status === activeStatus);
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          customer.fullName,
          customer.document,
          customer.phone,
          customer.email,
          customer.address,
          customer.neighborhood,
          customer.city,
          customer.referenceName,
          customer.referenceRelation,
          customer.referencePhone,
        ]
          .join(" ")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [activeStatus, customers, query]);

  const customerStats = useMemo(
    () => ({
      total: customers.length,
      active: customers.filter((customer) => customer.status === "ACTIVE").length,
      overdue: customers.filter((customer) => customer.overdueCreditsCount > 0)
        .length,
      withCredits: customers.filter((customer) => customer.activeCreditsCount > 0)
        .length,
    }),
    [customers]
  );

  function openCreateForm() {
    setForm(emptyCustomerForm);
    setEditingCustomerId("");
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
          id: editingCustomerId || undefined,
        }),
        headers: { "Content-Type": "application/json" },
        method: editingCustomerId ? "PUT" : "POST",
      });
      const result = (await response.json()) as { id?: string; message?: string };

      if (!response.ok || !result.id) {
        setFormError(result.message ?? "No se pudo guardar el cliente.");
        return;
      }

      const existingCustomer = customers.find(
        (customer) => customer.id === editingCustomerId
      );
      const savedCustomer = buildCustomerFromForm(
        form,
        result.id,
        existingCustomer
      );

      setCustomers((currentCustomers) => {
        if (editingCustomerId) {
          return currentCustomers.map((customer) =>
            customer.id === editingCustomerId ? savedCustomer : customer
          );
        }

        return [savedCustomer, ...currentCustomers];
      });
      setIsFormOpen(false);
      setNotice(
        editingCustomerId
          ? `${savedCustomer.fullName} fue actualizado.`
          : `${savedCustomer.fullName} fue registrado.`
      );
    } catch {
      setFormError("No se pudo conectar con el sistema.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="tableSection customersSection">
      <div className="movementSummaryGrid" aria-label="Resumen de clientes">
        <article>
          <span>Total clientes</span>
          <strong>{customerStats.total}</strong>
        </article>
        <article>
          <span>Activos</span>
          <strong>{customerStats.active}</strong>
        </article>
        <article>
          <span>En mora</span>
          <strong>{customerStats.overdue}</strong>
        </article>
        <article>
          <span>Créditos activos</span>
          <strong>{customerStats.withCredits}</strong>
        </article>
      </div>

      <div className="sectionHeader customersHeader">
        <div>
          <p className="eyebrow">Gestión comercial</p>
          <h2>Clientes registrados</h2>
        </div>
        <button className="primaryButton" type="button" onClick={openCreateForm}>
          <Plus size={20} />
          Nuevo cliente
        </button>
      </div>

      {notice ? (
        <div className="orderToast" role="status">
          <span>{notice}</span>
        </div>
      ) : null}

      <div className="inventoryToolbar customerToolbar">
        <label className="searchBox">
          <Search size={18} />
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por cédula, nombre o teléfono"
            type="search"
            value={query}
          />
        </label>

        <div className="inventoryFilters" aria-label="Filtros de clientes">
          <button
            className={activeStatus === "ALL" ? "filterButton active" : "filterButton"}
            type="button"
            onClick={() => setActiveStatus("ALL")}
          >
            Todos
          </button>
          {customerStatuses.map((status) => (
            <button
              className={
                activeStatus === status ? "filterButton active" : "filterButton"
              }
              key={status}
              type="button"
              onClick={() => setActiveStatus(status)}
            >
              {customerStatusLabels[status]}
            </button>
          ))}
        </div>
      </div>

      <div className="customerDirectory" aria-label="Lista de clientes">
          {filteredCustomers.length === 0 ? (
            <div className="emptyState">
              <h2>No hay clientes registrados</h2>
              <p>Cuando registres clientes, apareceran en esta pantalla.</p>
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <Link
                className="customerDirectoryItem"
                href={`/admin/clientes/${customer.id}`}
                key={customer.id}
              >
                <span className="customerDirectoryName">
                  <strong>{customer.fullName}</strong>
                  <small>CC {customer.document}</small>
                </span>
                <span className="customerDirectoryMeta">
                  <small>Telefono</small>
                  <strong>{customer.phone}</strong>
                </span>
                <span className="customerDirectoryMeta">
                  <small>Ciudad</small>
                  <strong>{customer.city || "Sin registrar"}</strong>
                </span>
                <span className={`customerStatus ${customer.status.toLowerCase()}`}>
                  {customerStatusLabels[customer.status]}
                </span>
                <span className="secondaryButton customerProfileButton">
                  <Eye size={17} />
                  Ver perfil
                </span>
              </Link>
            ))
          )}
      </div>

      {isFormOpen ? (
        <div className="modalOverlay" role="presentation">
          <form className="adminModal customerModal" onSubmit={handleCustomerSubmit}>
            <div className="modalHeader">
              <div>
                <p className="eyebrow">
                  {editingCustomerId ? "Editar cliente" : "Nuevo cliente"}
                </p>
                <h2>
                  {editingCustomerId ? "Actualizar cliente" : "Registrar cliente"}
                </h2>
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

"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Ban,
  CreditCard,
  Edit3,
  FileText,
  MapPin,
  Phone,
  Plus,
  Search,
  UserRound,
} from "lucide-react";
import {
  customerStatusDescriptions,
  customerStatusLabels,
  type AdminCustomer,
} from "@/lib/customers";

type CustomerFormState = {
  address: string;
  city: string;
  document: string;
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

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function createFormFromCustomer(customer: AdminCustomer): CustomerFormState {
  return {
    address: customer.address,
    city: customer.city,
    document: customer.document,
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
    status: form.status,
    notes: cleanText(form.notes),
    createdAt: base?.createdAt ?? now,
    updatedAt: now,
    ordersCount: base?.ordersCount ?? 0,
    creditsCount: base?.creditsCount ?? 0,
    activeCreditsCount: base?.activeCreditsCount ?? 0,
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
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    initialCustomers[0]?.id ?? ""
  );
  const [form, setForm] = useState<CustomerFormState>(emptyCustomerForm);
  const [editingCustomerId, setEditingCustomerId] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setCustomers(initialCustomers);
    setSelectedCustomerId((currentId) => currentId || initialCustomers[0]?.id || "");
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
        activeStatus === "ALL" || customer.status === activeStatus;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          customer.fullName,
          customer.document,
          customer.phone,
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

  const selectedCustomer =
    filteredCustomers.find((customer) => customer.id === selectedCustomerId) ??
    filteredCustomers[0] ??
    null;

  const customerStats = useMemo(
    () => ({
      total: customers.length,
      active: customers.filter((customer) => customer.status === "ACTIVE").length,
      overdue: customers.filter((customer) => customer.status === "OVERDUE").length,
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

  function openEditForm(customer: AdminCustomer) {
    setForm(createFormFromCustomer(customer));
    setEditingCustomerId(customer.id);
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

    if (!cleanText(form.document).replace(/\D/g, "")) {
      setFormError("Escribe la cedula del cliente.");
      return;
    }

    if (!cleanText(form.phone)) {
      setFormError("Escribe el telefono del cliente.");
      return;
    }

    setIsSaving(true);

    const response = await fetch("/api/customers", {
      body: JSON.stringify({
        ...form,
        id: editingCustomerId || undefined,
      }),
      headers: { "Content-Type": "application/json" },
      method: editingCustomerId ? "PUT" : "POST",
    });
    const result = (await response.json()) as { id?: string; message?: string };

    setIsSaving(false);

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
    setSelectedCustomerId(result.id);
    setIsFormOpen(false);
    setNotice(
      editingCustomerId
        ? `${savedCustomer.fullName} fue actualizado.`
        : `${savedCustomer.fullName} fue registrado.`
    );
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
          <span>Creditos activos</span>
          <strong>{customerStats.withCredits}</strong>
        </article>
      </div>

      <div className="sectionHeader customersHeader">
        <div>
          <p className="eyebrow">Gestion comercial</p>
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
            placeholder="Buscar por cedula, nombre, telefono o ciudad"
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

      <div className="customersLayout">
        <div className="customersList" aria-label="Lista de clientes">
          {filteredCustomers.length === 0 ? (
            <div className="emptyState">
              <h2>No hay clientes registrados</h2>
              <p>Cuando registres clientes, apareceran en esta pantalla.</p>
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <button
                className={
                  selectedCustomer?.id === customer.id
                    ? "customerListItem active"
                    : "customerListItem"
                }
                key={customer.id}
                type="button"
                onClick={() => setSelectedCustomerId(customer.id)}
              >
                <span>
                  <strong>{customer.fullName}</strong>
                  <small>CC {customer.document}</small>
                </span>
                <span className={`customerStatus ${customer.status.toLowerCase()}`}>
                  {customerStatusLabels[customer.status]}
                </span>
              </button>
            ))
          )}
        </div>

        {selectedCustomer ? (
          <article className="customerProfile">
            <div className="customerProfileHeader">
              <div>
                <p className="eyebrow">Perfil del cliente</p>
                <h3>{selectedCustomer.fullName}</h3>
                <span className={`customerStatus ${selectedCustomer.status.toLowerCase()}`}>
                  {customerStatusLabels[selectedCustomer.status]}
                </span>
              </div>
              <button
                className="secondaryButton"
                type="button"
                onClick={() => openEditForm(selectedCustomer)}
              >
                <Edit3 size={18} />
                Editar
              </button>
            </div>

            <div className="customerDataGrid">
              <div>
                <FileText size={18} />
                <span>Cedula</span>
                <strong>{selectedCustomer.document}</strong>
              </div>
              <div>
                <Phone size={18} />
                <span>Telefono</span>
                <strong>{selectedCustomer.phone}</strong>
              </div>
              <div>
                <MapPin size={18} />
                <span>Direccion</span>
                <strong>{selectedCustomer.address || "Sin registrar"}</strong>
              </div>
              <div>
                <UserRound size={18} />
                <span>Barrio / ciudad</span>
                <strong>
                  {[selectedCustomer.neighborhood, selectedCustomer.city]
                    .filter(Boolean)
                    .join(" - ") || "Sin registrar"}
                </strong>
              </div>
            </div>

            <div className="customerNotes">
              <strong>Contacto de referencia</strong>
              <p>
                {selectedCustomer.referenceName
                  ? [
                      selectedCustomer.referenceName,
                      selectedCustomer.referenceRelation,
                      selectedCustomer.referencePhone,
                    ]
                      .filter(Boolean)
                      .join(" - ")
                  : "Sin contacto de referencia registrado."}
              </p>
            </div>

            <div className="customerNotes">
              <strong>Observaciones</strong>
              <p>{selectedCustomer.notes || customerStatusDescriptions[selectedCustomer.status]}</p>
            </div>

            <div className="customerHistoryGrid">
              <article>
                <BadgeCheck size={20} />
                <span>Compras / pedidos</span>
                <strong>{selectedCustomer.ordersCount}</strong>
                <small>Ultimo pedido: {selectedCustomer.lastOrderAt}</small>
              </article>
              <article>
                <CreditCard size={20} />
                <span>Creditos registrados</span>
                <strong>{selectedCustomer.creditsCount}</strong>
                <small>Activos o en mora: {selectedCustomer.activeCreditsCount}</small>
              </article>
              <article>
                <Ban size={20} />
                <span>Pagos y cartera</span>
                <strong>Proxima fase</strong>
                <small>Aqui se veran cuotas, pagos y atrasos.</small>
              </article>
            </div>
          </article>
        ) : null}
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
                Estado
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as AdminCustomer["status"],
                    }))
                  }
                >
                  {customerStatuses.map((status) => (
                    <option key={status} value={status}>
                      {customerStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Direccion
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

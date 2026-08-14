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
import {
  CustomerFormModal,
  type CustomerFormState,
} from "@/components/admin-customers/customer-form-modal";

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
    salesCount: base?.salesCount ?? 0,
    creditsCount: base?.creditsCount ?? 0,
    activeCreditsCount: base?.activeCreditsCount ?? 0,
    overdueCreditsCount: base?.overdueCreditsCount ?? 0,
    paymentsCount: base?.paymentsCount ?? 0,
    totalPaid: base?.totalPaid ?? 0,
    lastOrderAt: base?.lastOrderAt ?? "Sin registros",
    lastSaleAt: base?.lastSaleAt ?? "Sin registros",
    lastPaymentAt: base?.lastPaymentAt ?? "Sin pagos registrados",
    recentSales: base?.recentSales ?? [],
    recentCredits: base?.recentCredits ?? [],
    recentPayments: base?.recentPayments ?? [],
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
        <CustomerFormModal
          error={formError}
          form={form}
          isEditing={Boolean(editingCustomerId)}
          isSaving={isSaving}
          setForm={setForm}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleCustomerSubmit}
        />
      ) : null}
    </section>
  );
}

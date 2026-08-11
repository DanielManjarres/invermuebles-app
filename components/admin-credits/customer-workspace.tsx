import type { ReactNode } from "react";
import { CreditCard, Mail, MapPin, Phone, UserRound, WalletCards } from "lucide-react";

import { creditStatusLabels, type AdminCredit } from "@/lib/credits";
import { customerStatusLabels, type AdminCustomer } from "@/lib/customers";

type CustomerCreditStatus = AdminCredit["status"] | "NONE";

type Props = {
  children: ReactNode;
  credits: AdminCredit[];
  customerCredits: AdminCredit[];
  customers: AdminCustomer[];
  disabled: boolean;
  initialSearch: boolean;
  onCustomerSelect: (customer: AdminCustomer) => void;
  selectedCustomer: AdminCustomer | null;
};

function formatMoney(value: number) {
  return `$ ${new Intl.NumberFormat("es-CO").format(value)}`;
}

function getCustomerCredits(customerId: string, credits: AdminCredit[]) {
  return credits.filter((credit) => credit.customerId === customerId);
}

function getCustomerBalance(customerCredits: AdminCredit[]) {
  return customerCredits
    .filter((credit) => credit.status === "ACTIVE" || credit.status === "OVERDUE")
    .reduce((sum, credit) => sum + credit.balance, 0);
}

function getCustomerCreditStatus(customerCredits: AdminCredit[]): CustomerCreditStatus {
  if (customerCredits.some((credit) => credit.status === "OVERDUE")) return "OVERDUE";
  if (customerCredits.some((credit) => credit.status === "ACTIVE")) return "ACTIVE";
  if (customerCredits.some((credit) => credit.status === "PAID")) return "PAID";
  if (customerCredits.some((credit) => credit.status === "CANCELLED")) return "CANCELLED";
  return "NONE";
}

function getCustomerCreditStatusLabel(status: CustomerCreditStatus) {
  if (status === "NONE") return "Sin cartera";
  return creditStatusLabels[status];
}

function getCustomerCreditStatusClass(status: CustomerCreditStatus) {
  if (status === "NONE") return "creditStatus-cancelled";
  return `creditStatus-${status.toLowerCase()}`;
}

export function AdminCreditsCustomerWorkspace({
  children,
  credits,
  customerCredits,
  customers,
  disabled,
  initialSearch,
  onCustomerSelect,
  selectedCustomer,
}: Props) {
  return (
    <div className="creditsWorkspace">
      <aside className="creditList" aria-label="Clientes con cartera">
        <div className="creditListHeading">
          <span>Clientes encontrados</span>
          <strong>{customers.length} resultado(s)</strong>
        </div>

        {!customers.length ? (
          <div className="creditEmpty">
            <WalletCards size={30} />
            <strong>{initialSearch ? "Busca un cliente para comenzar" : "No hay clientes para mostrar"}</strong>
            <span>
              {initialSearch
                ? "Escribe su nombre, cédula, teléfono, venta o producto."
                : "Cambia la búsqueda o el filtro para revisar otras cuentas."}
            </span>
          </div>
        ) : (
          customers.map((customer) => {
            const listCredits = getCustomerCredits(customer.id, credits);
            const status = getCustomerCreditStatus(listCredits);

            return (
              <button
                className={`creditListItem creditCustomerItem${
                  selectedCustomer?.id === customer.id ? " selected" : ""
                }`}
                key={customer.id}
                type="button"
                disabled={disabled}
                onClick={() => onCustomerSelect(customer)}
              >
                <div className="creditCustomerTop">
                  <span className={`creditStatus ${getCustomerCreditStatusClass(status)}`}>
                    {getCustomerCreditStatusLabel(status)}
                  </span>
                  <span>{listCredits.length} cuenta(s)</span>
                </div>
                <strong>{customer.fullName}</strong>
                <span>CC {customer.document}</span>
                <span>
                  {customer.phone || "Sin teléfono"} · {customer.city || "Sin ciudad"}
                </span>
                <b>{formatMoney(getCustomerBalance(listCredits))}</b>
              </button>
            );
          })
        )}
      </aside>

      <div className="creditDetail">
        {!selectedCustomer ? (
          <div className="creditEmpty">
            <UserRound size={34} />
            <strong>Selecciona un cliente</strong>
            <span>Desde aquí podrás ver sus créditos, saldos y pagos registrados.</span>
          </div>
        ) : (
          <>
            <div className="creditCustomerProfile">
              <div className="creditCustomerProfileHeader">
                <div>
                  <span>Perfil de cartera</span>
                  <h2>{selectedCustomer.fullName}</h2>
                  <p>
                    CC {selectedCustomer.document} · {selectedCustomer.phone || "Sin teléfono"}
                  </p>
                </div>
                <span className={`customerStatus ${selectedCustomer.status.toLowerCase()}`}>
                  {customerStatusLabels[selectedCustomer.status]}
                </span>
              </div>

              <div className="creditCustomerInfoGrid">
                <div className="creditCustomerInfoCard">
                  <Phone size={18} />
                  <span>Teléfono</span>
                  <strong>{selectedCustomer.phone || "Sin registrar"}</strong>
                </div>
                <div className="creditCustomerInfoCard">
                  <Mail size={18} />
                  <span>Correo</span>
                  <strong>{selectedCustomer.email || "Sin registrar"}</strong>
                </div>
                <div className="creditCustomerInfoCard">
                  <MapPin size={18} />
                  <span>Ciudad</span>
                  <strong>{selectedCustomer.city || "Sin registrar"}</strong>
                </div>
                <div className="creditCustomerInfoCard">
                  <WalletCards size={18} />
                  <span>Saldo cartera</span>
                  <strong>{formatMoney(getCustomerBalance(customerCredits))}</strong>
                </div>
              </div>
            </div>

            {!customerCredits.length ? (
              <div className="creditEmpty">
                <CreditCard size={34} />
                <strong>Este cliente no tiene créditos registrados</strong>
                <span>Cuando una venta genere cartera, aparecerá en este perfil.</span>
              </div>
            ) : (
              children
            )}
          </>
        )}
      </div>
    </div>
  );
}

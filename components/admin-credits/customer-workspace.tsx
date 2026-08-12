import type { ReactNode } from "react";
import { CreditCard, Mail, MapPin, Phone, UserRound, WalletCards } from "lucide-react";

import { customerStatusLabels, type AdminCustomer } from "@/lib/customers";
import type { PortfolioAccount } from "@/lib/portfolio";

type CustomerCreditStatus = PortfolioAccount["status"] | "NONE";

type Props = {
  children: ReactNode;
  accounts: PortfolioAccount[];
  customerAccounts: PortfolioAccount[];
  customers: AdminCustomer[];
  disabled: boolean;
  initialSearch: boolean;
  onCustomerSelect: (customer: AdminCustomer) => void;
  selectedCustomer: AdminCustomer | null;
};

function formatMoney(value: number) {
  return `$ ${new Intl.NumberFormat("es-CO").format(value)}`;
}

function getCustomerCredits(customerId: string, accounts: PortfolioAccount[]) {
  return accounts.filter((account) => account.customerId === customerId);
}

function getCustomerBalance(customerAccounts: PortfolioAccount[]) {
  return customerAccounts
    .filter((account) => account.status === "ACTIVE" || account.status === "OVERDUE")
    .reduce((sum, account) => sum + account.balance, 0);
}

function getCustomerCreditStatus(customerCredits: PortfolioAccount[]): CustomerCreditStatus {
  if (customerCredits.some((credit) => credit.status === "OVERDUE")) return "OVERDUE";
  if (customerCredits.some((credit) => credit.status === "ACTIVE")) return "ACTIVE";
  if (customerCredits.some((credit) => credit.status === "PAID")) return "PAID";
  return "NONE";
}

function getCustomerCreditStatusLabel(status: CustomerCreditStatus) {
  if (status === "NONE") return "Sin cartera";
  return { ACTIVE: "Activo", OVERDUE: "En mora", PAID: "Pagado" }[status];
}

function getCustomerCreditStatusClass(status: CustomerCreditStatus) {
  if (status === "NONE") return "creditStatus-cancelled";
  return `creditStatus-${status.toLowerCase()}`;
}

export function AdminCreditsCustomerWorkspace({
  children,
  accounts,
  customerAccounts,
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
            const listCredits = getCustomerCredits(customer.id, accounts);
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
                  <strong>{formatMoney(getCustomerBalance(customerAccounts))}</strong>
                </div>
              </div>
            </div>

            {!customerAccounts.length ? (
              <div className="creditEmpty">
                <CreditCard size={34} />
                <strong>Este cliente no tiene cuentas registradas</strong>
                <span>Cuando una venta genere un pago o saldo, aparecerá en este perfil.</span>
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

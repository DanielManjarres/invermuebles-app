import { notFound } from "next/navigation";
import { AdminCustomerDetail } from "@/components/admin-customers/admin-customer-detail";
import { LogoutButton } from "@/components/auth/logout-button";
import { SiteHeader } from "@/components/layout/site-header";
import { getCustomerById } from "@/lib/database-customers";

export const dynamic = "force-dynamic";

type AdminCustomerDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminCustomerDetailPage({
  params,
}: AdminCustomerDetailPageProps) {
  const { id } = await params;
  const customer = await getCustomerById(id);

  if (!customer) {
    notFound();
  }

  return (
    <main>
      <SiteHeader active="clientes" variant="admin" />

      <section className="pageHeader">
        <div className="pageHeaderRow">
          <div>
            <p className="eyebrow">Panel administrativo</p>
            <h1>Perfil del cliente</h1>
            <p>
              Consulta la información completa del cliente y actualiza sus datos
              cuando sea necesario.
            </p>
          </div>
          <LogoutButton />
        </div>
      </section>

      <AdminCustomerDetail customer={customer} />
    </main>
  );
}

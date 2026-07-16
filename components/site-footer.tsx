import Link from "next/link";
import { Clock, MapPin, MessageCircle, PackageCheck } from "lucide-react";
import { company } from "@/lib/company";

export function SiteFooter() {
  return (
    <footer className="siteFooter" id="contacto">
      <div className="footerMain">
        <div className="footerBrand">
          <p className="eyebrow">{company.tagline}</p>
          <h2>{company.name}</h2>
          <p>{company.description}</p>
        </div>

        <div className="footerInfo">
          <div className="footerItem">
            <MapPin size={20} />
            <span>
              <strong>Ubicación</strong>
              {company.location}
            </span>
          </div>
          <div className="footerItem">
            <MessageCircle size={20} />
            <span>
              <strong>Contacto</strong>
              {company.whatsappLabel}
            </span>
          </div>
          <div className="footerItem">
            <Clock size={20} />
            <span>
              <strong>Atención</strong>
              {company.schedule}
            </span>
          </div>
          <div className="footerItem">
            <PackageCheck size={20} />
            <span>
              <strong>Productos</strong>
              Muebles, electrodomésticos, colchones, audio y video
            </span>
          </div>
        </div>
      </div>

      <div className="footerAccess">
        <Link href="/login">Acceso administrativo</Link>
      </div>
    </footer>
  );
}

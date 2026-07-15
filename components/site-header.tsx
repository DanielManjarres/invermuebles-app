"use client";

import Image from "next/image";
import Link from "next/link";

type SiteHeaderProps = {
  active?: "catalogo" | "carrito" | "admin";
};

export function SiteHeader({ active }: SiteHeaderProps) {
  return (
    <header className="topbar">
      <Link className="brand" href="/" aria-label="Ir al inicio">
        <Image
          src="/logo-invermuebles.png"
          alt="Invermuebles del Quindío"
          width={72}
          height={72}
          priority
        />
        <span>
          <strong>Invermuebles</strong>
          <small>Del Quindío</small>
        </span>
      </Link>
      <nav className="nav" aria-label="Navegación principal">
        <Link className={active === "catalogo" ? "active" : ""} href="/catalogo">
          Catálogo
        </Link>
        <Link className={active === "carrito" ? "active" : ""} href="/carrito">
          Carrito
        </Link>
        <Link className={active === "admin" ? "active" : ""} href="/admin">
          Panel
        </Link>
      </nav>
    </header>
  );
}

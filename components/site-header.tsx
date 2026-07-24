"use client";

import Image from "next/image";
import Link from "next/link";

type SiteHeaderProps = {
  active?:
    | "catalogo"
    | "carrito"
    | "admin"
    | "productos"
    | "pedidos"
    | "movimientos"
    | "adminCatalogo";
  variant?: "public" | "admin";
};

export function SiteHeader({ active, variant = "public" }: SiteHeaderProps) {
  const isAdmin = variant === "admin";

  return (
    <header className="topbar">
      <Link
        className="brand"
        href={isAdmin ? "/admin" : "/"}
        aria-label={isAdmin ? "Ir al panel administrativo" : "Ir al inicio"}
      >
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

      <nav
        className="nav"
        aria-label={isAdmin ? "Navegación administrativa" : "Navegación principal"}
      >
        {isAdmin ? (
          <>
            <Link className={active === "admin" ? "active" : ""} href="/admin">
              Inventario
            </Link>
            <Link
              className={active === "productos" ? "active" : ""}
              href="/admin/productos"
            >
              Productos
            </Link>
            <Link
              className={active === "adminCatalogo" ? "active" : ""}
              href="/admin/catalogo"
            >
              Catálogo
            </Link>
            <Link
              className={active === "pedidos" ? "active" : ""}
              href="/admin/pedidos"
            >
              Pedidos
            </Link>
            <Link
              className={active === "movimientos" ? "active" : ""}
              href="/admin/movimientos"
            >
              Movimientos
            </Link>
          </>
        ) : (
          <>
            <Link
              className={active === "catalogo" ? "active" : ""}
              href="/catalogo"
            >
              Catálogo
            </Link>
            <Link
              className={active === "carrito" ? "active" : ""}
              href="/carrito"
            >
              Carrito
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

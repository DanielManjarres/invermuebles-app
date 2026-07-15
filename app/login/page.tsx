"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { company } from "@/lib/company";

const demoUser = "admin";
const demoPassword = "invermuebles2026";

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (user !== demoUser || password !== demoPassword) {
      setError("Usuario o contraseña incorrectos.");
      return;
    }

    document.cookie =
      "invermuebles_session=demo-admin; path=/; max-age=28800; SameSite=Lax";
    const nextPath = new URLSearchParams(window.location.search).get("next");
    router.push(nextPath || "/admin");
  }

  return (
    <main>
      <SiteHeader />
      <section className="loginPage">
        <div className="loginShell">
          <aside className="loginIntro">
            <p className="eyebrow">Zona privada</p>
            <h1>Gestión interna del almacén</h1>
            <p>
              Acceso reservado para el personal autorizado de {company.name}.
              Desde aquí se administra la información del inventario y los
              productos visibles en la web.
            </p>
            <div className="loginTrust">
              <ShieldCheck size={20} />
              <span>Acceso protegido para secretaria y administrador.</span>
            </div>
          </aside>

          <form className="loginCard" onSubmit={handleSubmit}>
            <div className="loginLogoRow">
              <Image
                src="/logo-invermuebles.png"
                alt="Invermuebles del Quindío"
                width={82}
                height={82}
                priority
              />
              <div>
                <p className="eyebrow">Acceso interno</p>
                <h2>Panel administrativo</h2>
              </div>
            </div>

            <p className="loginHelp">
              Ingresa tus credenciales para continuar al panel de gestión.
            </p>

            <label>
              Usuario
              <span className="fieldControl">
                <UserRound size={19} />
                <input
                  autoComplete="username"
                  onChange={(event) => setUser(event.target.value)}
                  placeholder="Ingresa tu usuario"
                  type="text"
                  value={user}
                />
              </span>
            </label>

            <label>
              Contraseña
              <span className="fieldControl">
                <KeyRound size={19} />
                <input
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Ingresa tu contraseña"
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  className="passwordToggle"
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            {error ? <p className="formError">{error}</p> : null}

            <button className="primaryButton fullWidth" type="submit">
              <LockKeyhole size={18} />
              Ingresar
            </button>

            <Link className="loginBackLink" href="/catalogo">
              <ArrowLeft size={17} />
              Volver al catálogo
            </Link>
          </form>
        </div>
      </section>
    </main>
  );
}

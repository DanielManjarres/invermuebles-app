"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";

const demoUser = "admin";
const demoPassword = "invermuebles2026";

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
        <form className="loginCard" onSubmit={handleSubmit}>
          <Image
            src="/logo-invermuebles.png"
            alt="Invermuebles del Quindío"
            width={96}
            height={96}
            priority
          />
          <div>
            <p className="eyebrow">Acceso interno</p>
            <h1>Panel administrativo</h1>
            <p>
              Ingresa con un usuario autorizado para gestionar la información
              del almacén.
            </p>
          </div>

          <label>
            Usuario
            <input
              autoComplete="username"
              onChange={(event) => setUser(event.target.value)}
              placeholder="Usuario"
              type="text"
              value={user}
            />
          </label>

          <label>
            Contraseña
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Contraseña"
              type="password"
              value={password}
            />
          </label>

          {error ? <p className="formError">{error}</p> : null}

          <button className="primaryButton fullWidth" type="submit">
            <LockKeyhole size={18} />
            Ingresar
          </button>
        </form>
      </section>
    </main>
  );
}

"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.push("/login");
  }

  return (
    <button className="secondaryButton" type="button" onClick={handleLogout}>
      <LogOut size={18} />
      Cerrar sesión
    </button>
  );
}

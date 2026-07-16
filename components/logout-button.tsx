"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  function handleLogout() {
    document.cookie =
      "invermuebles_session=; path=/; max-age=0; SameSite=Lax";
    router.push("/login");
  }

  return (
    <button className="secondaryButton" type="button" onClick={handleLogout}>
      <LogOut size={18} />
      Cerrar sesión
    </button>
  );
}

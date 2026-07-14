import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Invermuebles del Quindio",
  description: "Aplicacion web de ventas para muebles y electrodomesticos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

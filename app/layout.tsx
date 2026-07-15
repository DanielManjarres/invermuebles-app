import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Invermuebles del Quindío",
  description: "Aplicación web de ventas para muebles y electrodomésticos.",
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

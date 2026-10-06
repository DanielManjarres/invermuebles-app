# Invermuebles del Quindío

Aplicación web comercial para el almacén Invermuebles del Quindío. Incluye
catálogo público y un panel administrativo para gestionar inventario,
productos, clientes, pedidos, ventas, cartera y movimientos.

## Estado del proyecto

El proyecto está funcionalmente avanzado, pero esta copia todavía no ha sido
validada después del restablecimiento del equipo. El diagnóstico completo, los
riesgos conocidos y el punto recomendado para retomar el desarrollo están en
[docs/project-status.md](docs/project-status.md).

## Requisitos

- Node.js 24 LTS recomendado (el proyecto acepta Node.js 20.9 o superior).
- npm.
- PostgreSQL.
- Git para recuperar el control de versiones de esta copia.

## Puesta en marcha local

1. Copiar `.env.example` como `.env` y reemplazar todos los valores de ejemplo.
2. Instalar dependencias con `npm ci`.
3. Generar el cliente con `npx prisma generate`.
4. Aplicar las migraciones con `npx prisma migrate deploy`.
5. Cargar datos iniciales, solo si corresponde, con `npm run db:seed`.
6. Iniciar la aplicación con `npm run dev`.

El usuario inicial creado por el *seed* es `admin@invermuebles.com`; su
contraseña proviene de `ADMIN_PASSWORD`.

## Comandos principales

```bash
npm run dev
npm run build
npm run lint
npm run test:types
npm run test:unit
npm run test:integration
npm run test:coverage
npm run test:system
npm test
```

`npm test` ejecuta tipos, lint, cobertura, compilación y pruebas de sistema. La
estrategia, los requisitos de la base aislada y la lista de aceptación están en
[docs/testing-strategy.md](docs/testing-strategy.md).

## Funcionalidad implementada

- Inicio, catálogo público, búsqueda, filtros y productos destacados.
- Carrito y registro de solicitudes de pedido para continuar por WhatsApp.
- Inicio y cierre de sesión para el panel interno.
- Gestión de productos, categorías, tipos, atributos e imágenes.
- Inventario, alertas de existencias y movimientos de stock.
- Clientes y consulta de su historial comercial.
- Flujo de pedidos hasta su conversión en venta.
- Ventas de contado, crédito, credicontado, separado y Sistecrédito.
- Cartera, abonos, capital, intereses, saldos y recibos.
- Numeración de ventas, facturas y comprobantes de pago.
- Exportación de reportes administrativos a Excel.

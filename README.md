# Invermuebles del Quindio

Aplicacion web de ventas con panel administrativo basico para inventario, pensada como caso practico para aplicar modelos de calidad y metodologias de desarrollo de software.

## Comandos

```bash
npm.cmd install
npm.cmd run dev
npm.cmd test
npm.cmd run test:coverage
```

`npm test` ejecuta tipos, lint, cobertura, build y pruebas de sistema. La
estrategia completa, los requisitos de la base aislada y la lista de aceptación
están en [docs/testing-strategy.md](docs/testing-strategy.md).

## Alcance inicial

- Catalogo web de productos sin precios visibles.
- Carrito para seleccionar productos.
- Envio del pedido a WhatsApp para continuar la venta.
- Panel administrativo basico para consultar inventario.
- Estructura preparada para integrar base de datos y modulos de clientes, ventas y creditos.

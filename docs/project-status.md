# Estado y continuidad del proyecto

Última reconstrucción del contexto: 5 de octubre de 2026.

## Resumen ejecutivo

Invermuebles es una aplicación comercial de alcance considerable, no un
prototipo básico. La copia contiene 13 páginas, 25 archivos de rutas API, 18
migraciones de base de datos y 125 casos de prueba. El entorno fue recuperado y
la suite completa pasa correctamente en este equipo.

El último frente de trabajo identificable fue la simplificación del catálogo:
se añadieron características directamente al producto y luego se eliminaron
las variantes y la taxonomía antigua. Las migraciones más recientes son del 13,
14 y 15 de septiembre de 2026.

El historial fue recuperado desde
`https://github.com/DanielManjarres/invermuebles-app.git`. La rama local `main`
rastrea `origin/main` desde el commit `4011a83`; los cambios realizados durante
la recuperación permanecen locales y todavía no se han confirmado ni enviado.

## Arquitectura

- Interfaz y servidor: Next.js 16 con App Router, React 19 y TypeScript estricto.
- Base de datos: PostgreSQL mediante Prisma 6.
- Procesamiento de imágenes: Sharp; normaliza las imágenes a WEBP cuadrado.
- Reportes: ExcelJS, generados desde el navegador.
- Iconos: Lucide React.
- Estilos: hoja global propia en `app/styles.css`.
- Autenticación: usuarios en PostgreSQL, contraseñas con `scrypt` y cookie de
  sesión firmada con HMAC, válida durante ocho horas.
- Automatización: GitHub Actions con Node.js 24 y PostgreSQL 16.

### Producción en Railway

La aplicación está desplegada en Railway en
`https://invermuebles-del-quindio.up.railway.app/`. La configuración fue
inspeccionada en modo lectura el 6 de octubre de 2026:

- Proyecto `Apps Webs`, entorno `production`.
- Servicios `invermuebles-app` y `Postgres`.
- El servicio web se construye desde `main`; el despliegue activo corresponde
  al commit `4011a83` y está en estado correcto.
- Railway usa Railpack, Node.js 20.20.2, `npm run build` y `npm run start`.
- La base de producción usa PostgreSQL 18 con volumen persistente en
  `/var/lib/postgresql/data`.
- Las imágenes usan un volumen persistente en `/app/uploads/products` y la
  variable `UPLOAD_DIR` está definida.
- También están definidas `DATABASE_URL` y `SESSION_SECRET`; sus valores no se
  leyeron ni documentaron.
- No hay `healthcheckPath` ni comando previo al despliegue. `npm run start`
  ejecuta las migraciones mediante el script `prestart` del proyecto.
- La consulta reciente no encontró errores de ejecución ni respuestas HTTP 5xx.

El repositorio no contiene un archivo específico de Railway; parte de esta
configuración vive únicamente en el servicio remoto.

## Módulos presentes

### Sitio público

- Página principal con información comercial y productos destacados.
- Catálogo con búsqueda, categorías y detalle de producto.
- Carrito almacenado en el navegador.
- Creación de pedidos web sin mostrar precios y continuación por WhatsApp.

### Administración

- Inventario general y niveles mínimos.
- Catálogo y visibilidad pública de productos.
- Productos, categorías, tipos y atributos configurables.
- Carga, descarga y normalización de imágenes.
- Movimientos de entrada, salida, ajuste y corrección de inventario.
- Clientes, estados e historial comercial.
- Pedidos con estados pendiente, contactado y confirmado.
- Conversión protegida de un pedido confirmado en una única venta.
- Ventas locales o procedentes de pedidos.
- Modalidades: contado, crédito, credicontado, separado y Sistecrédito.
- Entregas, abonos, cartera, capital, intereses y recibos.
- Numeración de ventas y facturación.
- Informes Excel de productos, inventario, movimientos, clientes, pedidos,
  ventas y cartera.

## Modelo de datos

Las entidades principales son:

- `User`: usuarios internos y rol declarado (`ADMIN` o `SECRETARY`).
- `Category`, `CatalogProductType`, `AttributeDefinition` y `AttributeOption`:
  taxonomía configurable del catálogo.
- `Product`, `ProductAttributeValue` y `ProductImage`: producto simplificado,
  características e imágenes.
- `StockMovement`: trazabilidad del inventario.
- `Customer`: datos personales, referencia y estado comercial.
- `Order` y `OrderItem`: solicitudes del catálogo y pedidos internos.
- `Sale`, `SaleItem` y `SalePayment`: venta, detalle y pagos.
- `Credit` y `CreditPayment`: financiación, capital, interés y saldo.
- `DocumentSequence`: consecutivos independientes de documentos y recibos.

La base se construye mediante 18 migraciones. No se debe usar `prisma db push`
en producción como sustituto de las migraciones.

## Pruebas y calidad

La suite declara:

- 116 pruebas unitarias.
- 3 pruebas de integración de reglas comerciales.
- 6 pruebas de sistema contra el servidor compilado y PostgreSQL.
- Umbrales de cobertura: 95 % de líneas, 90 % de ramas y 95 % de funciones en
  los módulos incluidos en las pruebas.
- Verificación de tipos, ESLint y compilación de producción.
- CI con una base PostgreSQL desechable.

Estado verificado el 5 de octubre de 2026:

- Git 2.55.0, Node.js 24.19.0, npm 11.17.0 y PostgreSQL 16.15 instalados.
- Las 18 migraciones se aplicaron desde cero en bases separadas de desarrollo y
  pruebas.
- TypeScript y ESLint terminaron sin errores.
- 119 pruebas unitarias y de integración, y 6 pruebas de sistema, aprobadas.
- Cobertura obtenida: 96,63 % de líneas, 92,54 % de ramas y 97,03 % de
  funciones.
- Build de producción correcto con Next.js 16.3.8.
- La base de desarrollo quedó sembrada con 4 categorías, 11 tipos, 12 productos
  y 11 movimientos iniciales.

La actualización compatible corrigió la alerta crítica de Next.js y actualizó
Sharp. `npm audit --omit=dev` conserva tres alertas altas en `deepmerge-ts`,
arrastradas por la herramienta Prisma. npm solo propone resolverlas mediante
`--force` y una regresión a Prisma 6.12.0; no se aplicó esa regresión.

## Variables y datos locales

Variables necesarias o utilizadas por el proyecto:

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión PostgreSQL de la aplicación y Prisma. |
| `SESSION_SECRET` | Firma de las sesiones; debe ser largo, aleatorio y privado. |
| `ADMIN_PASSWORD` | Contraseña que el *seed* asigna al administrador inicial. |
| `TEST_DATABASE_URL` | Habilita pruebas que escriben en una base desechable. |
| `UPLOAD_DIR` | Directorio persistente opcional para imágenes de productos. |

Nunca se debe conectar `TEST_DATABASE_URL` a producción. La base anterior, las
credenciales y las imágenes cargadas no están incluidas en esta copia. El
directorio `public/uploads` está ignorado deliberadamente por Git.

## Riesgos y deuda técnica priorizada

### Prioridad alta antes del próximo despliegue

1. Configurar respaldos automáticos de PostgreSQL o PITR. Actualmente PITR está
   desactivado, no existe una programación y el único respaldo listado tiene
   fecha de expiración del 21 de septiembre de 2026.
2. Confirmar y rotar la contraseña del administrador si alguna vez se utilizó
   el valor predeterminado del *seed*. `ADMIN_PASSWORD` no está definido en el
   servicio web actual, aunque el usuario ya creado conserva su hash en la base.
3. Mantener `SESSION_SECRET` independiente y rotarlo mediante un procedimiento
   controlado si se sospecha exposición; la variable sí está configurada.
4. Añadir limitación de intentos al inicio de sesión y al endpoint público de
   pedidos para reducir fuerza bruta y spam.
5. Añadir un `healthcheckPath` de Railway que no dependa de autenticación.

### Prioridad media

1. Implementar autorización real por rol o eliminar el rol si no se utilizará.
   Actualmente cualquier usuario activo con contraseña válida recibe una sesión
   administrativa equivalente; `SECRETARY` no limita acciones.
2. Vincular la sesión a un usuario concreto si se necesita auditoría y
   revocación. El token actual solo declara `role: admin`.
3. Incorporar pruebas de componentes y recorridos de navegador. Las pruebas
   actuales cubren principalmente reglas puras y un *smoke test* HTTP.
4. Documentar la configuración existente de Railway, las copias de seguridad,
   la restauración y la rotación de secretos.
5. Revisar accesibilidad, comportamiento móvil y navegadores con la lista manual
   de `docs/testing-strategy.md`.

### Observaciones

- El endpoint de imágenes contiene protección contra recorrido de directorios.
- La importación remota de imágenes exige HTTPS, limita tamaño y redirecciones,
  y rechaza direcciones privadas para reducir SSRF.
- Las escrituras administrativas revisadas exigen sesión. La creación pública
  de pedidos es intencional y valida productos, visibilidad y existencias.
- Las operaciones críticas de inventario y ventas aplican transacciones y
  reglas defensivas, según la estructura revisada y sus pruebas.
- Los textos mostrados con caracteres extraños durante la auditoría provienen
  de la codificación de la consola PowerShell restaurada; los archivos se
  conservan en UTF-8 y no fueron convertidos masivamente.

## Recuperación realizada en este equipo

Se instalaron Git, Node.js 24 LTS y PostgreSQL 16. El repositorio original fue
reconectado, se crearon bases locales separadas para desarrollo y pruebas, y se
ejecutaron correctamente:

   ```powershell
   npm ci
   npx prisma generate
   npx prisma migrate deploy
   npm test
   npm run test:security
   ```

La base local de desarrollo también recibió los datos de demostración mediante
`npm run db:seed`. Esto no modificó la base ni el despliegue de Railway.

## Punto recomendado para retomar

La recuperación local ya terminó. Antes de enviar cambios a `main`, se debe
reducir el conjunto local a lo estrictamente necesario, confirmar qué rama
despliega Railway automáticamente y revisar sus variables, base de datos y
almacenamiento persistente. No se debe hacer `push` hasta completar esa revisión
porque podría activar un despliegue de producción.

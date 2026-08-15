# Estrategia de pruebas

## Objetivo

La estrategia busca comprobar el comportamiento comercial de Invermuebles sin
usar datos de producción. Sigue una pirámide de pruebas: muchas pruebas
unitarias rápidas, algunas integraciones de flujos y pocas pruebas de sistema
contra la aplicación compilada.

## Capas automatizadas

| Capa | Alcance | Comando |
| --- | --- | --- |
| Tipos | Contratos TypeScript | `npm run test:types` |
| Análisis estático | Reglas de Next.js, React y TypeScript | `npm run lint` |
| Unitarias | Políticas, cálculos, validaciones y almacenamiento local | `npm run test:unit` |
| Integración | Interacción entre pedidos, ventas, pagos, entrega y cartera | `npm run test:integration` |
| Cobertura | Unitarias e integración con umbrales mínimos | `npm run test:coverage` |
| Sistema | Build y pruebas HTTP sobre `next start` | `npm run test:system` |
| Dependencias | Avisos de seguridad publicados por npm | `npm run test:security` |
| Suite completa | Todas las capas anteriores | `npm test` |

Los umbrales actuales son 95% de líneas, 90% de ramas y 95% de funciones en
los módulos puros importados por las pruebas. La cobertura no debe interpretarse
como cobertura total de componentes React o consultas Prisma.

## Base de datos de pruebas

Las pruebas que crean o eliminan registros solo se ejecutan cuando existe
`TEST_DATABASE_URL`. Esa URL debe apuntar a una base PostgreSQL desechable y
nunca puede ser igual a la base de producción.

GitHub Actions levanta PostgreSQL en un contenedor, aplica las migraciones con
`prisma migrate deploy` y elimina el contenedor al finalizar. Localmente, la
prueba se marca como omitida cuando no existe una base aislada.

## Casos críticos automatizados

- Hash y validación de contraseñas.
- Protección de rutas administrativas y APIs de escritura.
- Validaciones de clientes y bloqueo de documentos duplicados.
- Creación, edición y eliminación segura de clientes por API.
- Bloqueo de eliminación cuando el cliente conserva historial.
- Transiciones de pedidos y preparación de ventas.
- Estados de entrega para ventas financiadas.
- Abonos de separados, límites de saldo y finalización del pago.
- Agrupación de contado, crédito, credicontado, separado y Sistecrédito.
- Distribución de pagos entre capital e interés.
- Cálculo de inventario y políticas de eliminación de productos.
- Lectura, escritura y recuperación ante datos locales inválidos.
- Build de producción y disponibilidad de rutas esenciales.

## Pruebas de aceptación manual

Antes de integrar un módulo en `main`, se debe comprobar en el despliegue:

1. Iniciar y cerrar sesión con credenciales válidas.
2. Crear y editar un cliente; comprobar duplicados y eliminación protegida.
3. Crear un pedido, marcarlo contactado, asociar cliente y confirmarlo.
4. Convertir el pedido en venta y comprobar que no pueda venderse dos veces.
5. Registrar ventas de contado, crédito, credicontado, separado y Sistecrédito.
6. Confirmar que inventario, movimientos y estado de entrega sean coherentes.
7. Registrar abonos y comprobar saldo, capital, interés e historial.
8. Verificar las cuentas del cliente en Cartera y en su perfil.
9. Probar búsquedas, filtros, paginación y diseño móvil.
10. Confirmar mensajes, modales y solicitudes de eliminación permanente.

## Pruebas no funcionales recomendadas

Para el alcance académico actual se priorizan:

- Seguridad básica: autorización, validación de entradas y revisión de
  dependencias.
- Accesibilidad manual: navegación por teclado, etiquetas, contraste y foco.
- Compatibilidad: Chrome, Edge, Firefox y una resolución móvil.
- Rendimiento básico: tiempos de carga y consultas con varios registros.
- Recuperación: comprobar migraciones desde una base vacía y restauración de
  una copia de seguridad.

Pruebas de estrés prolongado, grandes volúmenes distribuidos y múltiples zonas
geográficas quedan fuera del alcance actual del almacén y del proyecto
universitario.

## Riesgos conocidos

La actualización compatible dejó Next.js en 15.5.23 y corrigió avisos de
`nanoid`, `js-yaml` y `brace-expansion`. `npm audit` todavía reporta tres avisos
altos heredados de `postcss` y `sharp`. La corrección propuesta exige migrar a
Next.js 16.3.1, por lo que debe realizarse en una rama independiente y nunca con
`npm audit fix --force` sin revisar la guía de migración y ejecutar toda la
suite.

## Criterio de terminado

Un cambio está listo para integrarse cuando:

- `npm test` termina correctamente.
- `git diff --check` no informa errores.
- No se usaron credenciales ni datos de producción en pruebas.
- Los casos de aceptación afectados fueron comprobados manualmente.
- El cambio tiene un propósito concreto y un commit identificable.

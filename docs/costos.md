# Costos

Grupo «Costos» del menú, pensado para Abastecimiento. Reemplaza el aplicativo externo «Control de
Precios JDH». El contrato del API (reglas de la cotización vigente, estados, job de novedades) está
en `docs/costos.md` del repositorio del API; este documento cubre la UI.

Son cuatro plantillas de `MODULE_TEMPLATES` (`src/shared/config/areas.config.ts`), categoría
`Costos`, cada una con su clave. Como toda plantilla, existen para cualquier área: el administrador
las enciende donde haga falta (`/ti/administracion/modulos`) y `my_modules` decide quién las ve.

| Ruta | Clave | Pantalla |
| --- | --- | --- |
| `/{área}/analisis-entradas` | `analisis-entradas` | `EntriesView` |
| `/{área}/novedades-compras` | `novedades-compras` | `NoveltiesView` |
| `/{área}/alzas-proveedor` | `alzas-proveedor` | «Próximamente» (`available: false`): el API llega en un segundo PR |
| `/{área}/acumulado-alzas` | `acumulado-alzas` | `PriceIncreasesView` y, con `?vista=analisis`, `PriceIncreaseAnalysisView` |

Código: `src/features/costs/`. Cada página llama a `requireModule` y monta `CostsScreen`, que
consulta `GET /costs/permissions` (`CostsAccess`) antes de abrir la vista: quien no tiene `can_read`
de la clave ve por qué, no una pantalla de 403. Los permisos nunca se deducen del área.

## Análisis de entradas

- **Periodo:** por defecto los últimos 30 días. El API lee hasta 200 días a la vez; si el rango pasa
  de eso, la vista lo dice y no consulta.
- **Abre en «Solo novedades»** (`novelty=true`: con novedad y sin cotización), que es el trabajo
  del día. Un chip de estado lo reemplaza; los conteos salen de `counts`.
- **Filtros:** búsqueda, proveedor (buscador de `GET /commercial/suppliers`, manda el `code`), C.O.,
  bodega y motivo.
- **Motivo por línea** (`ReasonPicker`): solo con `can_set_reasons`. Una lista filtrable de los
  motivos activos que guarda al elegir (`PUT /costs/entries/{line_key}/reason`); elegir el mismo o
  «Quitar el motivo» lo quita. Un motivo desactivado que la línea ya tenía se muestra, pero no se
  puede elegir.
- Si `previous_from_warehouse` es `false`, una nota bajo la tabla avisa que el precio anterior sale
  del periodo leído (el DWH aún no publica su PR #160).

## Novedades y notas crédito

- **Abre en «Pendiente».** Los estados son chips con sus conteos; el estado no se edita: sale del
  motivo y de la nota.
- **Motivo editable** en la fila y en el detalle (`PUT /costs/novelties/{id}/reason`), salvo en una
  novedad anulada.
- **Nota crédito** (`manage` de `novedades-compras`): número, valor y soporte. El soporte es
  opcional en el formulario porque si el número ya existe para el proveedor el API reutiliza el suyo;
  si es un número nuevo sin archivo, el API lo rechaza con su mensaje. El valor acepta
  `1.250.000,50` o `1250000.50`.
- **Detalle** (`GET /costs/novelties/{id}`): la línea, el motivo, la nota con su soporte (visor en la
  plataforma) y el historial. Quitar la nota pide confirmación.

## Acumulado de alzas

Las mismas vistas que BI tiene en Maestros > Productos (que se quedan ahí). Los endpoints
`/commercial/price-increases*` aceptan `maestros` o `acumulado-alzas`, y `can_manage` (cargar el
libro, poner la fecha de SIESA) lo responde el mismo endpoint.

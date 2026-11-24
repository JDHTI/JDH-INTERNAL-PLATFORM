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
| `/{área}/alzas-proveedor` y `/{área}/alzas-proveedor/{id}` | `alzas-proveedor` | `IncreaseRequestsView` y `IncreaseRequestDetailView` |
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
- **Columnas** (las mismas en Novedades): entrada, producto, el grupo **Precio de compra** con
  Actual (`unit_price`), Anterior (`previous_price`) y Antepenúltimo (`antepenultimate_price`),
  Cotización, Diferencia y estado con el motivo.
- **Cotización** (`quotation`) es lo que debió costar la entrada: la cotización vigente menos su
  Tasa 1. La diferencia se mide contra ella. Debajo, cuando hay Tasa 1, van la lista
  (`quotation_list_price`) y la Tasa 1 (`discount_pct`, fracción: 0,2 se muestra 20 %); el
  tooltip suma la fecha de vigencia.
- Si `previous_from_warehouse` es `false`, una nota bajo la tabla avisa que las compras anteriores
  salen del periodo leído (el DWH aún no publica su PR #160).

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

## Alzas de proveedor

API: `/costs/increase-requests` (PR #110 de la API). `read` consulta y descarga; `manage` carga,
digita, corrige, aprueba y rechaza.

- **Proveedor:** el buscador de `GET /commercial/suppliers` (manda el `code`). Abre las acciones y
  filtra la bandeja; sin proveedor, la bandeja muestra las solicitudes de todos.
- **Descargar MAESTRA:** `GET /template` se guarda con el nombre que da el API en
  `Content-Disposition` (`MAESTRA 50 - ASCENDER S.A. 23-11-2026.xlsx`).
- **Cargar la MAESTRA diligenciada** (`IncreaseUploadDialog`): elegir el archivo lo lee sin guardar
  (`apply=false`) y muestra filas leídas, las referencias con costo nuevo y los problemas por fila.
  Un problema bloquea la carga (`blocked`). «Crear solicitud» la envía con `apply=true` y abre la
  solicitud creada.
- **Digitar alzas** (`ManualRequestDialog`): busca entre los productos activos del proveedor
  (`GET /items`). Cada línea lleva regional, costo nuevo, fecha (la de la anterior por defecto),
  descuento regular, PVP sin IVA (opcional) y observación (la lista de la MAESTRA).
- **Regional** (desde el PR #118 de la API): `NACIONAL` (por defecto), una de las seis o
  `RESTO DE REGIONALES`. Una referencia puede ir en varias líneas («Otra regional»). El formulario
  replica las reglas que valida la API (`lib/regionals.ts`): Nacional va sola en su referencia,
  una regional no se repite, y «Resto» necesita otra línea con una regional y debe dejar alguna por
  cubrir. Para «Resto» muestra qué regionales cubre.
- **Descuento regular:** se escribe en puntos (`5`, `2,5`) y viaja como fracción. Ya no hay
  descuentos por regional: una regional con otro costo es otra línea.
- **Bandeja:** abre en «En revisión», con chips por estado y sus `counts`.
- **Detalle:** cada línea con su regional junto a la referencia (para «Resto», las que cubre según
  `regionals`), costo anterior y nuevo con y sin impuesto saludable, variación en pesos y en %,
  estado del incremento (`change_label` con el color del acumulado), fecha, descuento, PVP y
  observación. Mientras está en revisión, quien gestiona corrige una línea (`LineEditDialog`; la
  regional no se edita), la deja por fuera o la vuelve a incluir, aprueba (nota opcional) o
  rechaza (motivo obligatorio). Con `has_file` se descarga el libro original.

## Acumulado de alzas

Las mismas vistas que BI tiene en Maestros > Productos (que se quedan ahí). Los endpoints
`/commercial/price-increases*` aceptan `maestros` o `acumulado-alzas`, y `can_manage` (cargar el
libro, poner la fecha de SIESA) lo responde el mismo endpoint. El histórico muestra el origen de
cada alza (`source`): el libro de alzas o una solicitud de proveedor aprobada, que llega sin fecha
de SIESA.

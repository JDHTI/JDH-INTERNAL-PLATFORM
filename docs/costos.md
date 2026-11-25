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

- **Periodo:** abre en el último día cargado, con todas sus líneas, para que la pantalla nunca
  quede vacía. Ese día sale de la línea más reciente del periodo por defecto del API (`GET /entries`
  sin fechas, `sort=date`, `size=1`); si esos 30 días no tienen entradas, la vista los muestra.
  Más días se piden en el selector (sus atajos: 7 días, 30 días, mes); limpiarlo vuelve al último
  día. El API lee hasta 200 días a la vez; si el rango pasa de eso, la vista lo dice y no consulta.
- **«Solo novedades»** (`novelty=true`: con novedad y sin cotización) es un chip, apagado al
  abrir. Un chip de estado lo reemplaza; los conteos salen de `counts`.
- **Filtros:** búsqueda, proveedor (buscador de `GET /commercial/suppliers`, manda el `code`), C.O.,
  bodega y motivo. C.O. y bodega son desplegables con los del periodo (`GET /costs/entries/options`;
  Novedades usa `GET /costs/novelties/options` con el periodo de la bandeja, o todas sin fechas).
  Al elegir un C.O., las bodegas se reducen a las suyas; cambiar el periodo limpia los dos.
- **Campos resaltados:** C.O., bodega, proveedor y cantidad con unidad de compra van en chips
  neutros (`tag` en `line-cells.tsx`), sin colores nuevos.
- **Motivo por línea** (`ReasonPicker`): solo con `can_set_reasons`. Una lista filtrable de los
  motivos activos que guarda al elegir (`PUT /costs/entries/{line_key}/reason`); elegir el mismo o
  «Quitar el motivo» lo quita. Un motivo desactivado que la línea ya tenía se muestra, pero no se
  puede elegir.
- **Columnas** (las mismas en Novedades): entrada, producto, **Precio de compra** (Actual en
  negrita, Anterior y Antepenúltimo, uno debajo del otro: `unit_price`, `previous_price`,
  `antepenultimate_price`), Cotización, Diferencia y estado con el motivo.
- **Cotización:** arriba «Neta» (`quotation`), lo que debió costar la entrada: la cotización
  vigente menos su Tasa 1; contra ella se mide la diferencia. Bajo un separador, «Lista»
  (`quotation_list_price`) y «Tasa 1» (`discount_pct`, fracción: 0,2 se muestra 20 %) en filas
  propias. Sin Tasa 1 la celda dice «Sin Tasa 1»: la lista es igual a la neta. Es el caso de
  Team Foods, con todas sus cotizaciones en 0 (validado en el DWH el 2026-11-24).
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
- **Soporte del proveedor** (PR #125 del API): opcional, PDF, imagen, Excel o Word hasta 10 MB
  (`support-file.tsx` lo valida antes; el API decide). En la carga viaja como `support` en la
  simulación y en el apply, así que un archivo inválido se ve antes de crear. En el formulario
  manual se adjunta con `PUT /{id}/support` justo después de crear; si falla, la solicitud queda
  creada y un aviso pide adjuntarlo desde el detalle.
- **Bandeja:** abre en «En revisión», con chips por estado y sus `counts`. Un clip marca las
  solicitudes con soporte.
- **Detalle:** cada línea con su regional junto a la referencia (para «Resto», las que cubre según
  `regionals`), costo anterior y nuevo con y sin impuesto saludable, variación en pesos y en %,
  estado del incremento (`change_label` con el color del acumulado), fecha, descuento, PVP y
  observación. Mientras está en revisión, quien gestiona corrige una línea (`LineEditDialog`; la
  regional no se edita), la deja por fuera o la vuelve a incluir, aprueba (nota opcional) o
  rechaza (motivo obligatorio). Con `has_file` se descarga el libro original.
- **Soporte en el detalle** (`RequestSupport`): nombre y tamaño, «Ver» (`?inline=true`, en una
  pestaña nueva) y «Descargar», para cualquiera con `read`. En revisión, quien gestiona adjunta,
  reemplaza o quita (con confirmación); decidida la solicitud, solo se ve y se descarga.

- **Comunicado** (PR #127 del API): cada solicitud trae `loaded_count`, las líneas aprobadas que
  SIESA ya tiene; la bandeja y el detalle lo muestran («3 de 5 en SIESA»). Cualquiera con `read`
  marca solicitudes aprobadas (o toma todas las aprobadas, del proveedor elegido si hay uno) y
  «Generar comunicado» descarga el xlsx (`POST /notice`). Si `X-Notice-Skipped` es mayor que cero,
  un aviso dice cuántas alzas aún no están en SIESA; si ninguna lo está, el 422 del API.

## Acumulado de alzas

Las mismas vistas que BI tiene en Maestros > Productos (que se quedan ahí), con tres pestañas:
histórico, análisis y **Lotes de cargue** (`?vista=lotes`). Los endpoints
`/commercial/price-increases*` aceptan `maestros` o `acumulado-alzas`, y `can_manage` (generar
lotes, confirmarlos, poner la fecha de SIESA) lo responde el mismo endpoint. Las alzas entran al
aprobar solicitudes de proveedor y, mientras el área siga llevando el libro «Acumulado Alza Precios»
en un sheet aparte, también con **«Cargar acumulado»** (`POST /upload`, simula y aplica; volvió el
2026-11-25 tras quitarse en el #127). **«Descargar acumulado»** (`GET /export`, con los filtros del
histórico) lo baja en ese mismo formato.

- **Marcar como cargadas** (barra de pendientes): las alzas elegidas, o todas las pendientes del
  filtro, toman la fecha de SIESA que se elija (hoy por defecto, sin futuras) sin lote ni archivo
  (`POST /system-date`). Es para ponerse al día con lo cargado por fuera; las que están en un lote
  abierto quedan por fuera y se avisa cuántas.

- **Cargue a SIESA** (`siesa-load-*.tsx`), con el patrón del cotizador:
  1. En el histórico, quien gestiona marca alzas pendientes sin lote abierto (las demás no tienen
     casilla) o toma «las pendientes del filtro» (hasta 2.000). La selección se pierde al cambiar
     de filtro. Una alza en un lote abierto lleva el chip «En lote N».
  2. «Generar cargue a SIESA» abre la revisión (`POST /siesa-loads` sin `apply`): lo que va (NIT,
     sucursal, unidad, precio, activación; aviso si otro NIT también la cotiza) y lo que queda por
     fuera con su motivo.
  3. «Generar lote» (`apply=true`) guarda el lote y ofrece el TXT y el libro Excel.
  4. Lotes de cargue: chips por estado; el detalle muestra sus cotizaciones y archivos y, si está
     generado, «Confirmar cargue en SIESA» (día del cargue, hoy por defecto, sin fechas futuras) o
     «Anular» (con confirmación). Confirmar o anular vuelve a leer el histórico y el análisis.
- **Origen:** el histórico muestra de dónde vino cada alza (`source`): el libro de alzas (las
  históricas) o una solicitud de proveedor aprobada, que llega sin fecha de SIESA.

- **C.O. e instalación** (PR #125 del API): dos desplegables filtrables en el histórico y el
  análisis (`increase-scope-filters.tsx`), con las opciones de `GET /options` (`cos`,
  `installations`). Elegir un C.O. reduce las instalaciones a las suyas. Viajan como `co` e
  `installation` y quedan en la URL (`?co=003&instalacion=…`), así que el detalle de una referencia
  usa los mismos y su gráfica y su tabla cambian con ellos. Una nota bajo los filtros explica el
  efecto: solo referencias activas ahí; cuentan las alzas nacionales y las de su regional.
- Sin DWH las opciones llegan vacías y los dos filtros quedan deshabilitados; si ya había uno en la
  URL, el API responde 503 y la vista muestra el mensaje con «Quitar C.O. e instalación».
- Las alzas encadenadas el mismo día traen `occurrence` (1, 2, 3); no se muestra, pero ordena las
  del mismo día en el detalle.

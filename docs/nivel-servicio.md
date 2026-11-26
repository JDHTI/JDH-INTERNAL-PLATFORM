# Nivel de servicio

Grupo «Nivel de servicio» del menú, pensado para Abastecimiento. Reemplaza el tablero de Power BI. El
contrato del API (de dónde salen las líneas, el job, los KPIs, la ABCD) está en `docs/nivel-servicio.md`
del repositorio del API (PR #141); este documento cubre la UI.

Son dos plantillas de `MODULE_TEMPLATES`, cada una con su clave:

| Ruta | Clave | Pantalla |
| --- | --- | --- |
| `/{área}/pendientes-pedidos` | `pendientes-pedidos` | `PendingOrdersView` |
| `/{área}/nivel-servicio` | `nivel-servicio` | `ServiceLevelDashboard` |

Código: `src/features/service-level/`. Cada página llama a `requireModule` y monta
`ServiceLevelScreen`, que consulta `GET /service-level/permissions` antes de abrir la vista.
`can_manage` (de `pendientes-pedidos`) habilita los motivos y el recálculo de la ABCD.

## Filtros (las dos vistas)

`ServiceLevelFilterPanel`:
- **Periodo:** la fecha del pedido. Sin elegir, el API lee el mes actual y el selector muestra el
  periodo que respondió. Limpiar el selector vuelve al mes actual.
- **Desplegables del periodo:** C.O., bodega, proveedor y vendedor salen de `GET /options`, y cambiar
  el periodo los limpia.
- **Cliente:** el buscador de `/commercial/customers`; manda el NIT.
- **Motivo:** incluye «Sin motivo» (`reason=none`).
- **Responsable:** sale de `responsibles` de `/options`.
- **Clases:** clase del producto y del cliente (A–D o «Sin clase»).
- **Búsqueda:** referencia, descripción o documento.

## Pendientes de pedidos

- **Tarjetas:** las cinco de KPI (`KpiCards`) con los totales de todo el filtro, no solo de la
  página.
- **Tabla:** compacta como la del cotizador, y en el teléfono una tarjeta por línea. Las columnas:
  - Pedido: documento, fecha, C.O. y última modificación en SIESA.
  - Producto: referencia, proveedor, bodega y clase.
  - Cliente: razón social, NIT, vendedor y clase.
  - Cantidad: pedida, despachada y pendiente.
  - Valor: subtotal y pendiente.
  - Motivo: el motivo, su responsable y la nota.
- **Orden:** desde los encabezados, como en Costos.
- **«Solo líneas con pendiente»:** abre encendido (`pending=true`). Apagado, la tabla muestra también
  las líneas despachadas completas, que no llevan motivo.

### Motivos

Solo con `can_manage`:
- **En la fila:** el `ReasonPicker` compartido. Guarda al elegir (`PUT /lines/{line_key}/reason`) y
  conserva la nota. El lápiz abre el diálogo para escribir la nota.
- **En bloque:**
  - Se marcan líneas con pendiente (las demás no tienen casilla) y «Asignar motivo» les da el mismo
    motivo y nota (`PUT /lines/reason`).
  - En bloque el motivo es obligatorio; quitarlo es de una línea a la vez.
  - La selección se pierde al cambiar de filtro.
- **Catálogo** («Motivos»): crear con responsable, renombrar, cambiar responsable y activar o
  desactivar (`POST /reasons` y `PATCH /reasons/{id}`). Los motivos no se borran. El responsable
  sugiere los que ya existen.

## Tablero

- **Tarjetas:** las cinco de KPI. NS Total lleva la fórmula como subtítulo.
- **Bandas:** se colorean con `bands`, verde por encima de `green_above` y ámbar desde `amber_from`.
  El color siempre va con su texto («Entre 90,0 % y 96,0 %»).
- **NS Valor por C.O.:** un punto por C.O. sobre una escala que va de un piso redondo a 100 %. Las
  barras desde cero aplanarían diferencias de pocos puntos. Las líneas punteadas marcan las bandas.
- **NS Total día a día:** línea con las bandas punteadas. Al pasar sobre un día se ven sus niveles.
- **Niveles por C.O.:** tabla con los cinco niveles de cada C.O.
- **Valor pendiente por responsable:** barras horizontales ordenadas, con el valor y su participación.
  El brief pedía una dona, pero con más de cuatro o cinco responsables el ranking se lee mejor y no
  hace falta una paleta categórica nueva en DESIGN.md.
- **Desgloses:** una pestaña por dimensión (`GET /dashboard/breakdown`), con paginación de 20.
  - Proveedor, vendedor, cliente, bodega y las clases muestran solicitado, facturado, NS Valor (badge
    con la banda) y % pendiente.
  - Responsable, motivo, productos con pendiente y motivo por ítem cuentan solo lo pendiente:
    solicitado, cantidad pendiente, valor pendiente y % pendiente.
- **Clasificación ABCD:**
  - La curva de Pareto (`GET /pareto`) se ve por productos (por C.O. o todos) o por clientes.
  - Al lado: el último cálculo, la ventana del próximo, los cortes y los ítems por clase.
  - «Recalcular» (`POST /classes/recompute`) aparece con `can_manage`.
  - No toma el periodo de los filtros.

Mientras el DWH no publique su vista, el API responde vacío (`as_of` en null). Las dos vistas lo
dicen en vez de mostrar ceros.

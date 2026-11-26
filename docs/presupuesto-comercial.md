# Gestión comercial: presupuesto comercial y maestro de vendedores

La sección «Gestión comercial» se agregó el 2026-11-26. Las reglas de cada cifra, el cierre y la copia de ventas están en el API (`docs/presupuesto-comercial.md`, JDH-INTERNAL-PLATFORM-API #138). Aquí se explica cómo lo muestra la UI.

- **Código:** `src/features/commercial-budget/`.
- **Rutas:** `/{área}/presupuesto-comercial` y `/{área}/maestro-vendedores`, cada una con su `requireModule`.

## Presupuesto comercial

1. **Permisos** (`GET /commercial-budget/permissions`).
   - Sin `can_read`, o con `scope = none`, la pantalla explica por qué y no pide nada más.
   - El API filtra los vendedores por el alcance de cada persona:
     - BI, los directores y los líderes ven todo;
     - un coordinador ve su equipo;
     - un vendedor se ve a sí mismo.
2. **Mes.** La lista sale de `GET /periods` y abre en el mes en curso (`is_current`). Los filtros se conservan al cambiar de mes.
3. **Avisos.**
   - **Mes cerrado:** «Mes cerrado por X el Y: la asignación de clientes y equipos quedó congelada».
   - **Mes en curso:** se recalcula con el vendedor que cada cliente tiene hoy.
   - **`missing_months`:** meses de la ventana cuyas ventas aún no se copiaron del DWH, así que salen en cero.
4. **Un solo bloque de cifras,** tomadas de `totals` y filtradas:
   - venta del mes;
   - cumplimiento;
   - margen contra presupuesto, en puntos;
   - clientes contra presupuesto;
   - presupuesto de recaudo;
   - % de variación contra el año anterior.
5. **Filtros.**
   - Regional, unidad, equipo y vendedor, de varios valores cada uno.
   - Una búsqueda que espera una pausa al escribir.
   - «Limpiar filtros».
6. **Tabla.**
   - **Agrupación:** regional → equipo → vendedor, con los subtotales de `groups`, que se pueden contraer. El total de la compañía va al pie.
   - **Columnas:** el mismo mes del año anterior, el promedio de los tres meses anteriores y el mes (venta, margen y clientes de cada uno); después el presupuesto (venta, % de margen, # de clientes y recaudo), la variación contra el año anterior y el cumplimiento.
   - **Vendedor:** la columna queda fija al desplazarse hacia los lados. «Sin vendedor asignado» se muestra, pero nunca es editable.
7. **Edición** (`can_manage` y mes abierto).
   - Cada celda del presupuesto se guarda al salir de ella o con Enter; Escape devuelve el valor guardado.
   - Vacía, borra el campo.
   - Envía solo ese campo, con la `version` leída. Después el mes se vuelve a leer: un 409 (mes cerrado o presupuesto cambiado por otra persona) trae los valores vigentes.
   - El margen se escribe en puntos (18 o 18,5) y viaja como fracción.
   - Mientras carga otro mes u otro filtro, la tabla anterior queda atenuada y sin edición.
8. **Historial.** El reloj de cada vendedor abre sus cambios del mes: antes y después de cada campo, el origen (manual o archivo), la nota, quién y cuándo.
9. **Acciones.**
   - **«Sincronizar ventas»** (`can_manage`): `POST /sync`, que tarda unas decenas de segundos.
   - **Menú «Excel»:**
     - el mes con los filtros (`/export`);
     - la plantilla del mes;
     - «Cargar presupuesto» (`can_manage` y mes abierto): primero simula y después aplica, con una nota opcional.
   - **«Cerrar mes»:** solo un mes terminado y abierto.
   - **«Reabrir»:** un mes cerrado.
   - Cerrar y reabrir son de `can_close` y piden confirmación.

## Maestro de vendedores

Se trajo de la plataforma de proveedores (`maestro-vendedores-card.tsx`).

1. **Estado** (`GET /vendor-master/status`).
   - Sin `can_read`, la pantalla explica por qué.
   - Con `configured = false`, dice «La carga no está configurada»; la plantilla se puede bajar igual.
2. **Carga** (`can_manage`).
   - Se elige un .xlsx de hasta 10 MB y se confirma: «Escribe directamente en el DWH; los vendedores que no vengan en el archivo no cambian».
   - La respuesta de dwh-platform se muestra tal cual:
     - los conteos;
     - el estado de la publicación (`transformacion`);
     - la tabla de filas rechazadas;
     - las advertencias.
   - Los errores 400 (archivo rechazado) y 503 (sin configurar o sin respuesta) muestran su motivo.
3. **Cargas anteriores** (`GET /uploads`): fecha, archivo y tamaño, estado, filas rechazadas, advertencias y quién. El archivo no se guarda porque trae datos personales.

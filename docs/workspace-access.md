# Acceso al espacio de trabajo

Quién entra a qué lo decide la API (`internal-platform-api`, `docs/permissions.md`). Esta UI lo
respeta en tres capas y nunca inventa un permiso que el API no haya dado.

## 1. Entrada: `/workspace`

«Mi espacio de trabajo», en el menú de la cuenta de la vista general, abre `/workspace`
(`src/features/areas/components/workspace-guide.tsx`): una guía de qué es el espacio de trabajo y
cómo se navega. Las áreas no se listan ahí: están en el selector de la barra lateral, que en esta
página dice «Selecciona tu área» y abre las que `GET /areas` devuelve, ya filtradas por el API. Sin
áreas, la guía dice a quién pedir acceso. «Volver a la intranet», en el pie de la barra, lleva a `/`.
El slug de cada área (`/bi`) sigue siendo el
segmento de la URL, pero no se muestra en ningún panel: el admin escribe el nombre y la UI
deriva el slug (`src/features/admin/lib/area-slug.ts`).

## 2. Guardias

| Dónde | Qué comprueba | Resultado |
| --- | --- | --- |
| `src/app/(app)/(workspace)/layout.tsx` (servidor) | `requireUser()` | Sin sesión: `/login` |
| `src/app/(app)/(workspace)/[area]/layout.tsx` (servidor) | `GET /areas/{slug}` con las cookies de la persona | 401: `/login`. 403: `/workspace?sin-acceso=area`. 404: página no encontrada. Otro error: lo muestra `AreaGate` con reintento |
| Cada página de módulo (servidor) | `requireModule(área, segmento)` (`src/features/areas/server/area-access.ts`): la ruta debe ser de un módulo del catálogo y su clave estar en `my_modules` del área. Reusa la respuesta de `GET /areas/{slug}` del layout (`cache` por request) | Ruta sin módulo: 404. Módulo apagado o sin permiso: `/{area}?sin-acceso=modulo` |
| `src/features/areas/components/area-gate.tsx` (cliente) | El módulo al que pertenece la ruta (`activeModuleId`) contra `my_modules` del área | Sin permiso: `/{area}?sin-acceso=modulo` |
| `AdminGate` | Rol global `owner` o `admin` | Pantalla «sin permisos» |

El layout de `[area]` no ve la ruta completa y no vuelve a correr al navegar entre módulos de la
misma área, por eso el chequeo por módulo vive en `AreaGate`, que sí sigue el `pathname`.

## 3. Módulos por área y por rol

`GET /areas` trae `my_modules` por área: `{ clave: "read" | "manage" }`, solo con los módulos
**encendidos en esa área**. Dentro de ellos, los administradores reciben todo como `manage`; los
moderadores todo como `read`; el responsable y el líder del área todo como `manage` en la suya; el
resto, lo que concede su rol de área (`area_role_permissions`, comodín `*`).

Cualquier módulo se puede encender en cualquier área (sección «Módulos por área» del panel). Por eso
`src/shared/config/areas.config.ts` no declara módulos por área: `MODULE_TEMPLATES` describe cada
módulo del API una vez y `getModulesByArea(slug)` lo genera para cualquier slug, con la ruta
`/{área}/{segmento}`. `visibleModules(area, isAdmin)` deja los que están en `my_modules`. Lo que sí es de
un área fija vive en `AREA_ROWS`: «Solicitudes de soporte» y Administración en TI, y los
`Próximamente`; esas filas no llevan clave y se muestran a todo miembro del área.

**Secciones del menú** (`MODULE_CATEGORIES`, reordenadas el 2026-11-25):
- **Operación**
- **Cotización y pedidos:** Cotizador y Validador de pedidos.
- **Listas de precios:** Actualización de listas y Listas principales.
- **Solicitudes y costos:** Solicitudes de apoyo y Ajuste de costos.
- **Costos**, **Reportes**, **Monitoreo**, **Apoyos proveedores**, **Maestros generales**, **Administración** y **Documentación**.

La categoría va en la plantilla, y el menú solo arma las secciones que tienen al menos un módulo visible. Por eso una sección aparece en un área en cuanto se le enciende uno de sus módulos; por ejemplo, Actualización de listas trae «Listas de precios».

**Favoritos.** La estrella al final de la ruta del encabezado (`favorite-toggle.tsx`) fija el módulo actual en la sección «Favoritos», arriba del menú (`sidebar-favorites.tsx`).
- **Dónde se guardan:** en el navegador (`localStorage`, llave `jdh-favorites:{id del usuario}`), como `{área, segmento}`, en el orden en que se fijaron y hasta 8.
- **Pestañas:** se sincronizan con el evento `storage`. Sin storage, el menú funciona igual, solo sin favoritos.
- **Otras áreas:** un módulo de otra área a la que se tiene acceso también se puede fijar, y su fila dice el área.
- **Poda:** al leer las áreas, `useFavorites` borra del storage los favoritos cuyo módulo ya no es visible (apagado, desvinculado o sin permiso). Si la lectura de las áreas falla, no borra nada.
- **Sin favoritos:** la sección no existe.

Lo que cada persona hace dentro de un módulo no depende del área en la UI: lo responde el API por
quien llama. Apoyos usa `GET /supplier-supports/permissions` (`can_manage` abre la escritura;
`can_review` convierte `/{área}/solicitudes-apoyos` en la bandeja de revisión, y si no, son las
solicitudes propias; `can_request` deja pedir desde el maestro). El cotizador usa
`GET /quotations/permissions` y el validador `GET /order-validations/permissions`. Los maestros
generales (márgenes, edición de productos) son tablas tipadas bajo `/{área}/maestros/{maestro}`; cuáles
ve cada área se explica en **Maestros**, más abajo. En el cotizador, Comercial y BI crean cotizaciones; quien no valida ve solo
las que creó (`docs/cotizador.md`).

| Módulo de la UI | Clave del API |
| --- | --- |
| Gestor documental (toda área) | `documentos` |
| Proyectos | `proyectos` |
| Tablero general, Aplicativos | `monitoreo` |
| Datawarehouse | `datawarehouse` |
| PQRSF | `pqrsf` |
| Cotizador | `cotizador` |
| Actualización de listas | `actualizacion-listas` |
| Listas principales (bloqueado a BI) | `listas-principales`; validar ítems pide además `validacion-listas`, y cambiar el impuesto licor y generar su plano, `impuesto-licor` (los dos sin pantalla) |
| Validador de pedidos | `validador-pedidos` |
| Maestro de apoyos | `apoyos` |
| Ajuste de costos (encendido por defecto en BI) | `ajuste-costos`; `read` consulta los parámetros del costo, las reglas de sucursal por C.O. y el historial, `manage` los cambia (`GET /cost-settings/permissions`) |
| Liquidación de apoyos (bloqueado a BI) | `liquidacion-apoyos`; `read` consulta y descarga, `manage` recalcula y cierra el mes; reabrir un mes cerrado es del líder de BI o de un administrador (`GET /support-settlements/permissions`) |
| Solicitudes de apoyo (apoyo interno: pedir y revisar) | `solicitudes-apoyos` |
| Mapa comercial | `mapa-comercial`; `read` ve mapa, zonas y rutas, `manage` importa, corrige ubicaciones y edita zonas y rutas (`GET /territory/permissions`, `docs/mapa-comercial.md`) |
| Maestros (`/{área}/maestros`) | `maestros` |
| Costos · Análisis de entradas | `analisis-entradas`; `manage` (o el de `novedades-compras`) pone el motivo de una línea (`GET /costs/permissions`, `docs/costos.md`) |
| Costos · Novedades y notas crédito | `novedades-compras`; `manage` registra y quita notas crédito |
| Costos · Alzas de proveedor | `alzas-proveedor`; `read` consulta y descarga la MAESTRA y el libro, `manage` carga, digita, corrige, aprueba y rechaza |
| Costos · Acumulado de alzas | `acumulado-alzas`; las mismas vistas que Maestros > Productos de BI, `can_manage` lo responde `/commercial/price-increases` |

Si el API suma un módulo al catálogo (`app/modules/areas/domain/catalog.py`), se agrega su plantilla
a `MODULE_TEMPLATES` y sus páginas bajo `[area]/`, cada una con `requireModule`. La lista completa de
pasos, en el API y en la UI, es la skill `modulo-con-permisos` del repositorio del API
(`.claude/skills/modulo-con-permisos/SKILL.md`).

**Actualización de listas** reutiliza las pantallas del cotizador: sus páginas envuelven el listado,
el editor y las reglas en `QuotationKindProvider kind="lista"` (`src/features/quotations/lib/kind.tsx`).
Los permisos salen de `GET /quotations/permissions?kind=lista` y el listado de `?kind=lista`; dentro del
editor manda el `kind` de la cotización abierta. **Listas principales** hace lo mismo con
`kind="principal"`.

**Módulo bloqueado.** `listas-principales`, `validacion-listas`, `impuesto-licor` y `liquidacion-apoyos` tienen `locked` en el catálogo del API:
solo viven en BI. En `/ti/administracion/modulos` las demás áreas muestran «Bloqueado» en lugar del
interruptor, y el API rechaza encenderlo. Un comercial con `actualizacion-listas` nunca los recibe.

**Maestros.** El módulo `maestros` lista los maestros generales del estándar: Proveedores comerciales,
Proveedores legales, Clientes y Productos, en ese orden (`COMMERCIAL_MASTERS` en
`src/features/commercial-masters/config/masters.config.ts`, las mismas claves que `GENERAL_MASTERS` del
API). No tiene pantalla propia: su fila del menú abre los maestros del área.
- Cuáles ve cada área se elige en Módulos por área (más abajo). El API los devuelve en `masters` de
  `GET /areas` y `GET /areas/{slug}`, en orden de menú.
- `visibleModules` deja en el menú solo esos, y quita la fila si no queda ninguno.
- `[area]/maestros/[master]` responde 404 si el área no lista ese maestro (`requireGeneralMaster`).
- Un maestro general nuevo se agrega al estándar del API y a `COMMERCIAL_MASTERS`. Las áreas con
  «Todos los maestros» lo reciben de una vez.

El navegador de vistas del DWH es otra cosa: Administración → Maestros (`/ti/administracion/maestros`,
`GET /masters`). Cada vista se busca y se ve registro por registro; no hay descarga. El API las lee del
DWH en vivo, con caché por corrida:
- «Publicado por el DWH» es `last_synced_at`, la fecha en que el DWH publicó lo que se ve.
- Con `is_stale` en la página de registros, un aviso dice «Datos del {fecha}; el DWH se está
  actualizando».
- `record_count` nulo se muestra como «—»: el DWH no respondió.
- Un 503 (DWH caído y sin copia) muestra el `detail` del API con «Reintentar».
- La primera página va con `limit=50`, la que el API deja precalentada.

Los campos personales solo llegan a quien gestiona el módulo.

**Márgenes a mano.** En `/bi/maestros/productos`, quien puede cargar el archivo de márgenes también
tiene «Editar márgenes» por fila (`margin-edit-dialog.tsx`, `PUT /commercial/products/{sku}/margins`):
- Pide los cinco márgenes en porcentaje y los envía como fracción.
- Las notas son opcionales.
- El interruptor «Paga impuesto licor» abre Nacional, Costa (pesos por unidad) y el grupo impositivo
  (0503 vino, 0509 licores). Si el producto ya lo paga, arranca encendido y bloqueado.
- Se envía todo en cada guardado, y un 422 se muestra tal cual.

## 3b. Alcance comercial

Además del permiso de módulo, el cotizador filtra por cartera **los clientes que se pueden
cotizar**. El API decide el alcance de cada persona (`sales_scope` en `GET /quotations/permissions`,
o `GET /salespeople/me`) y rechaza cotizar fuera de él (403 «fuera de tu cartera»). Las cotizaciones
guardadas no dependen del alcance: cada quien ve las que creó, y quien valida, todas.

| Alcance | Quién | Qué ve la UI |
| --- | --- | --- |
| `all` | admin, owner, moderador, BI, líder o responsable de Comercial | El selector «Mis clientes / Todos los clientes» |
| `team` | supervisor vinculado | Los clientes de su equipo, sin selector |
| `mine` | vendedor vinculado | Su cartera, sin selector |
| `none` | cualquier otro, incluso miembros de Comercial sin vínculo | «Nueva cotización» explica que TI debe vincularlo |

## 4. Panel de administración (`/ti/administracion/areas`)

- **Rol líder:** cada área tiene un rol líder fijo (`is_leader`; «Líder de área» en las áreas
  nuevas, «Director BI» en BI) con todos los permisos del área. El API lo lista primero, responde
  409 si se intenta eliminar o cambiar sus permisos, y deja renombrarlo. En el panel lleva la
  etiqueta «Líder», no tiene botón de eliminar y su botón «Permisos» abre el detalle en solo
  lectura. Al agregar un miembro, el rol preseleccionado es el primero que no es líder, para que
  dar el área completa sea siempre una elección explícita.
- **Roles:** los demás roles admiten cualquier permiso. Cada uno tiene el botón «Permisos», que abre el editor
  (`src/features/admin/components/role-permissions-dialog.tsx`): «Toda el área» (sin acceso,
  lectura o gestión) y una fila por módulo del catálogo (`GET /permissions/catalog`). Se guarda
  completo con `PUT /areas/{slug}/roles/{id}/permissions`. Un rol recién creado no concede nada,
  así que el editor se abre solo al crearlo.
- **Miembros:** se asignan por correo corporativo
  (`src/features/admin/components/employee-email-field.tsx`). El campo sugiere personas del
  directorio completo (`GET /directory/admin/employees?q=`, ocultas incluidas) y acepta cualquier
  correo `@jdh.com.co` escrito a mano; si solo se escribe la parte local se completa el dominio.
  El API resuelve el correo contra `users`, que la sincronización nocturna llena con toda cuenta
  de Entra, y responde con un mensaje claro si la persona aún no está sincronizada.
- **Responsable del área:** el mismo campo.
- **Módulos por área (`/ti/administracion/modulos`):** matriz de `GET /permissions/modules`, un
  interruptor por área y módulo (`PUT /areas/{slug}/modules/{clave}`). Encender es inmediato; apagar
  pide confirmación porque saca el módulo a todos los miembros, también al líder (los permisos de los
  roles se conservan). En Maestros, el enlace bajo el interruptor elige «Todos los maestros» o una
  lista de los maestros generales (`general_masters` de la misma respuesta, con nombre y descripción).
  Se guarda en `config.masters`, en orden de menú. Un valor viejo que no sea del estándar se descarta
  al abrir el diálogo, porque el API responde 422 a cualquier otro. Cada cambio invalida `["areas"]`,
  el catálogo de permisos y los maestros.
  En el teléfono se elige un área y se ven sus módulos en lista. Un moderador vería la matriz sin
  interruptores, pero hoy `AdminGate` solo deja entrar a owner y admin.
- **Maestros (`/ti/administracion/maestros`):** el bloque «Sincronización con el DWH» (`GET /jobs`;
  las tareas de maestros ahora calientan la caché del API, no copian) muestra cada tarea con su
  última ejecución, la próxima actualización del DWH (`next_expected_at`) y
  el historial (`GET /jobs/runs`). «Sincronizar ahora» (`POST /jobs/{clave}/run`) es solo de admin y
  no está disponible con `JOBS_ENABLED` apagado o con una corrida abierta; mientras una corre, el
  bloque se refresca cada 5 segundos. Debajo, todos los maestros con sus registros.
- **Vendedores (`/ti/administracion/vendedores`):** quién es cada vendedor y supervisor de SIESA
  (`/salespeople`, `src/features/salespeople`). Pestañas Vendedores y Supervisores, búsqueda por
  código o nombre y el filtro «Sin vincular» (por defecto). Por fila: «Vincular» o «Cambiar» a un
  correo corporativo (mismo campo con sugerencias del directorio) y «Desvincular». El vínculo
  manual gana sobre el del correo; desvincular deja el código `excluded` y «Vincular por correo»
  (`POST /salespeople/sync`) no lo devuelve. Los supervisores siempre se vinculan a mano: en SIESA
  no tienen correo. «Consultar una persona» muestra los códigos de un correo.
- **Cuándo se nota un cambio:** el API aplica permisos y membresías en la siguiente petición. En la
  UI, `["areas"]` vive un minuto en caché y se refresca al volver a la pestaña; cada cambio hecho
  desde el panel la invalida en el acto para quien lo hizo. Quien recibe el cambio lo ve en su menú
  al volver a la pestaña o al minuto.

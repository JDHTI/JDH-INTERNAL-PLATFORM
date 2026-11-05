# Acceso al espacio de trabajo

Quién entra a qué lo decide la API (`internal-platform-api`, `docs/permissions.md`). Esta UI lo
respeta en tres capas y nunca inventa un permiso que el API no haya dado.

## 1. Entrada: `/workspace`

«Mi espacio de trabajo», en el menú de la cuenta de la vista general, abre `/workspace`
(`src/features/areas/components/workspace-hub.tsx`): una tarjeta por área que `GET /areas`
devuelve, ya filtradas por el API. Se muestra siempre, aunque la persona tenga una sola área.
Sin áreas, la pantalla dice a quién pedir acceso. El slug de cada área (`/bi`) sigue siendo el
segmento de la URL, pero no se muestra en ningún panel: el admin escribe el nombre y la UI
deriva el slug (`src/features/admin/lib/area-slug.ts`).

## 2. Guardias

| Dónde | Qué comprueba | Resultado |
| --- | --- | --- |
| `src/app/(app)/(workspace)/layout.tsx` (servidor) | `requireUser()` | Sin sesión: `/login` |
| `src/app/(app)/(workspace)/[area]/layout.tsx` (servidor) | `GET /areas/{slug}` con las cookies de la persona | 401: `/login`. 403: `/workspace?sin-acceso=area`. 404: página no encontrada. Otro error: lo muestra `AreaGate` con reintento |
| `src/features/areas/components/area-gate.tsx` (cliente) | El módulo al que pertenece la ruta (`activeModuleId`) contra `my_modules` del área | Sin permiso: `/{area}?sin-acceso=modulo` |
| `AdminGate` | Rol global `owner` o `admin` | Pantalla «sin permisos» |

El layout de `[area]` no ve la ruta completa y no vuelve a correr al navegar entre módulos de la
misma área, por eso el chequeo por módulo vive en `AreaGate`, que sí sigue el `pathname`.

## 3. Módulos por rol

`GET /areas` trae `my_modules` por área: `{ clave: "read" | "manage" }`. Los administradores reciben
todo como `manage`; los moderadores todo como `read`; el responsable del área todo como `manage`
en la suya; el resto, lo que concede su rol de área (`area_role_permissions`, comodín `*`).

Cada `ModuleItem` de `src/shared/config/areas.config.ts` lleva `permission`, la clave del API. El
menú lateral, el resumen del área y el hub usan `visibleModules(area, isAdmin)`: un módulo cuya
clave no está en `my_modules` no aparece. Un módulo sin clave (`Solicitudes de soporte`, los
`Próximamente`) se muestra a todo miembro del área. La administración sigue por rol global.

| Módulo de la UI | Clave del API |
| --- | --- |
| Gestor documental (toda área) | `documentos` |
| Proyectos | `proyectos` |
| Tablero general, Aplicativos | `monitoreo` |
| Datawarehouse | `datawarehouse` |
| PQRSF | `pqrsf` |
| Cotizador, Validar cotizaciones | `cotizador` |
| Validador de pedidos | `validador-pedidos` |
| Maestro de apoyos | `apoyos` |
| Mis solicitudes JDH, Solicitudes de apoyo JDH | `solicitudes-apoyos` |
| Casos especiales | `casos-especiales` |
| Maestros generales | `maestros` |

Si el API suma un módulo al catálogo (`app/modules/areas/domain/catalog.py`), el `ModuleItem`
correspondiente recibe su clave aquí; sin ella el módulo quedaría abierto a todo miembro y sus
datos fallarían con 403.

## 3b. Alcance comercial

Además del permiso de módulo, el cotizador filtra por cartera. El API decide el alcance de cada
persona (`sales_scope` en `GET /quotations/permissions`, o `GET /salespeople/me`) y bloquea lecturas
y escrituras fuera de él (403 «fuera de tu cartera»):

| Alcance | Quién | Qué ve la UI |
| --- | --- | --- |
| `all` | admin, owner, moderador, BI, líder o responsable de Comercial | El selector «Mis clientes / Todos los clientes» |
| `team` | supervisor vinculado | Los clientes de su equipo, sin selector; «De mi equipo» en el listado |
| `mine` | vendedor vinculado | Su cartera, sin selector; «De mi cartera» en el listado |
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

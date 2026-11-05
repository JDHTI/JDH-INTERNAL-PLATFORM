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

## 4. Panel de administración (`/ti/administracion/areas`)

- **Roles:** cada rol tiene el botón «Permisos», que abre el editor
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

# La intranet como vista general

La vista general de la plataforma es la intranet (INTRANET-JDH-UI) tal como estaba: mismo shell,
mismas pantallas, mismo diseño. El espacio de trabajo por áreas no cambia. Decisión del
2026-11-04; reemplaza la vista general mínima de la fase 2.

## Qué se portó y qué no

| De la intranet | En la plataforma |
| --- | --- |
| Shell (barra de anuncio, header negro, menú principal, "Explorar todo", footer, navegación inferior en móvil) | `src/app/(app)/(general)/layout.tsx` |
| Inicio, noticias, directorio (perfil y cumpleaños), organigrama, catálogo, autogestión, inducción, ayuda, marca, perfil, notificaciones | Mismas rutas bajo `(general)` |
| Documentos y políticas | **SIG** (`/sig`, 2026-11-27): portada, tres módulos (`/sig/cultura`, `/sig/gestion`, `/sig/sst-cumplimiento`), páginas de lectura y la tabla de antes como `/sig/control-documental`. `/documentos` redirige ahí. Contrato con Strapi en `docs/intranet-strapi-handoff.md` |
| Completar perfil (sede y contacto) | `src/app/(app)/(onboarding)/completar-perfil` |
| Inicio de sesión | `src/app/login`, con el diseño de la intranet |
| Eventos, vacaciones, certificados, solicitudes | **No**: se gestionan en otro portal |
| `/admin` | **No**: la administración vive en el área TI (`/ti/administracion/*`) |

El código vive en `src/intranet/` (componentes, módulos, configuración) con su propia estructura;
las rutas en `src/app`. El menú del usuario suma **Mi espacio de trabajo**, que abre `/workspace`,
la guía del espacio de trabajo; las áreas se eligen en la barra lateral (`docs/workspace-access.md`).

## Cómo conviven los dos diseños

`src/intranet/styles/intranet.css` define los tokens de la intranet bajo
`:root:has(.intranet-shell)`. El layout de la vista general, el de completar perfil y el del login
pintan ese contenedor; el espacio de trabajo no, así que conserva los suyos. Va sobre `:root` y no
sobre el contenedor para que los portales de Radix (menús, diálogos), que se montan en `<body>`,
también los reciban. El tema (claro, oscuro, sistema) es uno solo para los dos frentes
(`useUiStore`), igual que la caché de React Query.

## Sesión y datos

- La sesión es la del API (Entra SSO, cookies `internal_platform_*` con `path=/`). Las páginas se
  renderizan en el servidor reenviando las cookies del navegador (`src/intranet/lib/api/backend-fetch.ts`).
- `src/proxy.ts` renueva el token de acceso cuando vence (dura una hora) y manda cada sesión nueva a
  `/completar-perfil/verificar`.
- Directorio, cumpleaños, nuevos integrantes y fotos: `/directory` del API.
- Noticias, documentos del SIG, contenido semanal, frases y quinquenios: Strapi, leído desde el servidor de
  la UI como lo hacía la intranet (`src/intranet/lib/strapi`), con caché e invalidación por el
  webhook `POST /api/revalidate`.

## Lo que falta en el API

Hasta que existan, la UI no falla: el chequeo de perfil deja pasar, las páginas de contacto,
horarios y notificaciones dicen que están en preparación, y la campana no aparece.

| Endpoint | Para qué | Contrato (el de la intranet) |
| --- | --- | --- |
| `GET /directory/employees/me/onboarding` | Qué le falta a la persona | `{ pendientes: ("sede"\|"contacto")[], siteId, mobilePhone, landlinePhone, showInDirectory, sedes: {id, nombre}[] }` |
| `POST /directory/employees/me/onboarding` | Guardar sede y contacto | `{ siteId?, mobilePhone?, landlinePhone?, showInDirectory? }` |
| `GET` / `PUT /directory/employees/me/contact-schedule` | Horario de contacto propio | `{ franjas: { dia, inicio, fin }[] }` |
| `GET /directory/employees/{id}/contact-schedule` | Horario en el perfil público | Igual |
| Notificaciones (`/notifications`, leídas, push) | Campana y `/notificaciones` | Ver `src/intranet/modules/notificaciones/server/queries.ts`; se encienden con `enabled` en su manifiesto |
| `GET /directory/employees/birthdays` sin `month` | El año completo en una llamada | Hoy son 12 llamadas, de a 3 |

Dos cosas más del lado del API:

- **Límite por IP.** Las llamadas salen del contenedor de la UI. La UI reenvía `X-Forwarded-For`;
  el API debe confiar en él solo desde la red interna (por ejemplo `uvicorn --proxy-headers
  --forwarded-allow-ips` con la subred de Docker), o toda la empresa compartirá un solo cupo.
- **Strapi.** `quinquenios` no existe en el CMS de producción (404); el carrusel se oculta solo.

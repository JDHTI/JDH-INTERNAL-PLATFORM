# Centralización de la intranet: interfaz general y espacio de trabajo

Fecha: 2026-11-04. Estado: **decidido; fase 2 construida** (sección 6). Lado UI del plan que
la API documenta en `internal-platform-api/docs/intranet-centralization.md` (sección 0,
re-evaluación) y `docs/directory.md`. El contrato de Strapi que consume hoy la intranet está en
[`intranet-strapi-handoff.md`](intranet-strapi-handoff.md).

**Regla de la plataforma:** hay dos frentes y nada fuera de ellos. La **vista general**, para toda
persona autenticada, y el **espacio de trabajo**, un área a la vez. La administración de la
plataforma es un módulo del área TI (`/ti/administracion/*`), no una tercera sección.

## 0. Punto de partida

| Hecho | Fuente |
| --- | --- |
| La API ya tiene el módulo `directory` (empleados, sedes, cumpleaños, nuevos ingresos, fotos, sincronización nocturna con Entra, importación desde la intranet). PR #38 abierto, CI en verde, contrato definitivo para la fase 2 | `docs/directory.md`, respuesta de la sesión API |
| La API ya rechaza áreas con slug `administracion, configuracion, directorio, documentos, eventos, inicio, login, noticias, perfil, pqrsf, sugerencias` | `RESERVED_SLUGS`, commit `c1b6c44` |
| Los módulos productivos se quedan en la raíz (`/calidad/pqrsf`, `/comercial/cotizador`). No hay prefijo `/workspaces` | plan API §0 "Rutas y shell" |
| **Strapi se mantiene** y lo consume únicamente el frente gráfico de la plataforma: noticias, comunicados, eventos, documentos corporativos, contenido semanal, frase motivacional y quinquenios. Su panel sigue siendo el editor | confirmación del usuario |
| La UI sigue sin BFF: React Query en el navegador con la cookie de la API | plan API §0, `api-client.ts` |
| No se porta la UI de la intranet (Radix/shadcn, Better Auth, Lenis). Se reutilizan el contrato y las reglas, no el código | plan API §0, informe de intranet-ui |

Lo que sí se trae de la intranet: las reglas de cada pantalla (filtros de noticias, calendario de
eventos, tabla de documentos, perfil, cumpleaños), los mappers y tipos de Strapi, los activos
(`public/`, ya compartidos), el organigrama estático y el manual de marca si Mercadeo lo pide.

Lo que no se migra (coincide con el plan de la API): certificados, vacaciones, solicitudes,
`ayuda`, las cuatro pantallas `/admin/*` vacías, el catálogo de componentes de la intranet, la
búsqueda global (no funciona), Better Auth, Web Push mientras esté apagado.

## 1. La pregunta: una interfaz general y un espacio de trabajo

La plataforma hoy es solo espacio de trabajo: `/` redirige a la primera área y una persona sin
áreas ve una pantalla vacía. La intranet es lo contrario: un portal para toda la empresa, con
scroll de documento, header horizontal y una home editorial. Centralizar significa que una misma
aplicación haga las dos cosas. Hay tres formas de lograrlo.

### A. Un solo shell: la barra lateral con un bloque "General"

Todo vive dentro del shell actual. La barra lateral gana un bloque **General** (Inicio, Noticias,
Eventos, Documentos, Directorio, Perfil) encima del selector de área, que pasa a llamarse
**Espacio de trabajo** y solo aparece si la persona tiene áreas. `/` muestra la home dentro del
área de contenido con scroll interno.

- A favor: un solo layout, cero trabajo de shell, coherente con `DESIGN.md` §5.3 tal como está.
- En contra: la home y las noticias quedan dentro de una ventana de 24 px de padding con scroll
  propio, junto a una barra oscura de 260 px. Se lee como un módulo más, no como un portal. El
  hero, las imágenes de portada y la lectura larga de un comunicado pelean con la densidad del
  workspace. Una persona sin áreas sigue viendo una barra lateral casi vacía.

### B. Una aplicación, dos shells (recomendada)

La misma app Next, la misma sesión, los mismos tokens y componentes, pero **dos layouts** con
route groups:

```
src/app/
  layout.tsx                       ← raíz: lang, fuente, script de tema
  (app)/layout.tsx                 ← providers de todo lo que exige sesión
    (general)/                     ← vista general: header horizontal, scroll de documento
      page.tsx                     ← /  inicio
      directorio/, directorio/[id] ← fase 2 (hecha)
      configuracion/, sugerencias/ ← movidas desde la raíz de (app)
      noticias/, eventos/, documentos/  ← fase 4
      perfil/                      ← fase 5
    (workspace)/                   ← espacio de trabajo: sidebar + header + scroll interno
      [area]/...
      [area]/administracion/{areas,usuarios,directorio,sedes,maestros}  ← solo en TI
  (public)/pqrsf                   ← no cambia
  login                            ← no cambia
```

Los dos shells cuelgan de `(app)/layout.tsx`, que tiene React Query, el tema y los toasts: pasar
de la vista general al espacio de trabajo **conserva la caché** y no recarga la página.
`/administracion/*` redirige con 308 a `/ti/administracion/*` desde `next.config.ts`.

Navegación entre los dos mundos:

- **Header del portal:** marca a la izquierda; Inicio y Directorio (Noticias, Eventos y
  Documentos entran en la fase 4); a la derecha el botón **Espacio de trabajo** (visible solo si
  `GET /areas` trae algo; lleva a la última área visitada, guardada en `localStorage`, o a la
  primera) y el menú de la persona (Configuración, Sugerencias, Panel administrador si aplica,
  tema, Cerrar sesión). Sin mega menú ni barra de anuncio.
- **Sidebar del workspace:** una fila fija **Vista general** en el pie. La marca del breadcrumb
  también enlaza a `/`. El panel administrador es un módulo más de TI, con sus cinco secciones
  como páginas, y solo aparece para administradores.
- **Header del workspace:** no cambia.
- Una persona sin áreas vive en el portal y nunca ve el shell del workspace. El estado "Sin áreas
  asignadas" deja de ser la primera pantalla de nadie.

Lo que comparten los dos shells: `globals.css` y sus tokens, `shared/components/ui`,
`api-client.ts`, `useSession`, `QueryProvider`, `ThemeSync`, el `Toaster`, las cuatro
estados obligatorios (§8 de `DESIGN.md`), tema claro y oscuro.

Lo que cambia en `DESIGN.md`: una sección nueva **§5.4 Shell del portal** (header de 64 px sobre
`--sidebar`, contenedor de 1 200 px, scroll de documento, footer) y la aclaración de que §5.3
describe el workspace. Los diales siguen siendo **MOTION 1** en los dos: el portal puede ser
editorial por tipografía, imagen y espacio, no por animación. Nada de Lenis, `WordReveal` ni
transiciones de página. Esto es una decisión de producto (sección 6, punto 4).

- A favor: el portal se ve como portal y el workspace no se toca; una sola sesión, un solo
  despliegue, un solo kit; el costo del segundo shell es un header, un footer y un layout (unos
  3 días); encaja con los slugs ya reservados en la API.
- En contra: dos layouts que mantener. `configuracion` y `sugerencias` pasaron a la vista
  general, porque son de la persona y no de un área.

### C. Dos aplicaciones bajo un dominio (puente)

Mantener INTRANET-JDH-UI tal cual detrás del mismo proxy (`/intranet` con `basePath` o
subdominio), enlazada desde la barra lateral. Es el camino B del documento de la API: 3 a 5 días,
un solo punto de entrada, pero dos logins con Entra, dos kits y dos shells para siempre. Sirve
solo como puente si la fase 4 se demora; no cumple el objetivo de un único aplicativo.

### Comparación

| Criterio | A. Un shell | B. Dos shells | C. Dos apps |
| --- | --- | --- | --- |
| Un solo login y sesión | Sí | Sí | No (dos Entra) |
| Un solo código y kit | Sí | Sí | No |
| Portal con lectura cómoda (home, comunicados, imágenes) | Limitado | Sí | Sí (el actual) |
| Toca el workspace actual | Sí (sidebar) | No | No |
| Persona sin áreas | Sidebar vacía | Portal completo | Portal completo |
| Costo del shell | 1 día | ~3 días | 3 a 5 días de proxy |
| Permite apagar INTRANET-JDH-UI | Sí | Sí | No |

**Recomendación: B.**

## 2. Cómo llega el contenido de Strapi a la UI

La intranet lee Strapi desde Server Components con un token de servidor. La plataforma no tiene
lecturas en servidor: todo es React Query con cookie. Dos opciones:

| | P. Proxy en la API (`/content/*`) | S. Server Components en Next |
| --- | --- | --- |
| Quién habla con Strapi | La API FastAPI, por la red interna, con token de solo lectura | El servidor Next, con token |
| Patrón en la UI | El mismo de todos los módulos: servicio + React Query + cookie | Patrón nuevo en el repo (`server-only`, `fetch` con tags, `revalidateTag`) |
| Strapi expuesto | No; queda privado | No, pero Next necesita red y CA hacia Strapi |
| Caché | Redis de la plataforma, TTL corto (60 s) e invalidación por webhook | Caché de `fetch` de Next, invalidación por webhook `/api/revalidate` |
| Contrato | `snake_case`, errores `{detail}`, paginación `{items,total,page,size}` como el resto | El JSON de Strapi tal cual, con mappers en la UI |
| Medios | Por el proxy inverso, mismo origen (`/cms/uploads/*`), como hoy | Igual |

**Recomendación: P.** La sesión de la API está de acuerdo y propone lo mismo (Redis, reescritura
de URL de medios). Las pantallas se diseñan contra un servicio propio (`features/content`), así
que cambiar la fuente no toca componentes.

Contrato que la UI necesita de `/content/*` (para acordar con la API en la fase 4):

| Método | Ruta | Parámetros | Devuelve |
| --- | --- | --- | --- |
| GET | `/content/news` | `type` (`noticia`, `comunicado`), `category`, `area`, `zone`, `tag`, `q`, `pinned`, `page`, `size` | `{items, total, page, size}`; cada item: `slug, title, excerpt, type, published_at, reading_time_min, mandatory, pinned, category, area, zone, tags, cover_image {url, alt, width, height}` |
| GET | `/content/news/{slug}` | ninguno | El item más `body` (bloques de Strapi tal cual; la UI los renderiza) |
| GET | `/content/events` | `month` (`YYYY-MM`) | `{month, items}`: `slug, title, start_date, start_time, location_name, address, requires_rsvp` |
| GET | `/content/documents` | `category`, `area`, `q`, `featured`, `page`, `size` | `{items,...}`: `id, title, slug, description, category, area, revision_date, featured, file {name, size, mime}` |
| GET | `/content/documents/{id}/download` | ninguno | El archivo (o 302 al proxy inverso) |
| GET | `/content/home` | ninguno | `{weekly_content, quote, anniversaries}` para los bloques de la home |
| GET | `/content/taxonomies` | ninguno | `{categories, areas, zones, tags, document_categories}` para los filtros |
| POST | `/content/revalidate` | header `x-webhook-secret`, cuerpo del webhook de Strapi | 204; invalida las llaves de Redis del content type afectado |

Ajustes que salen del [handoff](intranet-strapi-handoff.md) y que la API debe tener en cuenta:

- `quinquenio` **no está commiteado** en `INTRANET-JDH-CMS` master, solo en un working tree local.
  Hay que confirmar qué imagen corre en producción y commitear ese tipo antes de mover el CMS.
- Solo seis colecciones se consultan directamente (`noticias`, `eventos`, `documentos`,
  `contenidos-semanales`, `frases-motivacionales`, `quinquenios`). Las taxonomías llegan pobladas
  y las zonas del filtro de noticias están copiadas a mano en la UI de la intranet.
- Strapi corre con `strictParams: true` y `maxLimit: 100`; el rol Public lee sin token.
- `file.size` de un documento viene en **KB**.
- La intranet solo pinta cuatro tipos de bloque y aplana negritas y enlaces. La plataforma puede
  pintar los bloques completos de Strapi 5.
- El webhook de revalidación queda guardado en la base `intranet_cms` con la URL vieja: al mover
  el CMS hay que apuntarlo a `POST /content/revalidate`.

Los medios no pasan por FastAPI: el proxy inverso sirve `/cms/uploads/*` desde Strapi en el
mismo origen de la plataforma, como hoy hace Caddy en la intranet. La API devuelve las URL ya
reescritas a ese prefijo.

Lo que se pierde al apagar el API NestJS: la **ingesta de notificaciones** que Strapi dispara al
publicar (`src/notificaciones/publish-hook.ts` → `POST /notificaciones/ingesta` con
`x-jdh-ingest-secret`). Strapi es el autor; el motor (leído/no leído, audiencia por sede o área,
programadas, recordatorios) vive en NestJS. Si se quiere conservar, la plataforma necesita ese
endpoint y un módulo de notificaciones in-app en la fase 5; mientras tanto el hook queda apagado
(sin `NOTIFICATIONS_API_URL` no envía y lo avisa en el log).

## 3. Plan de la UI por fases

Sigue la numeración del plan de la API.

### Fase 2: vista general y directorio (hecha; depende del PR #38 de la API)

| Entrega | Qué | Dónde |
| --- | --- | --- |
| Shell de la vista general | Header, footer, menú de cuenta, botón Espacio de trabajo, fila Vista general en el sidebar, §5.4 de `DESIGN.md` | `shared/components/layout/portal/` |
| Inicio v1 | Saludo, accesos, cumpleaños del mes con navegación de mes, nuevos ingresos. Los bloques de Strapi llegan en la fase 4 | `features/home/` |
| `/directorio` | Listado paginado, búsqueda (`q`) y sede en la URL, foto de 96 px por versión, iniciales sin foto | `features/directory/` |
| `/directorio/[id]` | Perfil: foto de 432 px, cargo (`position`, si no `job_title`), sede, jefe enlazado, ingreso, cumpleaños sin año, compañeros de departamento; 404 propio | `features/directory/` |
| Avatar de la sesión | Foto del directorio; respaldo `/auth/me/photo` cuando `/me` responde 404 | `SessionAvatar` |
| `/ti/administracion/directorio` | Estado e historial de la sincronización, sincronizar ahora, listado con ocultas e inactivas, edición (cargo, sede, nacimiento, visibilidad, jefe de equipo), alta y baja de personas sin Entra | `features/directory/components/admin/` |
| `/ti/administracion/sedes` | Alta, edición y baja de sedes; la baja explica el 409 | idem |
| Despliegue | `Dockerfile`, `compose*.yaml`, `output: "standalone"`, `/api/health`, CI | raíz |

Reglas del contrato que la UI respeta: errores `{detail}`; 401 → `SessionRequired`; 404 de
empleado no público; límite `read` de 600 peticiones por minuto por IP compartido por la oficina,
por eso toda foto se pide con `v`; `<img>` hacia la API solo lleva cookie si UI y API comparten
sitio (`SameSite=lax`), lo que fija la sección 4.

### Fase 4: noticias, eventos y documentos (depende de `/content/*` y de la reubicación de Strapi)

| Entrega | Días |
| --- | --- |
| `features/content`: servicio, tipos, hooks, renderer de bloques de Strapi (párrafo, encabezado, lista, cita, código, imagen, enlace, negrita/cursiva/subrayado) | 3 |
| `/noticias` con filtros por URL, paginación, comunicados fijados; `/noticias/[slug]` | 4 |
| `/eventos` calendario mensual (sin RSVP: no persiste hoy) | 3 |
| `/documentos` corporativos: tabla, filtros, destacados, descarga (distinto del gestor documental por área en `/[area]/documentos`) | 2,5 |
| Home v2: comunicado destacado, contenido semanal, frase, quinquenios, próximos eventos | 3 |
| **Total** | **≈ 15,5** (más 5 a 7 del proxy en la API) |

### Fase 5: perfil, onboarding y notificaciones (depende de la API)

`/perfil` (contacto, horarios, sede), `/completar-perfil` como gate por sesión sin `proxy.ts`
(un flag en `/directory/employees/me`), campana de notificaciones in-app. Se estima cuando la
API defina el contrato: 10 a 12 días de UI.

### Fase 6: corte

Mapa 301 en el proxy inverso (`/noticias/x` → igual; `/admin/directorio` →
`/ti/administracion/directorio`; `/admin/sedes` → `/ti/administracion/sedes`; `/sign-in` →
`/login`), alias DNS `intranet.jdh.local` durante un
trimestre, apagado de `ui`, `ui-auth-migrate`, `api`, `api-migrate`, `redis` y `storage` de la
intranet.

## 4. Despliegue y migraciones

### Lo que ya existe

| Pieza | Estado |
| --- | --- |
| API: `Dockerfile`, `compose.yaml` (postgres 16, redis, clamav, minio, migrate, api), CI de calidad | En el repo; sin CD |
| API: migraciones `0039_merge_heads` y `0040_directory`; variables `DIRECTORY_GRAPH_*`, `DIRECTORY_SYNC_*` ya en `compose.yaml` | PR #38 |
| UI: `Dockerfile` standalone, `.dockerignore`, `compose.yaml`, `compose.dev.yaml`, `/api/health` | En este repo desde esta rama |
| UI: CI | `.github/workflows/ci.yml`: lint, tipos, build e imagen sin publicar |
| Intranet: `deploy/compose.prod.yaml` (caddy, ui, api, cms, postgres 17, redis, storage), Caddyfile con CA interna `*.jdh.local` repartida por GPO, `deploy.sh` con respaldo y `flock`, runner self-hosted `intranet-jdh` | En producción en `192.168.100.217` |
| Dónde corre la plataforma (B3) | Sin decidir |

### Propuesta de infraestructura

**Desplegar la plataforma en el servidor de la intranet y hacer que ese servidor sea el de la
plataforma.** La máquina no se apaga mientras Strapi exista; ya tiene Docker, Caddy, la CA que los
equipos confían por GPO, la zona DNS `*.jdh.local` y el runner. Pedir una máquina nueva reabre la
conversación con Infraestructura que B3 tiene bloqueada; reutilizar esta no.

```
https://plataforma.jdh.local        → caddy → /api/*          → api:8000   (FastAPI)
                                             /cms/uploads/*   → cms:1337   (medios, mismo origen)
                                             /*               → ui:3000    (Next standalone)
https://cms-intranet.jdh.local      → caddy → cms:1337        (panel de Strapi; mismo host que hoy)
https://intranet.jdh.local          → caddy → 301 al portal   (fase 6; hasta entonces, la UI vieja)
```

Consecuencias:

- UI y API en el **mismo origen**: la cookie `SameSite=lax` viaja en `<img>` y en `fetch`, no hay
  CORS, `NEXT_PUBLIC_API_URL=https://plataforma.jdh.local/api/v1`, `ENTRA_REDIRECT_URI` y
  `AUTH_FRONTEND_REDIRECT_URI` apuntan al nuevo host, `AUTH_COOKIE_SECURE=true`.
- Strapi conserva `PUBLIC_URL=https://cms-intranet.jdh.local`: **no cambia nada en su
  configuración**, solo el `compose` que lo levanta. Los editores siguen entrando por la misma URL.
- Una sola instancia de Postgres **17** para las dos bases (`internal_platform` e `intranet_cms`).
  El `compose.yaml` de la plataforma hoy usa 16: subirlo a 17 antes de mover datos; un volcado de
  17 no se restaura limpio en 16.
- Redis, MinIO/RustFS y ClamAV: los de la plataforma. Los de la intranet se apagan en la fase 6.
- Un solo runner self-hosted; `deploy.sh` de la plataforma con el mismo patrón (respaldo,
  `flock`, `up -d --build`, verificación de `/health/ready`).

Si Infraestructura prefiere otra máquina o Azure, lo único que cambia es el host; el resto de
esta sección se mantiene. Lo que **no** conviene es un dominio fuera de `*.jdh.local`: obligaría a
una CA nueva y otra GPO.

### Migraciones de datos, en orden

1. **API:** `alembic upgrade head` (0039 + 0040). Configurar `DIRECTORY_GRAPH_*` con el registro
   de la intranet (`User.Read.All`), `DIRECTORY_SYNC_ENABLED=false` hasta terminar.
2. **Primera sincronización:** `scripts/sync-directory.py` (486 miembros, ~60 s en la prueba).
3. **Importación desde la intranet:** `scripts/import-intranet-directory.py "<dsn intranet_jdh>"`
   primero en seco, luego `--apply`: sedes, cargo SIESA, fecha de nacimiento, sede por persona,
   `is_manager`, personas sin Entra. Ocultar buzones compartidos (`INFO`, `PQRSF`).
   Encender `DIRECTORY_SYNC_ENABLED`.
4. **Strapi (fase 4):** `pg_dump intranet_cms` → restaurar en el Postgres de la plataforma con
   su rol propio (`deploy/postgres/init/10-cms-database.sh` de la intranet sirve de molde);
   copiar el volumen `cms_uploads` (`docker cp` o `tar` entre hosts); levantar `cms` en el compose
   de la plataforma con las mismas variables (`APP_KEYS`, `*_SALT`, `JWT_SECRET`,
   `ENCRYPTION_KEY`, base). Crear en Strapi un token de **solo lectura** para la API y apuntar el
   webhook de publicación a `POST /content/revalidate`. Quitar `NOTIFICATIONS_API_URL` hasta la
   fase 5.
5. **DNS y Entra:** registro `plataforma.jdh.local`; redirect URI del registro
   `JDH-INTERNAL-PLATFORM`; `cms-intranet.jdh.local` apunta al mismo host (o no cambia si es la
   misma máquina).
6. **Fase 6:** 301, alias, apagado. Las suscripciones Web Push, si las hubiera, se pierden con el
   cambio de origen; no aplica mientras Push esté apagado.

### Lo que la UI entrega en este repo

- `Dockerfile` multietapa (`dev`, `builder`, `runner` standalone con usuario sin privilegios y
  healthcheck a `/api/health`), `.dockerignore`, `compose.yaml` y `compose.dev.yaml`.
- `.github/workflows/ci.yml`: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm exec tsc
  --noEmit`, `pnpm build` y la imagen sin publicar. El job de despliegue en el runner
  self-hosted se agrega cuando exista el stack de producción.
- Variable única: `NEXT_PUBLIC_API_URL`, incrustada al compilar. En producción,
  `https://plataforma.jdh.local/api/v1`. Nada de Strapi: con la opción P la UI no conoce al CMS.

## 5. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Cookie de la API no viaja a `<img>` si UI y API están en sitios distintos | Mismo origen detrás del proxy (sección 4) |
| Límite de 600 peticiones por minuto por IP compartido por una oficina | Fotos siempre con `v`; listados con `staleTime` de 60 s; sin polling en el portal |
| `/directory/employees/me` responde 404 antes de la primera sincronización y al usuario de desarrollo | Respaldo con `/users/me` y `/auth/me/photo`; nunca bloquear el portal por ese 404 |
| Postgres 16 en la plataforma frente a 17 en la intranet | Subir la plataforma a 17 antes de mover `intranet_cms` |
| La home editorial pierde su carácter dentro de MOTION 1 | Decisión explícita de producto (sección 6); el portal gana por tipografía e imagen |
| Dos pantallas de "documentos" (Strapi corporativos y gestor por área) | Nombres distintos en la navegación: "Documentos y políticas" en el portal, "Gestor documental" en el área |
| Enlaces viejos en correos y chats | 301 en Caddy y alias DNS un trimestre |

## 6. Decisiones que faltan

| # | Decisión | Estado |
| --- | --- | --- |
| 1 | Forma de la interfaz: A, B o C (sección 1) | **Decidida: B**, dos shells en una app |
| 2 | Dónde vive la administración | **Decidida:** módulo de TI, `/ti/administracion/*`; nada fuera de los dos frentes |
| 3 | Strapi por proxy en la API (P) o Server Components (S) (sección 2) | **Decidida: P.** Strapi se mantiene y solo lo consume el frente gráfico, a través de la API |
| 4 | Alcance inmediato | **Decidido:** fase 2 y archivos de despliegue de la UI |
| 5 | Host y dominio: el servidor de la intranet como servidor de la plataforma, `plataforma.jdh.local` | Pendiente (TI e Infraestructura). Recomendación: sí |
| 6 | Cuánto de la home editorial se conserva | Pendiente (producto). Recomendación: tipografía, imagen y espacio; sin Lenis, transiciones ni carruseles automáticos |
| 7 | Ingesta de notificaciones desde Strapi | Pendiente. Recomendación: apagada hasta la fase 5 |

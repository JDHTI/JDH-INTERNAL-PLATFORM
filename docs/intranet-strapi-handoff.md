# Handoff: Strapi (CMS de la intranet) → plataforma

Escrito el 2026-11-04 por la sesión que trabaja sobre INTRANET-JDH-UI, para la fase 4 de
[`intranet-centralization.md`](intranet-centralization.md). Solo hechos del código. Sin
cambios de código ni ramas.

**Base de lectura:** `INTRANET-JDH-UI` en `origin/master` (88b2796), `INTRANET-JDH-CMS` en `origin/master` (dfe5334), `INTRANET-JDH-API/deploy` en `origin/master`. Corrección a mi informe anterior: la rama que tenía abierta estaba **atrasada** respecto a `master` (no adelantada); esta vez leí `origin/master`.

## Hallazgos que cambian el plan (leer primero)

1. **`quinquenio` no está en el repo del CMS en `master`.** El UI lo consume (`/quinquenios`), pero el content type solo existe como cambios **sin commitear** en el working tree local de `INTRANET-JDH-CMS` (`src/api/quinquenio/`, `scripts/seed-quinquenios.js`, `package.json`, `types/generated/*`). Si producción corre desde `master`, ese tipo no existe allí y el carrusel de quinquenios llega vacío (el UI degrada a vacío). Hay que confirmar qué imagen corre en `192.168.100.217` y commitear ese tipo antes de replicar el CMS.
2. **`sede`, `zona`, `tag`, `categoria`, `area`, `categoria-documento` no se consultan como colecciones desde el UI.** Solo llegan **pobladas como relaciones** dentro de noticia/documento. El UI nunca llama `GET /api/zonas`, `/api/sedes`, etc. Las zonas del filtro de noticias están **duplicadas a mano** en `noticias.config.ts` (`ZONAS`), no se leen del CMS. `sede` no la usa el UI; solo existe para segmentar notificaciones (ver §5).
3. **Strapi corre con `strictParams: true`** (`config/api.ts`, REST y Document Service): un parámetro de query que no esté permitido da error en vez de ignorarse. `maxLimit: 100`, `defaultLimit: 25`.
4. **El UI lee Strapi sin token** (rol Public). `STRAPI_API_TOKEN` es opcional y hoy no se usa en producción (el compose no lo pasa). El CMS concede los permisos públicos por código en cada arranque (`production-access.ts`).
5. **El tamaño de los datos no se puede saber desde el código.** Ni la base `intranet_cms` ni el volumen `cms_uploads` tienen cifra en repos o documentos. Ver §4.4 para cómo medirlo.

---

## 1. Contrato Strapi que consume la UI

### 1.1 Cliente y serialización

- Base: `${STRAPI_URL}/api` (`STRAPI_API_BASE`). Método único: `GET`. Cabecera `Authorization: Bearer <token>` solo si existe `STRAPI_API_TOKEN`.
- Caché de Next por petición: `next: { revalidate: 60, tags: [...] }`. El tag de cada colección está en la tabla de §3. Todo es `server-only`; el navegador nunca llama a Strapi (salvo media y descarga, §1.4).
- Serialización (`lib/strapi/query.ts`, sin librería `qs`): orden fijo `filters`, `pagination`, `fields`, `populate`, `sort`. Los corchetes de las claves van literales; solo se codifican los valores. `populate` como arreglo → `populate[0]=area&populate[1]=categoria…`; como objeto → `populate[zona][fields][0]=code`. `sort` se une con comas y se codifica completo: `sort=pinned%3Adesc%2CpublishedAt%3Adesc`.
- No se envía `status`: se usa el valor por defecto de la REST de Strapi 5 (solo publicados). Es comportamiento de Strapi, no código del UI.
- Respuesta v5 plana (`data[]`, `meta.pagination{page,pageSize,pageCount,total}`), sin `attributes`.
- Errores de Strapi se envuelven en `safe(...)` por query: un CMS caído o sin permisos degrada a resultado vacío y se loguea; no tumba la página.

### 1.2 Por content type

Colecciones REST (plural): `noticias`, `eventos`, `documentos`, `contenidos-semanales`, `frases-motivacionales`, `quinquenios`. Todas con `draftAndPublish: true`.

#### noticia → `GET /api/noticias`
Tag `noticias`. Servicio: `modules/noticias/server/strapi-noticias.service.ts`. `POPULATE = ["area","categoria","zona","tags","coverImage"]`, `SORT = ["pinned:desc","publishedAt:desc"]`.

| Función | filters | sort | pagination | populate / fields |
|---|---|---|---|---|
| `findNoticias` (listado, `/noticias`, `/api/noticias`) | `tipo[$eq]` (si ≠ all), `zona[code][$eq]` (si ≠ all) | SORT | `page`, `pageSize=9` | POPULATE |
| `findNoticiaBySlug` | `slug[$eq]` | ninguno | `pageSize=1` | POPULATE |
| `findRelated` | `$or[0][categoria][name][$eq]`, `$or[1][zona][code][$eq]`, y `slug[$ne]` | SORT | `pageSize=limit` (default 3) | POPULATE |
| `findDestacadasPool` (pie de `/sig/control-documental`) | ninguno | SORT | `pageSize=max(limit*3, 9)`; muestrea `limit` (3) al azar en el UI | POPULATE |
| `findUltimasPorTipo` (home: noticias y comunicado destacado) | `tipo[$eq]` | `publishedAt:desc` (sin `pinned`) | `pageSize=6` (noticias: `NOTICIAS_LIMIT=6`; comunicado: pool de 6, uno al azar) | POPULATE |
| `findFacetRows` (conteos de chips) | `tipo`/`zona` opcionales | ninguno | pagina de 100 en 100 hasta `pageCount` | `fields[0]=id&fields[1]=tipo`, `populate[zona][fields][0]=code` |

Campos que usa el UI (`noticia.mapper.ts`): `documentId`, `title`, `slug`, `excerpt`, `body` (Blocks), `tipo` (`noticia`|`comunicado`), `mandatory`, `pinned`, `readingTimeMin` (si es null se estima ≈200 palabras/min), `publishedAt` (fallback `createdAt`), `area.name` → autor, `categoria.name`, `zona.code` (fallback `nacional`), `tags[].name`, `coverImage` (formato `medium`, fallback a un SVG gris embebido). **No** pide ni usa el componente `notificacion`.

#### evento → `GET /api/eventos`
Tag `eventos`. Sin populate. `SORT = ["startDate:asc","startTime:asc"]`.

| Función | filters | pagination |
|---|---|---|
| `findEventosDelMes(mes)` | `startDate[$gte]=YYYY-MM-01`, `startDate[$lte]=YYYY-MM-<último día>` | `pageSize=100` |
| `findProximosEventos(limit, today)` | `startDate[$gte]=today` | `pageSize=limit` (`/eventos`: 7; home: 4) |

Campos: `documentId`, `title`, `slug`, `startDate` (YYYY-MM-DD), `startTime` (llega `HH:mm:ss.SSS`; el UI corta a `HH:mm`), `locationName`, `address`, `requiresRsvp`, `createdAt`. `today` se calcula con `todayIsoDate()` (`eventos.config.ts`); la home usa zona `America/Bogota`.

#### documento → `GET /api/documentos` (SIG)
Desde el 2026-11-27 los documentos alimentan el **SIG** (`/sig`, código en `src/intranet/modules/sig`), que reemplazó a «Documentos y políticas». La estructura (3 módulos y sus secciones) es fija en `sig.config.ts`; cada `documento` se ubica con su campo `seccion`. Tag `documentos`. Las funciones están en `server/strapi-documentos.service.ts`.

| Función | Pantalla | filters | sort | pagination | populate / fields |
|---|---|---|---|---|---|
| `findDocumentos` | `/sig/control-documental` (tabla) | `categoria[slug][$eq]` y `componente[$eq]` (cada uno si ≠ all), `title[$containsi]` | `revisionDate:desc` | `page`, `pageSize=10` | `populate=file,area,categoria` |
| `findCategoriaFacetRows` | chips de categoría | búsqueda y componente activos | ninguno | de 100 en 100 | `fields[0]=id`, `populate[categoria][fields]=slug,name` |
| `findComponenteRows` | chips de componente | búsqueda, categoría y `componente[$notNull]` | ninguno | de 100 en 100 | `fields[0]=componente` |
| `findDestacados` | pie del control documental | `featured[$eq]=true` | `revisionDate:desc` | `pageSize=3` | `populate=file,area,categoria` |
| `findSigDocumentos` | portada (obligatorios, políticas) y cada módulo | `seccion[$in]=…` o `seccion[$notNull]`, opcional `obligatorio[$eq]=true` | `orden:asc,title:asc` | de 100 en 100 (tope 10 páginas) | `fields` explícitos (sin `contenido` salvo en los módulos), `populate[file][fields]=url,ext,size,mime,name`, `populate[area][fields]=name`, `populate[categoria][fields]=name,slug` |
| `findSigDocumentoBySlug` | `/sig/[modulo]/[slug]` | `slug[$eq]` | ninguno | `pageSize=1` | el mismo populate, todos los campos |

Campos que usa el UI (`documento.mapper.ts`): `documentId`, `title`, `slug`, `description`, `revisionDate`, `featured`, `file.{url,ext,size,mime}` (`size` **en KB, float**), `categoria.{name,slug}`, `area.name`, y los del SIG:

| Campo | Tipo en el CMS | Uso en el UI |
|---|---|---|
| `seccion` | enum: `cultura_historia`, `cultura_mision`, `cultura_vision`, `cultura_codigo_etica`, `sig_politicas`, `sig_mapa_procesos`, `sst_seguridad_salud`, `sst_emergencias`, `sst_sig`, `sst_sagrilaft_etica`, `sst_habeas_data` | Módulo y sección. Vacío = solo en el control documental. Un valor que el UI no conoce se trata como vacío |
| `componente` | enum: `calidad`, `ambiental`, `sst`, `rh` | Tarjetas de políticas y filtro del control documental |
| `presentacion` | enum `pagina` \| `descarga` (default `descarga`) | `pagina` (o sin archivo) da página de lectura `/sig/<modulo>/<slug>` |
| `contenido` | Blocks | Texto de lectura. El UI renderiza párrafos, títulos, citas, listas, marcas, enlaces (`http(s)`, `mailto`, `tel`, rutas `/`) e imágenes |
| `obligatorio` | boolean | Insignia «Obligatorio» y franja de la portada |
| `evaluacionUrl` | string, validado `^https?://\S+$` en el CMS | Botón «Presentar evaluación» (enlace externo, no se registra el resultado) |
| `codigo`, `version` | string | Meta del documento controlado |
| `orden` | integer | Orden dentro de la sección; vacío al final |

Un `file` de imagen se muestra dentro de la página (mapa de procesos); cualquier otro se descarga. La URL de descarga no sale de `file.url` (§1.4). El CMS exige archivo al publicar un `descarga`.

Antes de que el CMS tenga estos campos, `strictParams` responde 400 a las consultas del SIG: la capa `queries.ts` lo convierte en estados vacíos o en el aviso «No pudimos cargar los documentos», y la tabla sigue funcionando porque no envía campos nuevos salvo que se elija un componente. Despliegue: CMS primero, UI después.

#### contenido-semanal → `GET /api/contenidos-semanales`
Tag `contenido-semanal`. Home. Filtro `fechaPublicacion[$lte]=<hoy Colombia>`, `sort=fechaPublicacion:desc`, `pageSize=1`, `populate[0]=image&populate[1]=secciones`. Campos: `documentId`, `title`, `eyebrow`, `secciones[].texto` (Blocks; el componente `contenido.seccion` solo tiene `texto`; mínimo 3 en el schema), `image` (`medium`), `fechaPublicacion`. Los componentes y la media **no llegan sin `populate` explícito**.

#### frase-motivacional → `GET /api/frases-motivacionales`
Tag `frases-motivacionales`. `pageSize=100`, sin filtros ni sort; el UI elige una al azar. Campo: `texto` (≤140).

#### quinquenio → `GET /api/quinquenios` (ver hallazgo 1)
Tag `quinquenios`. `sort=orden:asc,createdAt:desc`, `pageSize=8` (`QUINQUENIOS_LIMIT`), `populate[0]=image`. Campos: `documentId`, `title`, `image` (`medium`; si no resuelve, el componente descarta la entrada), `orden`.

#### categoria, categoria-documento, tag, area, zona, sede
Sin llamadas directas (hallazgo 2). Solo se leen como relaciones pobladas:
`area.name` (noticia y documento), `categoria.name` (noticia), `categoria.{name,slug}` (documento, vía `categoria-documento`), `zona.code` (noticia), `tags[].name` (noticia). Schemas: `area{name,slug}`, `categoria{name,slug}`, `categoria-documento{name,slug}`, `tag{name,slug}`, `zona{code(uid),label}`, `sede{name,externalId unique}`; todos `draftAndPublish: false`. Datos de partida en `INTRANET-JDH-CMS/data/catalogos.json`: 13 áreas, 7 categorías, 8 zonas (nacional + 7 sedes), 19 tags, 4 categorías de documento (Políticas, Reglamentos, Formatos, Manuales).

### 1.3 URL de media

- Strapi entrega `url` relativa (`/uploads/<hash><ext>`, proveedor **local**, sin S3). `config/server.ts` **no** cambia eso: `PUBLIC_URL` no reescribe las URLs de media.
- El UI resuelve: `strapiConfig.publicUrl + (media.formats[formato]?.url ?? media.url)` (`lib/strapi/media.ts`). Si `url` ya es absoluta (`https?://`), la usa tal cual. Formato pedido siempre `medium`; no se usa otro.
- `publicUrl = STRAPI_PUBLIC_URL ?? STRAPI_URL ?? "http://localhost:1337"`. `STRAPI_URL` es lo que ve el **servidor** del UI; `STRAPI_PUBLIC_URL` es lo que ve el **navegador**.
- Producción: `STRAPI_URL=https://cms-intranet.jdh.local` (el contenedor `ui` lo resuelve a Caddy por alias de red, con la CA interna) y `STRAPI_PUBLIC_URL=https://intranet.jdh.local/cms`. Caddy reenvía **solo** `^/cms/(uploads/[^/]+|api/documentos/[^/]+/download)$` al CMS quitando el prefijo `/cms`; el resto del origen va al UI. El panel y el resto de la API de Strapi quedan solo en `cms-intranet.jdh.local`.
- Sin `remotePatterns` en `next.config.ts`: las imágenes se sirven con `<img>`, no con `next/image` (no verifiqué todos los componentes; el config no declara dominios).

### 1.4 Descarga de documentos

- `downloadUrl = ${publicUrl}/api/documentos/${documentId}/download` (en `documento.mapper.ts`). Es un `<a>` directo del navegador al CMS, **sin proxy en Next**.
- Ruta custom de Strapi (`documento-download.ts`, `GET /documentos/:documentId/download`, `documento.download`), dentro de users-permissions (se concede a Public en el bootstrap). El controlador busca el documento con `status: 'published'`, toma `file`, y responde el binario del disco (`public/uploads`) con `Content-Disposition: attachment; filename=…; filename*=UTF-8''…`, `Content-Type` del archivo y `Cache-Control: private, max-age=0, must-revalidate`. Existe porque el atributo `download` de `<a>` se ignora en cross-origin.
- Si `file.url` fuera absoluta (proveedor remoto), el controlador redirige (`ctx.redirect`) y no impone el nombre. Defensa contra path traversal incluida.
- `file.size` viene en **KB**, no en bytes.
- Tipos de archivo permitidos al subir (`config/plugins.ts`): `image/*`, `video/*`, `audio/*`, PDF, Word y `officedocument.*`, `text/plain`, `text/csv`; ejecutables denegados. Límite del cuerpo en Caddy para el host del CMS: 250 MB.

---

## 2. Rich text (`lib/strapi/blocks.ts`, `mapBlocks`)

- Entrada: campo **Blocks** de Strapi 5 (`body` de noticia y `secciones[].texto` de contenido semanal).
- Tipos de bloque soportados (4): `paragraph`, `heading`, `quote`, `list`. Cualquier otro (`image`, `code`, …) se **omite en silencio**.
- Cada bloque se aplana a texto plano: se concatenan los nodos `text`; los nodos con `children` (por ejemplo enlaces) se recorren recursivamente, así que **se conserva el texto del enlace pero no su URL**. Se pierde negrita, cursiva, subrayado, tachado y código en línea (no hay marcas en el modelo de dominio).
- `heading` no conserva `level` (siempre `<h2>`). `list` no distingue `format` ordenada/no ordenada: siempre `<ul>`; los ítems son el texto de cada `list-item`.
- Dominio: `ArticleBlock = {paragraph|heading|quote: text} | {list: items[]}`. Se renderiza en `components/content/article-body.tsx` (`size: "article" | "compact"`); `compact` es el de la home.

---

## 3. Webhook `POST /api/revalidate` (Strapi → UI)

- Ruta pública en el `proxy.ts` (se excluye de la sesión) y protegida por secreto: cabecera **`x-webhook-secret`** debe ser igual a `STRAPI_WEBHOOK_SECRET`. Sin la variable configurada responde 401 (fail-closed). Secreto distinto o ausente → 401.
- Payload de Strapi que se lee: `{ event, model, createdAt }` (el resto del `entry` se ignora; invalida por colección, no por entrada). `event` debe ser `string` (si no, 400); JSON inválido → 400. `{ event: "trigger-test" }` sin `model` (botón Trigger del panel) → no-op 200 `{revalidated:false}`. Modelo no mapeado → no-op 200.
- Acción: `revalidateTag(tag, { expire: 0 })` por cada tag del mapa (expiración inmediata, sin stale-while-revalidate). Respuesta 200: `{ revalidated:true, model, event, tags }`.
- Eventos que el CMS envía: `entry.create`, `entry.update`, `entry.delete`, `entry.publish`, `entry.unpublish`. El webhook se registra **por código** en el arranque del CMS (`ensureRevalidateWebhook`, nombre «Intranet UI — revalidación de caché» (nombre literal guardado en Strapi)) si existen `REVALIDATE_WEBHOOK_URL` y `REVALIDATE_WEBHOOK_SECRET`. En producción: `http://ui:3000/api/revalidate`. Se registra por código porque el panel de Strapi con `NODE_ENV=production` rechaza URLs que resuelven a IP privada. Queda también **guardado en la base** `intranet_cms`: si se migra la base sin las variables, el webhook conserva la URL vieja.
- Mapa modelo → tags (`lib/strapi/webhook-tag-map.ts`, clave = UID singular):

| Modelo Strapi | Tags de Next |
|---|---|
| `noticia` | `noticias` |
| `documento` | `documentos` |
| `categoria-documento` | `documentos` |
| `area` | `noticias`, `documentos` |
| `evento` | `eventos` |
| `contenido-semanal` | `contenido-semanal` |
| `frase-motivacional` | `frases-motivacionales` |
| `quinquenio` | `quinquenios` |

  **Sin entrada** (no invalidan, solo vence el `revalidate=60`): `categoria`, `zona`, `tag`, `sede`, `notificacion`.
- En la plataforma hoy **no hay Route Handlers ni lectura de Strapi en servidor**; sin este endpoint, el único mecanismo de frescura sería el `revalidate` por tiempo.

---

## 4. Despliegue: lo mínimo que replicar

Hoy el CMS no tiene compose propio en producción: lo orquesta `INTRANET-JDH-API/deploy/compose.prod.yaml` (el API es dueño del stack), con los tres repos clonados lado a lado en `~/apps/`.

### 4.1 Dockerfile del CMS (`INTRANET-JDH-CMS/Dockerfile`)

- `node:22-slim` (Debian, no Alpine: `sharp` necesita binarios glibc). Etapa `build` con `python3 make g++`, `corepack prepare pnpm@11.15.1`, `pnpm install --frozen-lockfile`, `NODE_ENV=production`, `pnpm run build` (panel de admin).
- Etapa `runtime`: copia **todo** `/opt/app` (con devDependencies, porque Strapi transpila `config/` y `src/` TypeScript en ejecución y los `scripts/*.js` arrancan Strapi con `compileStrapi`), `mkdir public/uploads` con dueño `node`, `USER node`, `EXPOSE 1337`, `HEALTHCHECK` a `http://127.0.0.1:1337/_health` (start-period 60 s), `CMD pnpm run start`.
- Strapi `5.50.2`, `pg 8.20.0`, Node ≥20 <=26.

### 4.2 Servicio `cms` en el compose

- Imagen construida desde el repo del CMS; volumen **`cms_uploads:/opt/app/public/uploads`**; depende de `postgres` sano; `restart: unless-stopped`; logging `json-file` 10 MB × 5. No publica puertos: solo Caddy.
- Variables del contenedor `cms` (mapeadas desde `deploy/.env`):

| Variable | Valor / origen |
|---|---|
| `HOST`, `PORT` | `0.0.0.0`, `1337` |
| `PUBLIC_URL` | `https://${CMS_HOST}` |
| `IS_PROXIED` | `true` (detrás de proxy TLS, para cookies `secure` del admin) |
| `APP_KEYS` | `${CMS_APP_KEYS}` (4 valores separados por coma) |
| `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY` | `${CMS_API_TOKEN_SALT}`, `${CMS_ADMIN_JWT_SECRET}`, `${CMS_TRANSFER_TOKEN_SALT}`, `${CMS_JWT_SECRET}`, `${CMS_ENCRYPTION_KEY}` |
| `DATABASE_CLIENT`, `DATABASE_HOST`, `DATABASE_PORT` | `postgres`, `postgres`, `5432` |
| `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` | `${CMS_DB_NAME:-intranet_cms}`, `${CMS_DB_USER:-intranet_cms}`, `${CMS_DB_PASSWORD}` |
| `DATABASE_SSL` | `false` |
| `NOTIFICATIONS_API_URL`, `NOTIFICATIONS_INGEST_SECRET` | `http://api:3000/api/v1`, `${NOTIFICATIONS_INGEST_SECRET}` (ver §5; si faltan, el hook se desactiva con un warning) |
| `REVALIDATE_WEBHOOK_URL`, `REVALIDATE_WEBHOOK_SECRET` | `http://ui:3000/api/revalidate`, `${STRAPI_WEBHOOK_SECRET}` |
| `FLAG_NPS`, `FLAG_PROMOTE_EE` | `false`, `false` |

- Opcionales con default: `FLAG_DOC_LINKS` (true), `DATABASE_SCHEMA` (public), `DATABASE_POOL_MIN/MAX` (2/10), `DATABASE_CONNECTION_TIMEOUT` (60000), `WEBHOOKS_POPULATE_RELATIONS` (false).
- Los seis secretos de Strapi son independientes de los del UI. Por semántica de Strapi (no verificado en este código), al migrar conviene **reusar los mismos valores** de `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `ENCRYPTION_KEY`, `JWT_SECRET`; con otros valores se invalidan sesiones del panel y tokens existentes.

### 4.3 Postgres y Caddy

- **Postgres:** la base `intranet_cms` vive en la **misma instancia `postgres:17-alpine`** que `intranet_jdh` (API + Better Auth). La crea `deploy/postgres/init/10-cms-database.sh` solo cuando el volumen `pg_data` está vacío: rol `intranet_cms` con login, `CREATE DATABASE intranet_cms OWNER intranet_cms`, y `REVOKE ALL … FROM PUBLIC` en ambas bases. Si la plataforma usa su propio Postgres (la de la plataforma es `postgres:16-alpine` en su compose de desarrollo), hay que crear ese rol y esa base a mano antes de restaurar el dump.
- **Caddy** (`deploy/caddy/Caddyfile`): TLS con **CA interna** propia (`pki ca local`, raíz `deploy/caddy/ca/root.crt` repartida por GPO, con name constraints `*.jdh.local`). Dos bloques:
  - `{$INTRANET_HOST}`: el matcher `@cms_public path_regexp ^/cms/(uploads/[^/]+|api/documentos/[^/]+/download)$` → `uri strip_prefix /cms` → `reverse_proxy cms:1337`; todo lo demás → `reverse_proxy ui:3000`.
  - `{$CMS_HOST}`: `request_body max_size 250MB` → `reverse_proxy cms:1337` (panel, API completa, subidas).
  - Cabeceras comunes: `encode zstd gzip`, `-Server`, `X-Content-Type-Options nosniff`, `Referrer-Policy strict-origin-when-cross-origin`.
  - El servicio `caddy` declara alias de red `intranet.jdh.local` y `cms-intranet.jdh.local` para que los contenedores resuelvan los dominios hacia Caddy; el UI confía en la CA con `NODE_EXTRA_CA_CERTS=/etc/ssl/jdh/root.crt`.
- Sin ese reenvío de `/cms/*` (o equivalente) en el origen de la plataforma, `STRAPI_PUBLIC_URL` tendría que ser el dominio del CMS y el navegador necesitaría confiar en su certificado.

### 4.4 CI/CD (`ci-cd.yml` del CMS; el del UI es igual en forma)

- `check`: `ubuntu-latest`, pnpm 11.15.1, Node 22, `pnpm install --frozen-lockfile`, `pnpm exec tsc --noEmit`.
- `image`: `docker/build-push-action@v6` con `push: false` y caché `gha` (valida que la imagen construya).
- `deploy`: solo en `push` a `master`, `runs-on: [self-hosted, intranet-jdh]`, `environment: produccion`, `concurrency: deploy-intranet-cms`, bloqueo `flock` en `/home/intranet/apps/.deploy.lock` (compartido por los tres repos), `git fetch/checkout --force master/reset --hard $GITHUB_SHA` en `~/apps/INTRANET-JDH-CMS`, y ejecuta `~/apps/INTRANET-JDH-API/deploy/scripts/deploy.sh cms`.
- `deploy.sh`: respaldo previo → `compose build` → `up -d --remove-orphans` → `caddy reload` → verificación con reintentos (~3 min): `/_health` del CMS vía Caddy, y `GET https://<INTRANET_HOST>/cms/uploads/__probe__.png` debe responder con `x-powered-by: strapi` (prueba que Caddy enruta `/cms` al CMS, no al UI).
- Para replicar en la plataforma: un runner self-hosted en la máquina destino, o cambiar el job de deploy; el repo de la plataforma hoy no tiene CD.

### 4.5 Datos a migrar

| Dato | Dónde está | Cómo respaldarlo (ya lo hace `backup.sh`) |
|---|---|---|
| Base `intranet_cms` | Postgres `intranet-postgres`, DB `intranet_cms` | `pg_dump -Fc intranet_cms` |
| Biblioteca de medios | volumen Docker `intranet-jdh_cms_uploads` (`/opt/app/public/uploads`) | `tar` del volumen |
| Secretos de Strapi | `deploy/.env` del servidor (no versionado): `CMS_*` | copiar |
| CA interna | `deploy/caddy/ca/` (no versionada) | solo si se mantiene el dominio `*.jdh.local` |
| Cuentas del panel | dentro de la base (Super Admin y Gestor de contenidos); `scripts/create-admin.js` las crea y reinicia contraseña | incluidas en el dump |

- **Tamaño: desconocido** desde el código. En el servidor se mide con `du -sh` sobre el volumen y con `\l+ intranet_cms` en `psql`; `deploy/scripts/backup.sh` imprime el tamaño total del respaldo al terminar. Las semillas del repo son mínimas (`data/uploads/*-placeholder.*`).
- Datos que viven en la base y son por entorno: el webhook de revalidación (URL guardada), los permisos del rol Public y el rol «Gestor de contenidos» (el bootstrap los vuelve a aplicar en cada arranque), y `allow_register=false`.
- Los scripts `seed:*` de `package.json` son para datos demo; `ensureProductionAccess` ya cubre lo que un despliegue limpio necesita. `seed:catalogos` es seguro en producción (catálogo editable); `seed:sedes` depende del API (§5).

### 4.6 Variables del UI relacionadas con Strapi

`STRAPI_URL` (default `http://localhost:1337`), `STRAPI_PUBLIC_URL` (default = `STRAPI_URL`), `STRAPI_API_TOKEN` (opcional), `STRAPI_WEBHOOK_SECRET` (sin default; sin él `/api/revalidate` rechaza todo) y `NODE_EXTRA_CA_CERTS` (solo si Strapi va con certificado de CA interna). Ninguna lleva `NEXT_PUBLIC_`. El UI no necesita nada de Strapi en tiempo de `next build`: el Dockerfile solo pone placeholders de Better Auth.

---

## 5. Qué usa Strapi del API NestJS (y qué se pierde si se apaga)

**Único acoplamiento CMS → API:** el hook de publicación (`src/notificaciones/publish-hook.ts`, `config/notificaciones.ts`).

- Se registra con `strapi.documents.use()`; actúa cuando `ctx.action === 'publish'` en `api::noticia.noticia`, `api::evento.evento` o `api::notificacion.notificacion`, y solo si el componente `notificacion.enviar` está activo.
- Llamada: `POST ${NOTIFICATIONS_API_URL}/notificaciones/ingesta` (en producción `http://api:3000/api/v1/notificaciones/ingesta`), cabeceras `content-type: application/json` y **`x-jdh-ingest-secret: ${NOTIFICATIONS_INGEST_SECRET}`**. El API la protege con `IngestSecretGuard` (comparación de longitud + `timingSafeEqual`; el secreto debe tener ≥32 caracteres en el API) y `@Public()`.
- Cuerpo: `fuente` (`NOTICIA`|`EVENTO`), `fuenteId` (documentId), `slug`, `titulo`, `resumen`, `idempotencyKey` (`documentId:publishedAt`), `audiencia {tipo: TODOS|SEDE|AREA, valores[]}`, `programadaPara`, `recordatorioDiasAntes`, `fechaEvento`, `publicadoPor`. Enlaces que genera el motor: `/noticias/<slug>`, `/eventos?mes=YYYY-MM`.
- Es **fire-and-forget**: se ejecuta tras terminar la publicación y los errores solo se loguean; **apagar el API no impide publicar contenido**. Si `NOTIFICATIONS_API_URL` o `NOTIFICATIONS_INGEST_SECRET` faltan, el hook se desactiva con un warning al arrancar (no rompe el boot).

**Si el API NestJS se apaga se pierde:**

1. **Notificaciones al publicar** (campana y Web Push): el estado leído/no leído y el fan-out viven en el API (Postgres), no en Strapi. Los campos del componente `notificacion` seguirían visibles en el panel pero sin efecto.
2. **Segmentación por sede y por área:** `sede.externalId` es el `Site.id` (uuid) del API; `scripts/seed-sedes.js` lee `GET ${apiUrl}/notificaciones/ingesta/audiencias` con el mismo secreto para sincronizar el espejo `sede`. Las áreas se comparan por **nombre** contra `Employee.department` del API (documentado en `notificaciones-fanout.service.ts`: un nombre distinto da cero destinatarios sin error).
3. Sin el API, `seed:sedes` falla y la colección `sede` queda congelada; no afecta a noticias, eventos ni documentos.

**Lo que Strapi NO usa del API:** no hay llamadas del API a Strapi (el API no lee el CMS), no comparten base ni sesión, y Strapi no autentica usuarios finales (login es Entra en el UI; `users-permissions` solo sirve el rol Public y su registro está cerrado por código). El único acoplamiento hacia el UI es el webhook de revalidación (§3).

---

## Pendientes de confirmar (no resolubles desde el código)

- Qué versión del CMS corre hoy en producción (¿incluye `quinquenio`?).
- Tamaño real de `intranet_cms` y `cms_uploads`.
- Dominio y TLS del destino en la plataforma (determina `PUBLIC_URL`, `STRAPI_PUBLIC_URL` y si se reutiliza la CA `*.jdh.local`).
- Si el hook de notificaciones se mantiene (requiere API) o se retira junto con el componente `notificacion`.

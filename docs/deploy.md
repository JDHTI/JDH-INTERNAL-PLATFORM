# Despliegue en intranet.jdh.com.co

La plataforma reemplaza a la intranet en el mismo servidor. La UI y el API de la intranet se
retiraron el 2026-11-04; Strapi sigue y solo lo consume el frente gráfico, a través del API.

## Cómo está armado el servidor

Servidor de la intranet (Debian 13, `192.168.100.217`), usuario `intranet`, Docker con compose v5.

Desde el 2026-11-10 el dominio es `*.jdh.com.co`; `*.jdh.local` y su CA interna ya no se usan.
`intranet.jdh.com.co` y `cms-intranet.jdh.com.co` son CNAME de `host.jdh.com.co`, un proxy de
infraestructura con el certificado `*.jdh.com.co` (SSL.com). Ese proxy termina el TLS y reenvía
por **http** al Caddy del servidor:

```
https://intranet.jdh.com.co      → proxy de infra (TLS) → http → intranet-caddy → /api/v1/*      → platform-api:8000
                                                                                  /cms/uploads/* → intranet-cms:1337
                                                                                  /cms/api/documentos/<id>/download → intranet-cms:1337
                                                                                  /*             → platform-ui:3000
https://cms-intranet.jdh.com.co  → proxy de infra (TLS) → http → intranet-caddy → intranet-cms:1337 (panel de Strapi)
```

El Caddyfile vive en el stack de borde (INTRANET-JDH-API `deploy/`); los sitios `http://` que
reciben ese tráfico se agregaron en el clon del servidor.

| Proyecto de compose | Dueño | Servicios |
| --- | --- | --- |
| `intranet-jdh` (stack de borde) | INTRANET-JDH-API `deploy/`, clon en `~/apps/INTRANET-JDH-API` | `caddy`, `cms`, `postgres` (bases `intranet_jdh` e `intranet_cms`) |
| `internal-platform` | este repo, `deploy/compose.prod.yaml` | `ui` (contenedor `platform-ui`) |
| el del API | JDH-INTERNAL-PLATFORM-API | `api` con alias `platform-api` (pendiente) |

Todo se encuentra en la red `intranet-jdh_default`. Caddy resuelve `platform-ui` y `platform-api`
en cada petición, así que un servicio nuevo no obliga a reiniciarlo: basta con unirse a la red con
su alias.

Lo que el stack de borde conserva y no se debe borrar: los volúmenes `intranet-jdh_pg_data`,
`intranet-jdh_cms_uploads` e `intranet-jdh_caddy_data`. Los volúmenes
`intranet-jdh_redis_data` e `intranet-jdh_storage_data` del API retirado se guardan hasta la fase 6.

## La UI

`deploy/deploy.sh` construye la imagen en el servidor, la levanta y verifica `/api/health` por el
mismo salto que usa el proxy de infraestructura: http al Caddy local (`EDGE_HTTP`) con el
encabezado `Host: $PUBLIC_HOST`. `NEXT_PUBLIC_API_URL` queda en
`https://intranet.jdh.com.co/api/v1`, incrustada al compilar: cambiar de dominio exige
reconstruir la imagen.

Valores en `~/apps/platform/ui.env` (no versionado, permisos 600):

| Variable | Por defecto |
| --- | --- |
| `STRAPI_WEBHOOK_SECRET` | Obligatoria: el mismo valor de `STRAPI_WEBHOOK_SECRET` en `~/apps/INTRANET-JDH-API/deploy/.env` |
| `API_INTERNAL_URL` | `http://platform-api:8000/api/v1` |
| `STRAPI_URL` | `http://intranet-cms:1337` |
| `PUBLIC_HOST` | `intranet.jdh.com.co` |
| `EDGE_NETWORK` | `intranet-jdh_default` |
| `EDGE_HTTP` | `http://127.0.0.1` (el Caddy del servidor, donde verifica el despliegue) |
| `MAP_ASSETS_DIR` | `~/apps/platform/mapas`: el mapa base del mapa comercial, montado en el contenedor (`docs/mapa-comercial.md`) |

### CD

El job `deploy` de `.github/workflows/ci.yml` corre en cada push a `master`, después de lint,
tipos, build e imagen, en el runner self-hosted con la etiqueta `internal-platform-ui`. Hace
checkout en el workspace del runner y ejecuta `deploy/deploy.sh`; no hace falta clon ni deploy key
en el servidor. El lock `~/apps/.deploy.lock` es el mismo que usan los despliegues del stack de
borde.

Registrar el runner (una vez; el token lo genera un administrador del repo en Settings, Actions,
Runners, New self-hosted runner y dura una hora):

```bash
deploy/setup-runner.sh <token>   # en el servidor, pide sudo
```

### Desplegar a mano

```bash
# desde una copia del repo en el servidor
bash deploy/deploy.sh
```

## Lo que le toca al API

Hasta que el API se despliegue, `/api/v1/*` responde 502 y la UI muestra sus estados de sesión y
de error. Para cerrarlo, desde JDH-INTERNAL-PLATFORM-API:

1. Un `compose.prod.yaml` con el servicio `api` unido a la red externa `intranet-jdh_default` con
   el alias `platform-api`, escuchando en el puerto 8000 y sirviendo bajo `/api/v1`. Sus
   dependencias (Postgres de la plataforma, Redis, almacenamiento, ClamAV) en su propio proyecto.
2. Variables de producción: `ENTRA_REDIRECT_URI` y `AUTH_FRONTEND_REDIRECT_URI` sobre
   `https://intranet.jdh.com.co`, `AUTH_COOKIE_SECURE=true`, CORS de `https://intranet.jdh.com.co`.
   Registrar el redirect URI en la app de Entra.
3. Migraciones (`alembic upgrade head`), primera sincronización del directorio e importación desde
   la base `intranet_jdh` (sigue en `intranet-postgres`), como dice
   `docs/intranet-centralization.md` §4.
4. Su propio runner (`deploy/setup-runner.sh` de este repo sirve de molde, con otra etiqueta) y un
   job de despliegue que tome `~/apps/.deploy.lock`.
5. Los endpoints de perfil y notificaciones de `docs/intranet-port.md`. Cuando existan las
   notificaciones, volver a poner `NOTIFICATIONS_API_URL` del CMS hacia el API (hoy está quitada
   en el stack de borde). El webhook de revalidación del CMS apunta a la UI
   (`http://platform-ui:3000/api/revalidate`), que es quien lee Strapi.

## Volver atrás

La UI y el API de la intranet se pueden levantar otra vez: en `~/apps/INTRANET-JDH-API`,
`git checkout c2ed1ba` (el último master con el stack completo) y `deploy/scripts/deploy.sh`. Los
datos siguen en los volúmenes; el respaldo previo al retiro quedó en `~/backups/*-retiro-intranet`.

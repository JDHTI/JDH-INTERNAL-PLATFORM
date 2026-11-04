# Despliegue en intranet.jdh.local

La plataforma reemplaza a la intranet en el mismo servidor y el mismo dominio. La UI y el API de
la intranet se retiraron el 2026-11-04; Strapi sigue y solo lo consume el frente gráfico, a través
del API.

## Cómo está armado el servidor

Servidor: `intranet.jdh.local` (Debian 13), usuario `intranet`, Docker con compose v5.

```
https://intranet.jdh.local      → intranet-caddy → /api/v1/*      → platform-api:8000  (pendiente)
                                                   /cms/uploads/* → intranet-cms:1337
                                                   /*             → platform-ui:3000
https://cms-intranet.jdh.local  → intranet-caddy → intranet-cms:1337 (panel de Strapi)
```

| Proyecto de compose | Dueño | Servicios |
| --- | --- | --- |
| `intranet-jdh` (stack de borde) | INTRANET-JDH-API `deploy/`, clon en `~/apps/INTRANET-JDH-API` | `caddy`, `cms`, `postgres` (bases `intranet_jdh` e `intranet_cms`) |
| `internal-platform` | este repo, `deploy/compose.prod.yaml` | `ui` (contenedor `platform-ui`) |
| el del API | JDH-INTERNAL-PLATFORM-API | `api` con alias `platform-api` (pendiente) |

Todo se encuentra en la red `intranet-jdh_default`. Caddy resuelve `platform-ui` y `platform-api`
en cada petición, así que un servicio nuevo no obliga a reiniciarlo: basta con unirse a la red con
su alias.

Lo que el stack de borde conserva y no se debe borrar: los volúmenes `intranet-jdh_pg_data`,
`intranet-jdh_cms_uploads`, `intranet-jdh_caddy_data` y la CA raíz en
`~/apps/INTRANET-JDH-API/deploy/caddy/ca/` (la que los equipos confían por GPO). Los volúmenes
`intranet-jdh_redis_data` e `intranet-jdh_storage_data` del API retirado se guardan hasta la fase 6.

## La UI

`deploy/deploy.sh` construye la imagen en el servidor, la levanta y verifica
`https://intranet.jdh.local/api/health` a través de Caddy. `NEXT_PUBLIC_API_URL` queda en
`https://intranet.jdh.local/api/v1`, incrustada al compilar.

Valores opcionales en `~/apps/platform/ui.env` (no versionado):

| Variable | Por defecto |
| --- | --- |
| `PUBLIC_HOST` | `intranet.jdh.local` |
| `EDGE_NETWORK` | `intranet-jdh_default` |
| `EDGE_CA` | `~/apps/INTRANET-JDH-API/deploy/caddy/ca/root.crt` |

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
   `https://intranet.jdh.local`, `AUTH_COOKIE_SECURE=true`, CORS de `https://intranet.jdh.local`.
   Registrar el redirect URI en la app de Entra.
3. Migraciones (`alembic upgrade head`), primera sincronización del directorio e importación desde
   la base `intranet_jdh` (sigue en `intranet-postgres`), como dice
   `docs/intranet-centralization.md` §4.
4. Su propio runner (`deploy/setup-runner.sh` de este repo sirve de molde, con otra etiqueta) y un
   job de despliegue que tome `~/apps/.deploy.lock`.
5. Fase 4: `/content/*`, y entonces volver a poner `REVALIDATE_WEBHOOK_URL` y
   `NOTIFICATIONS_API_URL` del CMS hacia el API (hoy están quitadas en el stack de borde).

## Volver atrás

La UI y el API de la intranet se pueden levantar otra vez: en `~/apps/INTRANET-JDH-API`,
`git checkout c2ed1ba` (el último master con el stack completo) y `deploy/scripts/deploy.sh`. Los
datos siguen en los volúmenes; el respaldo previo al retiro quedó en `~/backups/*-retiro-intranet`.

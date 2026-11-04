# internal-platform-ui

Intranet de la Plataforma Interna JDH (Next.js 16, App Router, Tailwind v4).
Contrato visual: [`docs/DESIGN.md`](docs/DESIGN.md). Guía para agentes y comandos:
[`CLAUDE.md`](CLAUDE.md).

## Arranque

```bash
pnpm install
cp .env.example .env.local   # ajusta NEXT_PUBLIC_API_URL si hace falta
pnpm dev                     # http://localhost:3000
```

## Docker

```bash
docker compose up -d --build                 # imagen de producción, http://localhost:3000
docker compose -f compose.dev.yaml watch     # desarrollo con recarga en caliente
```

- `NEXT_PUBLIC_API_URL` se toma del shell o de un `.env` en la raíz (compose no
  lee `.env.local`). En la imagen de producción queda incrustada al compilar:
  cada URL de API necesita su propia imagen
  (`docker build --build-arg NEXT_PUBLIC_API_URL=https://… .`).
- `UI_PORT` cambia el puerto del host (por defecto 3000).
- El contenedor se declara sano con `GET /api/health`, que solo revisa este
  proceso, no la API.
- El modo desarrollo usa `watch`, que copia los cambios al contenedor, en lugar de
  montar el repo: en Docker Desktop un bind mount pierde eventos de archivos y
  Fast Refresh se queda pegado. Cambiar `package.json` o el lockfile reconstruye
  la imagen.
- El navegador llama a la API directamente, así que la API sigue necesitando el
  origen del UI en `CORS_ORIGINS`. Las fotos del directorio se piden con `<img>`,
  y la cookie solo viaja si UI y API están en el mismo sitio: en producción van
  detrás del mismo dominio (ver `docs/intranet-centralization.md` §4).
- La integración continua (`.github/workflows/ci.yml`) corre lint, tipos, build y
  la construcción de la imagen. El despliegue se agrega cuando exista el
  servidor de producción de la plataforma.

## Configuración

| Variable | Por defecto | Uso |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | Base de `internal-platform-api`, con el prefijo de versión. Se incrusta al compilar: cambiarla exige reiniciar `pnpm dev`. |

Todas las llamadas pasan por `src/shared/lib/api-client.ts` con
`credentials: "include"`. La sesión es el SSO de Entra de la API: los tokens
viven en cookies HttpOnly del dominio de la API, y el navegador las adjunta solo.
Un 401 muestra el acceso a `${NEXT_PUBLIC_API_URL}/auth/login`.

En desarrollo, con `AUTH_DEV_BYPASS=true` en la API, un request sin cookies actúa
como su administrador de desarrollo, que ve todas las áreas. Como las cookies
viajan entre orígenes, la API necesita el origen del UI en `CORS_ORIGINS`
(explícito, no `*`).

## Vista general y espacio de trabajo

- La **vista general** (`src/app/(app)/(general)/`) es para toda persona
  autenticada: inicio con cumpleaños y nuevos ingresos, directorio, perfil de
  cada persona, configuración y sugerencias. Lee el módulo `directory` de la API.
- El **espacio de trabajo** (`src/app/(app)/(workspace)/[area]/`) es un área a la
  vez con sus módulos. La administración de la plataforma es un módulo de TI,
  `/ti/administracion/*`, que solo ven los administradores.

## Áreas y gestor documental

- Las áreas salen de `GET /areas`, ya filtradas por acceso. Todas las rutas de
  área viven bajo `src/app/(app)/(workspace)/[area]/`: un área nueva en la base de datos
  tiene resumen y gestor documental sin tocar código. Un slug inexistente da
  404; un área sin acceso muestra a quién pedirlo.
- El icono del área es un nombre de lucide-react. Los nombres admitidos están en
  `src/features/areas/area-icons.ts`; uno desconocido cae a un icono neutro.
- Los módulos por área siguen en `src/shared/config/areas.config.ts`, indexados
  por slug. El módulo «Gestor documental» (`/{slug}/documentos`) se genera para
  cada área.

Quién ve qué área lo decide la API: el rol `admin` ve todas; el resto, las áreas
donde es miembro o responsable.

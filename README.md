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

## Áreas y gestor documental

- Las áreas salen de `GET /areas`, ya filtradas por acceso. Todas las rutas de
  área viven bajo `src/app/(app)/[area]/`: un área nueva en la base de datos
  tiene resumen y gestor documental sin tocar código. Un slug inexistente da
  404; un área sin acceso muestra a quién pedirlo.
- El icono del área es un nombre de lucide-react. Los nombres admitidos están en
  `src/features/areas/area-icons.ts`; uno desconocido cae a un icono neutro.
- Los módulos por área siguen en `src/shared/config/areas.config.ts`, indexados
  por slug. El módulo «Gestor documental» (`/{slug}/documentos`) se genera para
  cada área.

Quién ve qué área lo decide la API: el rol `admin` ve todas; el resto, las áreas
donde es miembro o responsable.

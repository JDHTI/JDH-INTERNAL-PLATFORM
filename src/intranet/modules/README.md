# Módulos (`src/modules/`)

Cada módulo es una **rebanada vertical** autocontenida de la intranet (noticias, documentos, directorio, eventos, solicitudes, ayuda…). La meta de arquitectura es que **agregar un módulo sea "crear una carpeta + registrar un manifiesto"** — sin tocar el resto de la app.

## Cómo se conecta un módulo

1. La capa de **rutas** (`src/app/`) es delgada: un `page.tsx` solo importa y renderiza la vista del módulo. La UI real vive en el módulo, no en `app/`.
2. Cada módulo declara un **manifiesto** (`<id>.module.ts`) con `defineModule({...})`. El manifiesto dice quién es el módulo (id, título, ruta, ícono, permisos) y dónde aparece en el nav.
3. El módulo se **registra** en una sola línea en `src/config/modules.ts`. A partir de ahí, navegación (sidebar), catálogo del home y chequeos de permisos se derivan del registro — ese es el costo total de cablear un módulo nuevo.
4. Un módulo **nunca** importa los internos de otro. Expone su superficie pública por su `index.ts` (barrel). Otros módulos y `app/` importan desde ahí — **excepto** `server/queries.ts` y los schemas server-only: esos se importan con ruta profunda (`@/modules/<id>/server/queries`) directamente desde el `page.tsx` de la ruta, nunca a través del barrel. El manifiesto (`<id>.module.ts`) lo consumen componentes de nav en cliente (`AppSidebar`, `MainNav`, `MobileBottomNav`); si el barrel también reexportara `server/queries.ts` (que trae `import "server-only"`), esa importación envenenaría todo bundle de cliente que solo quiere el ícono del manifiesto — `next build` falla con "'server-only' cannot be imported from a Client Component module". Ver `.claude/ARCHITECTURE.md`.

## Anatomía de un módulo

`noticias/` es la **implementación de referencia** — muestra todas las capas. Los demás módulos arrancan mínimos (manifiesto + vista + barrel) y crecen agregando solo las capas que necesiten.

```
src/modules/<id>/
  <id>.module.ts        # manifiesto (defineModule) — REQUERIDO
  index.ts              # superficie pública (barrel) — REQUERIDO
  components/           # UI del módulo (la vista de ruta y sub-componentes)
    <id>-view.tsx       # vista que consume la ruta — REQUERIDO
  types.ts              # tipos de dominio                (agregar si aplica)
  schemas/              # esquemas zod (validación cliente + servidor)  (agregar si aplica)
  server/               # 'server-only': acceso a datos y Server Actions (agregar si aplica)
    queries.ts          #   lecturas (llamadas desde Server Components)
    actions.ts          #   mutaciones ('use server') — SIEMPRE validan auth+permiso al inicio
  hooks/                # hooks de cliente (TanStack Query, etc.)        (agregar si aplica)
```

## Reglas

- **Servidor vs. cliente:** las lecturas en Server Components llaman a `server/queries.ts` directo; los Client Components usan hooks de `hooks/`. Nunca mezclar (`server/queries.ts` importa `server-only`, así que mezclarlos falla en build).
- **Mutaciones:** toda Server Action verifica autenticación y permiso ANTES de trabajar. Los permisos salen de `src/config/permissions.ts`.
- **Datos:** el acceso a datos vive en `server/` — así la elección de CMS/DB queda aislada por módulo, no derramada en componentes. Mientras no hay CMS, `server/queries.ts` lee de un dataset mock propio del módulo (p. ej. `mock/*.mock.ts`); las firmas de esas funciones ya están pensadas para Strapi, así que conectar el CMS real es sustituir el cuerpo de esas funciones, no su forma. Cada módulo de datos documenta su content-type y su plan de integración en `.claude/STRAPI.md`.
- **Estilos:** usar tokens/utilidades de `.claude/DESIGN.md` (sistema monocromo). Nada de hex/px crudos.
- **Admin:** la vista de administración de un módulo (CRUD) consume la misma capa de datos del módulo, pero se enruta bajo `src/app/admin/<id>/`. El panel admin es una superficie aparte (ver `src/modules/admin/`).

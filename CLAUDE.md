# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

This project uses **pnpm** (`pnpm-lock.yaml` is the lockfile — do not run `npm install` or `yarn`, it will create a competing lockfile).

```bash
pnpm install    # install dependencies
pnpm dev        # dev server (Turbopack) on http://localhost:3000
pnpm build      # production build; also runs the TypeScript check
pnpm lint       # eslint (flat config, no args needed)
pnpm start      # serve the production build (requires pnpm build first)
```

There is no test runner configured yet. `pnpm build` is the only type-check path — there is no standalone `tsc` script (`noEmit` is set in tsconfig, so use `pnpm exec tsc --noEmit` if a faster check is needed).

## Design system

`docs/DESIGN.md` is the visual contract: tokens, component grammar, and non-negotiable rules. Read it before writing any UI. Two rules bite immediately: the palette's `--neutral-500` (#919189) fails WCAG AA as text on light surfaces (3.17:1 on white, 2.84:1 on `--canvas-subtle`) so it is a border/icon color only, and components consume semantic tokens — an inline hex is a bug. Any new color pairing gets verified with a contrast checker and recorded with its measured ratio in §3.5 before it enters the doc.

## Git workflow

This branch is the **base configuration** of the repo. Feature work happens on sub-branches cut from it, never directly here.

Commit messages are **English conventional commits** (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, with an optional scope like `feat(layout):`). The UI copy itself is Spanish (`es-CO`) — that split is deliberate: commits are for the team's tooling, the interface is for the people using it.

## Architecture

- **Next.js 16 with the App Router.** `src/app/layout.tsx` is the root layout: it sets `lang="es-CO"`, loads the brand font via `next/font`, and runs the inline theme script. `src/app/(app)/layout.tsx` holds the providers (React Query, theme, toasts) for everything behind the session, and two shells hang from it:
  - `(app)/(general)/` is the **general view** for everyone signed in: the intranet ported as is from INTRANET-JDH-UI (inicio, noticias, SIG (the former documentos), directorio, organigrama, catálogo, autogestión, inducción, ayuda, marca, perfil). Its code lives in `src/intranet/` with its own conventions (shadcn/radix, motion, server-rendered pages calling the API with the forwarded cookies) and its own design tokens, active only under `.intranet-shell`. Read `docs/intranet-port.md` before touching it; do not restyle it with the workspace's DESIGN.md.
  - `(app)/(workspace)/` is the **workspace**: `/workspace` is the guide to the workspace, with the area selector in the sidebar (the only way in from the general view), then `[area]/...`, sidebar + header + scrollable main (DESIGN.md §5.3). Access is checked on the server: the workspace layout requires a session and the `[area]` layout asks the API for the area (401 → `/login`, 403 → `/workspace?sin-acceso=area`, 404). `AreaGate` then hides and redirects module by module from `my_modules`, the permissions the person's area role grants (`permission` key on each `ModuleItem`). Read `docs/workspace-access.md`.
  - Nothing lives outside those two. Platform administration is the TI module `/ti/administracion/{areas,modulos,usuarios,directorio,sedes,vendedores,maestros}` (`adminOnly`, guarded by `AdminGate`); `/administracion/*` redirects there from `next.config.ts`.
  - Routes are directories containing `page.tsx`; API routes are `route.ts` (`/api/health` is the container healthcheck). Components are Server Components by default: add `"use client"` only where browser APIs, state, or event handlers are actually needed.
- **`@/*` maps to `src/*`** (tsconfig `paths`). Use it instead of deep relative imports.
- **Feature-first structure.** `src/shared/` holds what more than one module needs (`components/ui`, `components/layout`, `config`, `store`, `lib`). Per-module code goes in `src/features/<module>/` with `components/`, `hooks/`, `services/`, `types/`. A component two modules need is promoted to `shared/`, never copied.
- **Areas come from the API; modules from `src/shared/config/areas.config.ts`.** `GET /areas` (already filtered by access) drives the switcher, and every area route lives under `src/app/(app)/(workspace)/[area]/`, gated by `AreaGate` (404 for an unknown slug, a no-access screen for 403). Any API module can be switched on in any area (`/ti/administracion/modulos`), so each one is a template in `MODULE_TEMPLATES`, generated for every slug; `my_modules` decides which ones show. Rows that belong to one area only (TI's support and administration, the "Próximamente" placeholders) live in `AREA_ROWS`. A module with `available: false` renders as a disabled "Próximamente" row, not a link: nav items must never point at a route that does not exist. Adding a module means adding its template *and* its `[area]/<segment>/page.tsx`, which calls `await requireModule(area, segment)` (server: 404 for a route no module claims, back to the area when it is off or not granted). All HTTP goes through `src/shared/lib/api-client.ts`.
- **The commercial map is the one screen that is not a table.** `src/features/commercial-map` draws prospects, zones and routes with MapLibre over a `colombia.pmtiles` file and Centrale Sans glyphs that live in `public/mapas/`, outside git. Read `docs/mapa-comercial.md` (how to build the basemap, how the views share one map) and `docs/DESIGN.md` §15 before touching it. Map colors come from the `--map-*` tokens, resolved at runtime: MapLibre cannot read `var()`.
- **Theme is class-based.** `.dark` on `<html>`, driven by `useUiStore`, persisted to `localStorage` under `jdh-theme`, and replayed by the inline script in the root layout before first paint. Both themes are fully styled and must stay that way.
- **Tailwind CSS v4, CSS-first.** There is no `tailwind.config.*`. Design tokens live in `@theme inline` inside `src/app/globals.css`, and `postcss.config.mjs` wires up `@tailwindcss/postcss`. Add or change colors/fonts by editing the CSS custom properties in `globals.css`, not by creating a JS config.
- **Turbopack is the bundler for both dev and build.** Webpack-specific config or loaders will not apply; put build config in `next.config.ts`.

## Version caveat

`next@16` differs substantially from older Next.js. Before writing routing, caching, data-fetching, or config code, read the relevant guide in `node_modules/next/dist/docs/` rather than relying on remembered Next.js conventions (see AGENTS.md above).

## Environment notes

`pnpm-workspace.yaml` exists only to hold `allowBuilds: unrs-resolver: true`. pnpm blocks postinstall scripts by default, and `unrs-resolver` (a transitive dependency of `eslint-config-next`) needs its postinstall to build a native binding; without the approval every `pnpm install` exits 1 with `ERR_PNPM_IGNORED_BUILDS`. Note that on pnpm 11 this setting lives in `pnpm-workspace.yaml` — the old `pnpm.onlyBuiltDependencies` key in `package.json` is ignored.

<!-- antislop:start -->
## antislop

For UI, copy, accessibility, mobile layout, or code-comment work, invoke the `antislop:antislop` skill (the core filter) and then the skill for the task:

- UI / visual: `antislop:antislop-ui`
- Copy & text: `antislop:antislop-copywriting`
- People / accessibility: `antislop:antislop-human`
- Mobile / responsive: `antislop:antislop-layoutmobile`
- Code comments: `antislop:antislop-code`

These are installed as plugin skills (invoked with the Skill tool), not as files in this repo, so the paths in the stock antislop pointer block do not apply here.

Design direction is `docs/DESIGN.md` — antislop is the filter, that file is the direction. Dials for this codebase: **ENERGY 1 / RHYTHM 1 / MOTION 1** (an internal tool used all day; uniformity and stillness are the point, not a shortfall).

Before starting, ask the user when antislop applies: during the work, or after it is done.
<!-- antislop:end -->

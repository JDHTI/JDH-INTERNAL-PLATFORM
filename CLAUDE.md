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

- **Next.js 16 with the App Router.** `src/app/layout.tsx` is the root layout: it sets `lang="es-CO"`, loads Inter via `next/font`, and runs the inline theme script. `src/app/(app)/layout.tsx` is the application shell (sidebar + header + scrollable main). Routes are directories containing `page.tsx`; API routes are `route.ts`. Components are Server Components by default — add `"use client"` only where browser APIs, state, or event handlers are actually needed.
- **`@/*` maps to `src/*`** (tsconfig `paths`). Use it instead of deep relative imports.
- **Feature-first structure.** `src/shared/` holds what more than one module needs (`components/ui`, `components/layout`, `config`, `store`, `lib`). Per-module code goes in `src/features/<module>/` with `components/`, `hooks/`, `services/`, `types/`. A component two modules need is promoted to `shared/`, never copied.
- **Navigation comes from `src/shared/config/modules.config.ts`.** A module with `available: false` renders as a disabled "Próximamente" row, not a link — nav items must never point at a route that does not exist. Adding a module means adding its entry *and* its `page.tsx`.
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

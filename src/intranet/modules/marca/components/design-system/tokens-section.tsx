import {
  durationTokens,
  neutralTokens,
  radiusTokens,
  spaceTokens,
  typeScaleTokens,
  zIndexTokens,
} from "../../design-system-content"
import { SectionBlock, SubBlock } from "../section-block"

/**
 * Documentación viva de los tokens.
 *
 * Cada muestra se pinta con `var(--token)`, nunca con el valor copiado: si
 * `globals.css` cambia, esta página cambia con él y no puede quedar
 * desactualizada. Es la razón de que use `style` inline — el nombre del token
 * es dato en tiempo de ejecución, no una clase que Tailwind pueda generar.
 */
export function TokensSection() {
  return (
    <SectionBlock
      id="tokens"
      eyebrow="Tokens"
      title="El sistema en vivo"
      description="Todo lo que sigue se renderiza leyendo las variables CSS reales de la aplicación. No hay valores copiados."
    >
      <SubBlock label="Rampa de neutrales">
        <div className="rounded-[var(--jdh-radius-md)] border border-[var(--color-paper-border)] bg-[var(--color-paper)] p-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {neutralTokens.map((token) => (
              <div key={token.name} className="space-y-2">
                <div
                  aria-hidden
                  style={{ backgroundColor: `var(${token.name})` }}
                  className="h-16 w-full rounded-[var(--jdh-radius-sm)] border border-[var(--neutral-300)]"
                />
                <p className="font-mono text-[10px] break-all text-[var(--color-on-paper)]">
                  {token.name}
                </p>
                <p className="text-[10px] leading-snug text-[var(--color-on-paper-muted)]">
                  {token.note}
                </p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          La capa primitiva no se invierte con el tema: lo que cambia en oscuro
          es la capa semántica que mapea sobre ella.
        </p>
      </SubBlock>

      <SubBlock label="Escala tipográfica">
        <div className="divide-y divide-border overflow-hidden rounded-[var(--jdh-radius-md)] border border-border">
          {typeScaleTokens.map((token) => (
            <div
              key={token.name}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-4"
            >
              <p
                style={{ fontSize: `var(${token.name})` }}
                className="leading-tight font-medium tracking-tight"
              >
                {token.label}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                {token.name}
              </p>
            </div>
          ))}
        </div>
      </SubBlock>

      <SubBlock label="Espacio · base 4px">
        <div className="space-y-2 rounded-[var(--jdh-radius-md)] border border-border p-5">
          {spaceTokens.map((token) => (
            <div key={token} className="flex items-center gap-4">
              <span className="w-28 shrink-0 font-mono text-xs text-muted-foreground">
                {token}
              </span>
              <span
                aria-hidden
                style={{ width: `var(${token})` }}
                className="h-3 rounded-[var(--jdh-radius-none)] bg-foreground"
              />
            </div>
          ))}
        </div>
      </SubBlock>

      <SubBlock label="Radios">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {radiusTokens.map((token) => (
            <div key={token.name} className="space-y-2">
              <div
                aria-hidden
                style={{ borderRadius: `var(${token.name})` }}
                className="h-16 w-full border border-[var(--color-border-strong)] bg-muted"
              />
              <p className="text-xs text-muted-foreground">{token.label}</p>
              <p className="font-mono text-[10px] break-all text-muted-foreground">
                {token.name}
              </p>
            </div>
          ))}
        </div>
      </SubBlock>

      <SubBlock label="Movimiento">
        <div className="grid gap-4 sm:grid-cols-3">
          {durationTokens.map((token) => (
            <div
              key={token.name}
              className="group space-y-3 rounded-[var(--jdh-radius-md)] border border-border p-5"
            >
              <p className="text-sm font-medium">{token.label}</p>
              <div className="h-2 w-full rounded-full bg-muted">
                <span
                  aria-hidden
                  style={{
                    transitionDuration: `var(${token.name})`,
                    transitionTimingFunction: "var(--ease-standard)",
                  }}
                  className="block h-2 w-2 rounded-full bg-foreground transition-[width] group-hover:w-full motion-reduce:transition-none"
                />
              </div>
              <p className="text-xs text-muted-foreground">{token.usage}</p>
              <p className="font-mono text-[10px] break-all text-muted-foreground">
                {token.name}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Pasa el cursor sobre cada tarjeta para comparar las duraciones. Con
          movimiento reducido activado, la animación no se ejecuta.
        </p>
      </SubBlock>

      <SubBlock label="Capas (z-index)">
        <ol className="divide-y divide-border overflow-hidden rounded-[var(--jdh-radius-md)] border border-border">
          {zIndexTokens.map((token) => (
            <li
              key={token.name}
              className="flex items-center justify-between gap-4 px-5 py-3"
            >
              <span className="text-sm font-medium">{token.label}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {token.name}
              </span>
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted-foreground">
          El orden de la lista es el orden de apilamiento. Nunca se escriben
          z-index crudos: siempre uno de estos tokens.
        </p>
      </SubBlock>
    </SectionBlock>
  )
}

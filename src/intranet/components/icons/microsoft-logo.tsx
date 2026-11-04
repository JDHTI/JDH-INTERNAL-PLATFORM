/**
 * El logo oficial de "Sign in with Microsoft" — 4 cuadros de color, sin texto
 * (los colores son parte de la identidad de marca de Microsoft, no del
 * sistema de diseño JDH, así que no se tocan con el tema/dark mode).
 */
export function MicrosoftLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 21 21"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  )
}

import type { Metadata } from "next";

import { centraleSans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plataforma Interna JDH",
  description:
    "Plataforma interna de Juan D. Hoyos Distribuciones: módulos operativos sobre una intranet unificada.",
};

/**
 * Applies the stored theme before first paint. Without this the page renders
 * light, then snaps to dark once the store hydrates.
 *
 * The public PQRSF form is always light: it is the company's face to
 * customers, not a workspace, so it does not follow the platform's theme. Its
 * popups render in portals outside the page, which is why the theme is decided
 * here for the whole document and not on a wrapper.
 */
const themeScript = `
(function () {
  try {
    var path = window.location.pathname;
    var alwaysLight = path === '/pqrsf' || path.indexOf('/pqrsf/') === 0;
    var stored = localStorage.getItem('jdh-theme');
    var mode = alwaysLight
      ? 'light'
      : stored === 'dark' || stored === 'light'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', mode === 'dark');
    document.documentElement.style.colorScheme = mode;
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-CO" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={centraleSans.variable}>{children}</body>
    </html>
  );
}

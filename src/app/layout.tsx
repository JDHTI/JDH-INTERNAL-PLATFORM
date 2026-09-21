import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

/**
 * Inter, not Arial. Arial is the brand's approved substitute for *generated
 * documents*; the interface has different constraints. Inter ships tabular
 * numerals, without which money columns in a table stop aligning by unit and
 * stop being comparable. See docs/DESIGN.md §4.1.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Plataforma Interna JDH",
  description:
    "Plataforma interna de Juan D. Hoyos Distribuciones: módulos operativos sobre una intranet unificada.",
};

/**
 * Applies the stored theme before first paint. Without this the page renders
 * light, then snaps to dark once the store hydrates.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('jdh-theme');
    var mode = stored === 'dark' || stored === 'light'
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
      <body className={inter.variable}>{children}</body>
    </html>
  );
}

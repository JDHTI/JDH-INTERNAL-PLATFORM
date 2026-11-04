import type { Metadata, Viewport } from "next";

import { siteConfig } from "@/intranet/config/site";

import { centraleSans } from "./fonts";
import "./globals.css";

/**
 * The intranet's metadata, now the platform's. `robots` is noindex: nothing
 * behind the login should reach a search engine even if a URL leaks.
 * `metadataBase` makes the Teams link preview resolve against the public host.
 */
export const metadata: Metadata = {
  metadataBase: process.env.PUBLIC_ORIGIN ? new URL(process.env.PUBLIC_ORIGIN) : undefined,
  title: {
    default: siteConfig.name,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.companyLegal }],
  creator: siteConfig.companyLegal,
  publisher: siteConfig.companyLegal,
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale.replace("-", "_"),
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
  },
  appleWebApp: {
    capable: true,
    title: siteConfig.shortName,
    statusBarStyle: "black",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1D1D1B" },
  ],
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

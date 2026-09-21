import localFont from "next/font/local";

/**
 * Centrale Sans — the official JDH typeface, now licensed for web.
 *
 * It replaces Inter, which was only ever a stand-in chosen because the brand
 * face was not available and Arial has no tabular figures. Centrale Sans does
 * carry `tnum` (verified against the font's GSUB table), so the brand face and
 * the money-column requirement are no longer in conflict.
 *
 * The family ships 300 / 400 / 500 / 700 and no 600. Bold is declared over the
 * `600 700` range so `font-semibold` resolves to the real bold file instead of
 * a synthetic one the browser fakes by smearing the outlines.
 */
export const centraleSans = localFont({
  src: [
    {
      path: "../../public/fonts/centrale-sans-light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/centrale-sans-light-italic.woff2",
      weight: "300",
      style: "italic",
    },
    {
      path: "../../public/fonts/centrale-sans-regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/centrale-sans-regular-italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../public/fonts/centrale-sans-medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      // The file's own metadata says 600, but it is the italic companion to
      // medium, so it is declared at 500 to keep the pair together.
      path: "../../public/fonts/centrale-sans-medium-italic.woff2",
      weight: "500",
      style: "italic",
    },
    {
      path: "../../public/fonts/centrale-sans-bold.woff2",
      weight: "600 700",
      style: "normal",
    },
    {
      path: "../../public/fonts/centrale-sans-bold-italic.woff2",
      weight: "600 700",
      style: "italic",
    },
  ],
  variable: "--font-centrale",
  display: "swap",
  fallback: [
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "system-ui",
    "sans-serif",
  ],
});

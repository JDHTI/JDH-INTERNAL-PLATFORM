import type { AttachmentLimits } from "../types/pqrsf-public.types";

// Every limit comes from the catalog (`limits`), so the form says and checks
// what the server enforces. The server still checks MIME and the real format;
// here the extension is enough to warn before sending.

const MB = 1024 * 1024;

export type EvidenceKind = "image" | "video";

const extensionOf = (file: File) => file.name.split(".").pop()?.toLowerCase() ?? "";

export function kindOf(file: File, limits: AttachmentLimits): EvidenceKind | null {
  const extension = extensionOf(file);
  if (limits.image_extensions.includes(extension)) return "image";
  if (limits.max_videos > 0 && limits.video_extensions.includes(extension)) return "video";
  return null;
}

/** The `accept` of the file picker: both kinds when videos are allowed. */
export function acceptAttribute(limits: AttachmentLimits): string {
  const extensions = [
    ...limits.image_extensions,
    ...(limits.max_videos > 0 ? limits.video_extensions : []),
  ];
  return extensions.map((extension) => `.${extension}`).join(",");
}

// Display casing only: the extensions themselves come from the API.
const DISPLAY_NAMES: Record<string, string> = { webp: "WebP", webm: "WebM" };

function extensionList(extensions: string[]): string {
  const names = extensions.map((extension) => DISPLAY_NAMES[extension] ?? extension.toUpperCase());
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} o ${names.at(-1)}` : names.join("");
}

/** The limits in one or two sentences, for the hint under the field. */
export function describeLimits(limits: AttachmentLimits): string {
  const images =
    `Fotos ${extensionList(limits.image_extensions)}: hasta ${limits.max_images}, ` +
    `de ${limits.max_image_mb} MB cada una y ${limits.max_total_image_mb} MB en total.`;
  if (limits.max_videos === 0) return images;
  const videos =
    limits.max_videos === 1
      ? `Un video ${extensionList(limits.video_extensions)} de hasta ${limits.max_video_mb} MB.`
      : `Hasta ${limits.max_videos} videos ${extensionList(limits.video_extensions)} de ${limits.max_video_mb} MB cada uno.`;
  return `${images} ${videos}`;
}

/** The first problem with a set of files, or null when the set can be sent. */
export function validateFiles(files: File[], limits: AttachmentLimits): string | null {
  const { images, videos, unknown } = splitEvidence(files, limits);

  if (unknown.length > 0) {
    const allowed = limits.max_videos > 0
      ? `${extensionList(limits.image_extensions)} para fotos o ${extensionList(limits.video_extensions)} para video`
      : extensionList(limits.image_extensions);
    return `${unknown[0].name} no es un archivo permitido. Usa ${allowed}.`;
  }

  if (images.length > limits.max_images) {
    return `Puedes adjuntar máximo ${limits.max_images} fotos.`;
  }
  const largeImage = images.find((file) => file.size > limits.max_image_mb * MB);
  if (largeImage) return `${largeImage.name} pesa más de ${limits.max_image_mb} MB.`;
  const imagesSize = images.reduce((total, file) => total + file.size, 0);
  if (imagesSize > limits.max_total_image_mb * MB) {
    return `Las fotos suman más de ${limits.max_total_image_mb} MB. Quita alguna.`;
  }

  if (videos.length > limits.max_videos) {
    return limits.max_videos === 1
      ? "Puedes adjuntar un solo video. Quita el que ya elegiste para cambiarlo."
      : `Puedes adjuntar máximo ${limits.max_videos} videos.`;
  }
  const largeVideo = videos.find((file) => file.size > limits.max_video_mb * MB);
  if (largeVideo) {
    return `${largeVideo.name} pesa más de ${limits.max_video_mb} MB. Graba un video más corto.`;
  }
  return null;
}

/** Files by kind, as the form sends them (`images`, `videos`). */
export function splitEvidence(files: File[], limits: AttachmentLimits) {
  const images: File[] = [];
  const videos: File[] = [];
  const unknown: File[] = [];
  for (const file of files) {
    const kind = kindOf(file, limits);
    (kind === "image" ? images : kind === "video" ? videos : unknown).push(file);
  }
  return { images, videos, unknown };
}

/** Adds files to the ones already chosen, skipping the ones picked twice. */
export function mergeFiles(current: File[], incoming: File[]): File[] {
  const key = (file: File) => `${file.name}|${file.size}|${file.lastModified}`;
  const seen = new Set(current.map(key));
  return [...current, ...incoming.filter((file) => !seen.has(key(file)))];
}

export function formatFileSize(bytes: number) {
  if (bytes < MB) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / MB).toLocaleString("es-CO", { maximumFractionDigits: 1 })} MB`;
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_TOTAL_FILE_SIZE = 25 * 1024 * 1024;
export const MAX_FILE_COUNT = 5;
export const ACCEPT_ATTRIBUTE = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

const ACCEPTED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const ACCEPTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** The first problem with a set of files, or null when the set can be sent. */
export function validateFiles(files: File[]): string | null {
  if (files.length > MAX_FILE_COUNT) {
    return `Selecciona máximo ${MAX_FILE_COUNT} archivos.`;
  }

  let totalSize = 0;
  for (const file of files) {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !ACCEPTED_EXTENSIONS.has(extension)) {
      return `${file.name} no es una imagen permitida. Usa JPG, JPEG, PNG o WebP.`;
    }
    if (file.type && !ACCEPTED_MIME_TYPES.has(file.type.toLowerCase())) {
      return `${file.name} tiene un tipo MIME no permitido.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} supera el límite de 5 MiB.`;
    }
    totalSize += file.size;
  }

  if (totalSize > MAX_TOTAL_FILE_SIZE) {
    return "El tamaño total de los archivos no puede superar 25 MiB.";
  }
  return null;
}

/** Adds files to the ones already chosen, skipping the ones picked twice. */
export function mergeFiles(current: File[], incoming: File[]): File[] {
  const key = (file: File) => `${file.name}|${file.size}|${file.lastModified}`;
  const seen = new Set(current.map(key));
  return [...current, ...incoming.filter((file) => !seen.has(key(file)))];
}

export function formatFileSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

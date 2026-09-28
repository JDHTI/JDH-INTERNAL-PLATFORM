/**
 * Single HTTP client for internal-platform-api. The session is the API's
 * Entra SSO: tokens live in HttpOnly cookies the browser attaches on its own,
 * so every request only has to send credentials. With AUTH_DEV_BYPASS on, a
 * request without cookies acts as the API's development administrator.
 */
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"
).replace(/\/+$/, "");

/** Where the browser starts the SSO flow when the session is missing. */
export const LOGIN_URL = `${API_URL}/auth/login`;

export const PROFILE_PHOTO_URL = `${API_URL}/auth/me/photo`;

export async function logoutSession(): Promise<void> {
  await apiFetch<void>("/auth/logout", { method: "POST" });
}

/** The API answers every error with `{"detail": "..."}` in Spanish. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

/**
 * FastAPI returns `detail` as a string for domain errors and as a list of
 * issues for 422 validation errors. Both end up as one readable sentence.
 */
function readDetail(body: unknown, status: number): string {
  // The identity module answers 401 in English; the session message is ours.
  if (status === 401) return "Tu sesión no es válida o venció. Vuelve a iniciar sesión.";
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: unknown };
    if (typeof first?.msg === "string") return first.msg;
  }
  return "No se pudo completar la solicitud. Intenta de nuevo.";
}

/** An array repeats the key (`status_id=a&status_id=b`), as FastAPI expects. */
export type Query = Record<
  string,
  string | number | boolean | string[] | undefined | null
>;

interface ApiRequest extends Omit<RequestInit, "body"> {
  query?: Query;
  /** Plain objects are sent as JSON; FormData is sent as multipart. */
  body?: unknown;
}

function buildUrl(path: string, query: Query | undefined): URL {
  const url = new URL(API_URL + path);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, item);
    } else if (value !== undefined && value !== null && value !== "" && value !== false) {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

/** A file the API streams, with the name its Content-Disposition gives. */
export async function apiBlob(
  path: string,
  query?: Query
): Promise<{ blob: Blob; filename: string | null }> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), { credentials: "include" });
  } catch {
    throw new ApiError(
      0,
      "No hay conexión con la plataforma. Revisa tu red e intenta de nuevo."
    );
  }
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new ApiError(response.status, readDetail(payload, response.status));
  }

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  return {
    blob: await response.blob(),
    filename: encoded ? decodeURIComponent(encoded) : null,
  };
}

/**
 * Hands a streamed file (CSV export, attachments) to the browser as a
 * download. Going through fetch instead of a plain link keeps the API's
 * error message on screen instead of navigating to raw JSON.
 */
export async function apiDownload(
  path: string,
  { query, fallbackName }: { query?: Query; fallbackName: string }
): Promise<void> {
  const { blob, filename } = await apiBlob(path, query);
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename ?? fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next tick: some browsers start reading the blob only
  // after the click handler returns.
  setTimeout(() => URL.revokeObjectURL(href), 0);
}

export async function apiFetch<T>(
  path: string,
  { query, body, headers, ...init }: ApiRequest = {}
): Promise<T> {
  const url = buildUrl(path, query);

  const isForm = body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      // The SSO cookies belong to the API's origin; without this the browser
      // leaves them out of cross-origin requests.
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body !== undefined && !isForm
          ? { "Content-Type": "application/json" }
          : {}),
        ...headers,
      },
      body:
        body === undefined
          ? undefined
          : isForm
            ? body
            : JSON.stringify(body),
    });
  } catch {
    // fetch only rejects when the request never got an answer.
    throw new ApiError(
      0,
      "No hay conexión con la plataforma. Revisa tu red e intenta de nuevo."
    );
  }

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, readDetail(payload, response.status));
  }
  return payload as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.detail
    : "Ocurrió un error inesperado. Intenta de nuevo.";
}

/**
 * Single HTTP client for internal-platform-api. The session is the API's
 * Entra SSO: tokens live in HttpOnly cookies the browser attaches on its own,
 * so every request only has to send credentials. With AUTH_DEV_BYPASS on, a
 * request without cookies acts as the API's development administrator.
 */
const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"
).replace(/\/+$/, "");

/** Where the browser starts the SSO flow when the session is missing. */
export const LOGIN_URL = `${API_URL}/auth/login`;

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

type Query = Record<string, string | number | undefined | null>;

interface ApiRequest extends Omit<RequestInit, "body"> {
  query?: Query;
  /** Plain objects are sent as JSON; FormData is sent as multipart. */
  body?: unknown;
}

export async function apiFetch<T>(
  path: string,
  { query, body, headers, ...init }: ApiRequest = {}
): Promise<T> {
  const url = new URL(API_URL + path);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

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

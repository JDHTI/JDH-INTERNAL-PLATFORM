import { PLACEHOLDER_USER } from "@/shared/config/session.mock";

/**
 * Single HTTP client for internal-platform-api. Every request goes through
 * `apiFetch`, so swapping the dev identity header for the Entra bearer token
 * is a change to `authHeaders` and nothing else.
 */
const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"
).replace(/\/+$/, "");

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

function authHeaders(): Record<string, string> {
  // TODO(entra): replace with `Authorization: Bearer <access token>`. The API
  // accepts this header only while AUTH_DEV_BYPASS is on.
  return { "X-Dev-User-Email": PLACEHOLDER_USER.email };
}

/**
 * FastAPI returns `detail` as a string for domain errors and as a list of
 * issues for 422 validation errors. Both end up as one readable sentence.
 */
function readDetail(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: unknown };
    if (typeof first?.msg === "string") return first.msg;
  }
  if (status === 401) return "Tu sesión no es válida. Vuelve a iniciar sesión.";
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
      headers: {
        Accept: "application/json",
        ...(body !== undefined && !isForm
          ? { "Content-Type": "application/json" }
          : {}),
        ...authHeaders(),
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

/** Liveness for the container healthcheck and the proxy. It checks this process only, not the API. */
export function GET() {
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}

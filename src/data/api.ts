const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

export class ApiError extends Error {
  readonly status: number;
  readonly fields?: Record<string, string>;

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const headers: Record<string, string> = {};
  if (init?.body !== undefined) {
    headers["content-type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: init?.method ?? "GET",
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Can't reach the CityWeave API. Start it with `npm run dev`.");
  }

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Proxy errors (API not running) come back as plain text.
  }

  if (!response.ok) {
    const err = (body ?? {}) as { error?: string; fields?: Record<string, string> };
    const message =
      err.error ?? (response.status >= 500 ? "Can't reach the CityWeave API. Start it with `npm run dev`." : `Request failed (${response.status})`);
    throw new ApiError(response.status, message, err.fields);
  }
  return body as T;
}

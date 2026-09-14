// HTTP client for the content API, bound to one base URL and one API key.
//
// Wraps a Playwright `APIRequestContext` supplied by the caller (a worker-scoped fixture in
// Phase 7) instead of owning one: the context is what carries the connection pool, cookie jar
// and proxy settings, so one per worker is both correct and cheap — the same reasoning behind
// the shared `requests.Session` in the Python original.

import { type APIRequestContext, type APIResponse, type TestInfo, test } from "@playwright/test";

type FetchOptions = NonNullable<Parameters<APIRequestContext["fetch"]>[1]>;

/** Playwright's multipart payload shape, reused verbatim so file uploads stay type-checked. */
export type MultipartData = NonNullable<FetchOptions["multipart"]>;

export type QueryParams = Record<string, string | number | boolean>;

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export const DEFAULT_API_KEY_HEADER = "api-key";
export const DEFAULT_TIMEOUT_MS = 60_000;

const METHODS_WITH_BODY: ReadonlySet<string> = new Set(["POST", "PATCH", "PUT"]);

// Header values never worth writing into an HTML report that CI uploads as an artifact.
const SECRET_HEADERS: ReadonlySet<string> = new Set(["authorization", "cookie", "set-cookie"]);
const MASK = "***";

export interface ApiClientOptions {
  apiKey?: string;
  apiKeyHeader?: string;
  timeoutMs?: number;
}

export interface RequestOptions {
  json?: unknown;
  params?: QueryParams;
  multipart?: MultipartData;
  headers?: Record<string, string>;
  /** `false` keeps housekeeping calls (cleanup, reference data) out of the report. */
  attach?: boolean;
}

/**
 * The `TestInfo` of the test currently running, or `undefined` outside one.
 *
 * `test.info()` throws when no test is running, which is exactly the case when a client is
 * driven from a fixture teardown or a script; every reporting helper below degrades to a no-op
 * rather than making the caller care where it is being called from.
 */
export function currentTestInfo(): TestInfo | undefined {
  try {
    return test.info();
  } catch {
    return undefined;
  }
}

/** `test.step()` inside a test, a plain call outside one. */
export async function step<T>(title: string, body: () => Promise<T>): Promise<T> {
  return currentTestInfo() ? test.step(title, body) : body();
}

export async function attachText(name: string, body: string): Promise<void> {
  await currentTestInfo()?.attach(name, { body, contentType: "text/plain" });
}

export async function attachJson(name: string, value: unknown): Promise<void> {
  await currentTestInfo()?.attach(name, {
    body: JSON.stringify(value, null, 2),
    contentType: "application/json",
  });
}

function shellQuote(value: string): string {
  // POSIX single-quote escaping: end the quoted run, emit a backslash-escaped quote, reopen.
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function maskSecrets(
  headers: Record<string, string>,
  apiKeyHeader: string,
): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    const lower = name.toLowerCase();
    masked[name] = SECRET_HEADERS.has(lower) || lower === apiKeyHeader.toLowerCase() ? MASK : value;
  }
  return masked;
}

export function withQuery(url: string, params?: QueryParams): string {
  if (!params || Object.keys(params).length === 0) {
    return url;
  }
  const query = new URLSearchParams(
    Object.entries(params).map(([key, value]): [string, string] => [key, String(value)]),
  );
  return `${url}?${query.toString()}`;
}

/**
 * A copy-pasteable curl reproduction of a request.
 *
 * This plus `testInfo.attach()` is the entire replacement for the Python project's
 * `reporting/attachments.py` module and its `curlify` dependency — Playwright's trace viewer
 * already records headers, timings and the network waterfall (see PLAN.md §2.3, improvements
 * #3 and #4), so only the human-runnable repro line is still worth writing by hand.
 */
export function toCurl(
  method: HttpMethod,
  url: string,
  headers: Record<string, string>,
  body?: unknown,
): string {
  const parts = [`curl -X ${method} ${shellQuote(url)}`];
  for (const [name, value] of Object.entries(headers)) {
    parts.push(`-H ${shellQuote(`${name}: ${value}`)}`);
  }
  if (body !== undefined) {
    parts.push(`-H ${shellQuote("content-type: application/json")}`);
    parts.push(`-d ${shellQuote(JSON.stringify(body))}`);
  }
  return parts.join(" \\\n  ");
}

export class ApiClient {
  readonly baseUrl: string;
  readonly timeoutMs: number;

  private readonly context: APIRequestContext;
  private readonly apiKey: string | undefined;
  private readonly apiKeyHeader: string;

  constructor(context: APIRequestContext, baseUrl: string, options: ApiClientOptions = {}) {
    this.context = context;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.apiKeyHeader = options.apiKeyHeader ?? DEFAULT_API_KEY_HEADER;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  get defaultHeaders(): Record<string, string> {
    return this.apiKey ? { [this.apiKeyHeader]: this.apiKey } : {};
  }

  /** Same base URL and same request context, no credentials. Used by negative tests. */
  withoutAuth(): ApiClient {
    return new ApiClient(this.context, this.baseUrl, {
      apiKeyHeader: this.apiKeyHeader,
      timeoutMs: this.timeoutMs,
    });
  }

  url(path: string): string {
    return `${this.baseUrl}/${path.replace(/^\/+/, "")}`;
  }

  async request(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {},
  ): Promise<APIResponse> {
    const { json, params, multipart, headers, attach = true } = options;
    const url = this.url(path);
    const sentHeaders = { ...this.defaultHeaders, ...headers };
    const hasBody = json !== undefined && METHODS_WITH_BODY.has(method);

    const send = (): Promise<APIResponse> =>
      this.context.fetch(url, {
        method,
        headers: sentHeaders,
        timeout: this.timeoutMs,
        // Status assertions belong to the test, not to the transport: a 404 is a valid outcome.
        failOnStatusCode: false,
        ...(json !== undefined ? { data: json as FetchOptions["data"] } : {}),
        ...(params ? { params } : {}),
        ...(multipart ? { multipart } : {}),
      });

    if (!attach || !currentTestInfo()) {
      return send();
    }

    return test.step(`${method} ${path}`, async () => {
      const response = await send();
      await attachText(
        `curl ${method} ${path}`,
        toCurl(
          method,
          withQuery(url, params),
          maskSecrets(sentHeaders, this.apiKeyHeader),
          hasBody ? json : undefined,
        ),
      );
      if (hasBody) {
        await attachJson("Request body", json);
      }
      return response;
    });
  }

  get(path: string, options: RequestOptions = {}): Promise<APIResponse> {
    return this.request("GET", path, options);
  }

  post(path: string, json?: unknown, options: RequestOptions = {}): Promise<APIResponse> {
    return this.request("POST", path, { ...options, json });
  }

  patch(path: string, json?: unknown, options: RequestOptions = {}): Promise<APIResponse> {
    return this.request("PATCH", path, { ...options, json });
  }

  put(path: string, json?: unknown, options: RequestOptions = {}): Promise<APIResponse> {
    return this.request("PUT", path, { ...options, json });
  }

  delete(path: string, options: RequestOptions = {}): Promise<APIResponse> {
    return this.request("DELETE", path, options);
  }
}

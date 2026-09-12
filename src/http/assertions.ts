// Assertions over HTTP responses. Every failure message says where it came from and what the
// body was, so a CI log is enough to diagnose without re-running.

import { expect } from "@playwright/test";
import type { z } from "zod";
import { attachJson, currentTestInfo, step } from "./apiClient.js";

const BODY_SNIPPET_LENGTH = 500;

/**
 * The subset of Playwright's `APIResponse` these helpers need.
 *
 * Declaring it structurally (rather than importing `APIResponse`) is what lets the unit tests
 * in `tests/unit/assertions.spec.ts` drive them with a plain object literal — no browser, no
 * network, no mocking library.
 */
export interface ResponseLike {
  status(): number;
  url(): string;
  headers(): Record<string, string>;
  text(): Promise<string>;
}

function snippet(text: string): string {
  return JSON.stringify(text.slice(0, BODY_SNIPPET_LENGTH));
}

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

function parseOrThrow<T extends z.ZodTypeAny>(
  schema: T,
  value: unknown,
  where: string,
): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(
      `Response does not match the schema (${where}):\n${formatIssues(result.error)}`,
    );
  }
  return result.data;
}

/** Parsed body, or an error quoting the raw text. */
export async function responseJson(response: ResponseLike): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Response is not JSON. Body: ${snippet(text)}`);
  }
}

export async function assertStatus(response: ResponseLike, expected: number): Promise<void> {
  const actual = response.status();
  if (actual === expected) {
    return;
  }
  // Only touched on failure: reading the body is pointless work on the happy path.
  const body = snippet(await response.text());
  expect(actual, `${response.url()} returned ${actual}, expected ${expected}. Body: ${body}`).toBe(
    expected,
  );
}

/**
 * Validate an object body, or every item of an array body, against `schema`, and return the
 * parsed value.
 *
 * Returning the parsed data is the point: in TypeScript `(await res.json()) as Foo` is a claim
 * the compiler cannot check, so this is the only place a response becomes genuinely typed
 * (see PLAN.md §2.3, improvement #1).
 */
export async function assertSchema<T extends z.ZodTypeAny>(
  response: ResponseLike,
  schema: T,
): Promise<z.infer<T> | z.infer<T>[]> {
  const body = await responseJson(response);
  if (Array.isArray(body)) {
    return body.map((item, index) =>
      parseOrThrow(schema, item, `item #${index} of ${response.url()}`),
    );
  }
  return parseOrThrow(schema, body, response.url());
}

async function attachResponse(response: ResponseLike): Promise<void> {
  if (!currentTestInfo()) {
    return;
  }
  await attachJson("Response headers", response.headers());
  const text = await response.text();
  try {
    await attachJson("Response body", JSON.parse(text));
  } catch {
    await attachJson("Response body", text);
  }
}

/**
 * Attach the response, check the status and optionally the schema.
 *
 * `204` and empty bodies are accepted as-is; a non-empty body must be JSON.
 */
export async function assertResponse<T extends z.ZodTypeAny>(
  response: ResponseLike,
  status: number,
  schema: T,
): Promise<z.infer<T> | z.infer<T>[] | undefined>;
export async function assertResponse(
  response: ResponseLike,
  status: number,
): Promise<unknown | undefined>;
export async function assertResponse<T extends z.ZodTypeAny>(
  response: ResponseLike,
  status: number,
  schema?: T,
): Promise<unknown> {
  const title = schema ? `Expect ${status} and a body matching the schema` : `Expect ${status}`;
  return step(title, async () => {
    await attachResponse(response);
    await assertStatus(response, status);
    if (status === 204 || (await response.text()) === "") {
      return undefined;
    }
    return schema ? assertSchema(response, schema) : responseJson(response);
  });
}

export async function jsonValue(response: ResponseLike, key: string): Promise<unknown> {
  const body = await responseJson(response);
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error(`Expected a JSON object, got ${Array.isArray(body) ? "array" : typeof body}`);
  }
  if (!(key in body)) {
    throw new Error(
      `Key ${JSON.stringify(key)} is missing in the response: ${JSON.stringify(body)}`,
    );
  }
  return (body as Record<string, unknown>)[key];
}

/**
 * Every key that was sent must be present in what the API returned.
 *
 * Values are not compared: servers normalise rich text, dates and file paths. A missing key,
 * however, means the field was silently dropped — which a schema of optional fields cannot catch.
 */
export function assertEcho(
  created: Record<string, unknown>,
  sent: Record<string, unknown>,
  options: { ignore?: Iterable<string> } = {},
): void {
  const skipped = new Set(options.ignore ?? []);
  const missing = Object.keys(sent).filter((key) => !skipped.has(key) && !(key in created));
  expect(missing, "Fields sent but absent in the response").toEqual([]);
}

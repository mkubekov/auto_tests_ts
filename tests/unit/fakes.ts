// Shared fakes for unit tests. No network, no browser, no `.env`.
//
// Not a `*.spec.ts` file, so Playwright never collects it as a test file.

import type { APIRequestContext, APIResponse } from "@playwright/test";
import type { ResponseLike } from "../../src/http/assertions.js";
import type { ReferenceEntity, ReferenceSource } from "../../src/http/referenceData.js";

export const REQUIRED_ENV: NodeJS.ProcessEnv = {
  API_BASE_URL: "https://api.example.com/api/v3",
  CMS_BASE_URL: "https://cms.example.com",
  API_KEY: "test-key",
  CMS_EMAIL: "qa@example.com",
  CMS_PASSWORD: "test-password",
};

export interface FakeResponseOptions {
  body?: unknown;
  /** Raw body; wins over `body`. */
  text?: string;
  url?: string;
  headers?: Record<string, string>;
}

/** A response with a scripted status and body. Satisfies both `ResponseLike` and `{ status() }`. */
export function fakeResponse(status: number, options: FakeResponseOptions = {}): ResponseLike {
  const { body, text, url = "https://api.example.com/api/v3/content/things" } = options;
  const raw = text ?? (body === undefined ? "" : JSON.stringify(body));
  const headers =
    options.headers ?? (body !== undefined ? { "content-type": "application/json" } : {});
  return {
    status: () => status,
    url: () => url,
    headers: () => headers,
    text: async () => raw,
  };
}

export type FetchOptions = NonNullable<Parameters<APIRequestContext["fetch"]>[1]>;

export interface RecordedCall {
  url: string;
  options: FetchOptions;
}

/**
 * The only `APIRequestContext` method `ApiClient` touches is `fetch`, so a stub implementing
 * just that is enough. The double cast is confined to this one spot: the rest of the suite
 * works with real `ApiClient` instances.
 */
export class FakeRequestContext {
  readonly calls: RecordedCall[] = [];
  private readonly responses: ResponseLike[];

  constructor(...responses: ResponseLike[]) {
    this.responses = responses;
  }

  get context(): APIRequestContext {
    const fetch = async (url: unknown, options: FetchOptions = {}): Promise<APIResponse> => {
      this.calls.push({ url: String(url), options });
      const response = this.responses.shift() ?? fakeResponse(200, { body: {} });
      return response as unknown as APIResponse;
    };
    return { fetch } as unknown as APIRequestContext;
  }

  get last(): RecordedCall {
    const call = this.calls.at(-1);
    if (!call) {
      throw new Error("No request was sent");
    }
    return call;
  }
}

export const STUB_ENTITY: ReferenceEntity = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "stub",
  value: "/stub",
  city: "Stubtown",
};

/** Answers every reference lookup with the same synthetic entity. */
export const stubReferences: ReferenceSource = {
  first: () => ({ ...STUB_ENTITY }),
  value: (_key, field) => STUB_ENTITY[field],
};

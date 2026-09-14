// Reference entities that request models depend on (categories, cities, footer sections...).
//
// Python resolves these synchronously inside pydantic `default_factory`. Here the network is
// async while zod's `.default(fn)` is sync, so the cache is filled up front with `load()` and
// models read it synchronously through `ReferenceSource`.
//
// There is deliberately no module-level singleton: the instance is owned by a worker-scoped
// fixture (Phase 7) and handed to whatever needs it (see PLAN.md §2.3, improvement #5).

import type { RequestOptions } from "./apiClient.js";
import { type ResponseLike, responseJson } from "./assertions.js";

// Where each reference collection lives. Query strings are allowed.
export const DEFAULT_REFERENCE_PATHS = {
  categories: "content/handbooks?type=categories",
  labels: "content/handbooks?type=labels",
  cities: "content/cities",
  footerSections: "content/footer-sections",
  headerCategories: "content/header-categories",
  headerSubcategories: "content/header-subcategories",
} as const satisfies Record<string, string>;

export type ReferenceKey = keyof typeof DEFAULT_REFERENCE_PATHS;

export type ReferenceEntity = Record<string, unknown>;

/** What models consume. Unit tests satisfy it with a plain stub, no HTTP involved. */
export interface ReferenceSource {
  first(key: string): ReferenceEntity;
  value(key: string, field: string): unknown;
}

/** The subset of `ApiClient` needed here, so unit tests can pass an object literal. */
export interface Getter {
  get(path: string, options?: RequestOptions): Promise<ResponseLike>;
}

const BODY_SNIPPET_LENGTH = 200;

function isEntity(value: unknown): value is ReferenceEntity {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Fetches the first item of each reference collection once and caches it.
 *
 * Errors are not swallowed: an empty collection silently turned into a default value produces
 * an obscure 400 much later, far from the cause.
 */
export class ReferenceData implements ReferenceSource {
  private readonly client: Getter;
  private readonly paths: Readonly<Record<string, string>>;
  private readonly cache = new Map<string, ReferenceEntity>();

  constructor(client: Getter, paths: Readonly<Record<string, string>> = DEFAULT_REFERENCE_PATHS) {
    this.client = client;
    this.paths = { ...paths };
  }

  /** Fetch the given collections (all known ones when called without arguments). */
  async load(...keys: string[]): Promise<void> {
    const wanted = keys.length > 0 ? keys : Object.keys(this.paths);
    // Validate everything before the first request, so a typo costs no network round-trip.
    for (const key of wanted) {
      this.pathOf(key);
    }
    for (const key of wanted) {
      if (!this.cache.has(key)) {
        this.cache.set(key, await this.fetch(key));
      }
    }
  }

  first(key: string): ReferenceEntity {
    const path = this.pathOf(key);
    const entity = this.cache.get(key);
    if (!entity) {
      throw new Error(`Reference "${key}" (${path}) is not loaded; await load() first`);
    }
    return entity;
  }

  value(key: string, field: string): unknown {
    const entity = this.first(key);
    if (!(field in entity)) {
      throw new Error(
        `Reference "${key}" has no field "${field}"; fields: ${Object.keys(entity).join(", ")}`,
      );
    }
    return entity[field];
  }

  clear(): void {
    this.cache.clear();
  }

  private pathOf(key: string): string {
    const path = this.paths[key];
    if (path === undefined) {
      const known = Object.keys(this.paths).sort().join(", ");
      throw new Error(`Unknown reference "${key}"; known: ${known}`);
    }
    return path;
  }

  private async fetch(key: string): Promise<ReferenceEntity> {
    const path = this.pathOf(key);
    const response = await this.client.get(path, { attach: false });
    const status = response.status();
    if (status !== 200) {
      const body = (await response.text()).slice(0, BODY_SNIPPET_LENGTH);
      throw new Error(`Reference "${key}": ${status} from ${path}: ${body}`);
    }

    let payload = await responseJson(response);
    if (Array.isArray(payload)) {
      if (payload.length === 0) {
        throw new Error(`Reference "${key}" is empty: nothing to use as a default`);
      }
      payload = payload[0];
    }
    if (!isEntity(payload)) {
      const kind = Array.isArray(payload) ? "array" : payload === null ? "null" : typeof payload;
      throw new Error(`Reference "${key}": unexpected payload ${kind}`);
    }
    return payload;
  }
}

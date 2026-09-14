// Teardown helper: remembers what a test created and deletes it afterwards.

import type { RequestOptions } from "./apiClient.js";

/** The subset of `ApiClient` the stack needs, so unit tests can pass an object literal. */
export interface Deleter {
  delete(path: string, options?: RequestOptions): Promise<{ status(): number }>;
}

export interface CleanupFailure {
  path: string;
  reason: string;
}

// 404 counts as success: the test itself may already have deleted the entity.
const GONE_STATUSES: ReadonlySet<number> = new Set([200, 204, 404]);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Register entity paths as they are created; `run()` deletes them in reverse order.
 *
 * Reverse order matters: a dependent entity (a header) must go before the entity it references
 * (a header category), which is also why deletes run sequentially rather than via `Promise.all`.
 * `run()` never throws, so a cleanup problem cannot mask the assertion that failed the test.
 */
export class CleanupStack {
  private readonly client: Deleter;
  private readonly paths: string[] = [];

  constructor(client: Deleter) {
    this.client = client;
  }

  add(path: string): string {
    this.paths.push(path);
    return path;
  }

  get pending(): readonly string[] {
    return [...this.paths];
  }

  /** Delete everything registered. Resolves with what could not be deleted. */
  async run(): Promise<CleanupFailure[]> {
    const failures: CleanupFailure[] = [];
    const paths = this.paths.splice(0).reverse();
    for (const path of paths) {
      try {
        const response = await this.client.delete(path, { attach: false });
        const status = response.status();
        if (!GONE_STATUSES.has(status)) {
          failures.push({ path, reason: `DELETE returned ${status}` });
        }
      } catch (error) {
        failures.push({ path, reason: `DELETE threw: ${errorMessage(error)}` });
      }
    }
    return failures;
  }
}

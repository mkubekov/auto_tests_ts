// The `test` object every e2e suite imports: settings, HTTP clients, reference data, cleanup,
// an authenticated admin page and the public-site page, wired as Playwright fixtures.
//
// This file is the counterpart of the Python project's `tests/e2e/conftest.py`. Scope is what
// changes: pytest's session scope was per process, Playwright's worker scope is per worker
// process, so the expensive things (request context, CMS login, reference data) are built once
// per worker and the cheap, test-owned things (cleanup stack, pages) once per test.
//
// Nothing here runs during `playwright test --list`: fixtures are instantiated only when a test
// body executes, which is what lets the whole e2e layer be verified structurally without a stand.

import { test as base, type Page } from "@playwright/test";
import type { z } from "zod";
import { loadSettings, type Settings } from "../../src/config/settings.js";
import { faker, runMarker } from "../../src/data/faker.js";
import { ApiClient } from "../../src/http/apiClient.js";
import { responseJson } from "../../src/http/assertions.js";
import { CleanupStack } from "../../src/http/cleanupStack.js";
import { ReferenceData } from "../../src/http/referenceData.js";
import { HttpStatus } from "../../src/models/enums.js";
import { type CreatedEntity, entityString, isEntity } from "../../src/pages/shared.js";
import type { AnySchema, ModuleSpec } from "../../src/registry/moduleSpec.js";
import { MODULES, moduleSpec } from "../../src/registry/modules.js";
import { type CreateContext, type CreatedResult, createEntity } from "./helpers.js";

/** Admin session cookies the CMS sets on login. */
const SESSION_COOKIE = "Authentication";
const AUTH_COOKIES: ReadonlySet<string> = new Set([SESSION_COOKIE, "Refresh"]);

const BODY_SNIPPET_LENGTH = 200;

function requestTimeoutMs(settings: Settings): number {
  return Math.round(settings.requestTimeout.readS * 1000);
}

/** Creates an entity of any module, bound to the current test's cleanup stack. */
export type CreateEntity = <TSchema extends AnySchema>(
  module: ModuleSpec<TSchema>,
  payload?: z.infer<TSchema>,
) => Promise<CreatedResult<TSchema>>;

/** A page-constructor block plus the page template that embeds it. */
export interface BlockOnPage<TSchema extends AnySchema = AnySchema> {
  module: ModuleSpec<TSchema>;
  payload: z.infer<TSchema>;
  created: CreatedEntity;
}

export type PageWithBlock = <TSchema extends AnySchema>(
  module: ModuleSpec<TSchema>,
) => Promise<BlockOnPage<TSchema>>;

export interface E2EWorkerFixtures {
  settings: Settings;
  apiClient: ApiClient;
  anonClient: ApiClient;
  referenceData: ReferenceData;
  cmsCookies: Record<string, string>;
  // biome-ignore lint/suspicious/noConfusingVoidType: Playwright types a value-less auto fixture as `void` — the declared shape of `use()`, not a return type.
  sweepRunEntities: void;
}

export interface E2EFixtures {
  cleanup: CleanupStack;
  create: CreateEntity;
  cmsPage: Page;
  sitePage: Page;
  pageWithBlock: PageWithBlock;
}

export const test = base.extend<E2EFixtures, E2EWorkerFixtures>({
  // -- configuration and HTTP --------------------------------------------------------

  settings: [
    // biome-ignore lint/correctness/noEmptyPattern: Playwright reads a fixture's dependencies off this pattern, so an empty one is how a fixture declares it has none.
    async ({}, use) => {
      const settings = loadSettings();
      // Python seeded Faker from a pytest hook and printed the seed in the report header.
      // There is no collection phase here, so the worker seeds before anything generates data;
      // an unset seed leaves faker random, exactly as before.
      if (settings.fakerSeed !== undefined) {
        faker.seed(settings.fakerSeed);
      }
      await use(settings);
    },
    { scope: "worker" },
  ],

  // One request context per worker: it owns the connection pool and the cookie jar, so sharing
  // it is both correct and what makes a suite of many small calls cheap.
  apiClient: [
    async ({ playwright, settings }, use) => {
      const context = await playwright.request.newContext();
      await use(
        new ApiClient(context, settings.apiUrl, {
          apiKey: settings.apiKey,
          timeoutMs: requestTimeoutMs(settings),
        }),
      );
      await context.dispose();
    },
    { scope: "worker" },
  ],

  anonClient: [
    async ({ apiClient }, use) => {
      await use(apiClient.withoutAuth());
    },
    { scope: "worker" },
  ],

  // Primed once per worker rather than lazily: zod's defaults are synchronous, so a schema
  // cannot await a lookup while it builds a payload (see README §Improvements, improvement #5). The
  // cost is one round-trip per collection; the gain is that an empty collection fails here,
  // naming the reference, instead of surfacing as a 400 from an unrelated POST.
  referenceData: [
    async ({ apiClient }, use) => {
      const references = new ReferenceData(apiClient);
      await references.load();
      await use(references);
    },
    { scope: "worker" },
  ],

  cleanup: async ({ apiClient }, use, testInfo) => {
    const stack = new CleanupStack(apiClient);
    await use(stack);
    const failures = await stack.run();
    if (failures.length > 0) {
      // An annotation rather than a log line: it travels into the HTML report, where whoever
      // reads the failure is already looking.
      testInfo.annotations.push({
        type: "cleanup",
        description: failures.map(({ path, reason }) => `${path}: ${reason}`).join("; "),
      });
    }
  },

  create: async ({ apiClient, referenceData, cleanup }, use) => {
    const context: CreateContext = { client: apiClient, cleanup, refs: referenceData };
    await use((module, payload) => createEntity(context, module, payload));
  },

  /**
   * Delete whatever still carries this run's marker when the worker finishes.
   *
   * A worker fixture rather than `globalTeardown`: the marker comes from `RUN_ID`, which is
   * unique per *process*, and a `globalTeardown` runs in yet another process where that value —
   * and the `apiClient` fixture — would have to be rebuilt from scratch. The sweep is a safety
   * net for entities a crashed test never registered, so it is best-effort throughout.
   */
  sweepRunEntities: [
    async ({ apiClient, settings }, use) => {
      await use();
      if (!settings.globalSearchPath) {
        return;
      }
      const response = await apiClient.get(settings.globalSearchPath, {
        params: { name: runMarker() },
        attach: false,
      });
      if (response.status() !== HttpStatus.OK) {
        return;
      }
      const found = await responseJson(response).catch(() => null);
      if (!isEntity(found)) {
        return;
      }
      for (const [key, items] of Object.entries(found)) {
        const module = (MODULES as Record<string, ModuleSpec | undefined>)[key];
        if (module === undefined || !Array.isArray(items)) {
          continue;
        }
        for (const item of items) {
          if (isEntity(item) && typeof item.id === "string") {
            await apiClient
              .delete(`${module.apiPath}/${item.id}`, { attach: false })
              .catch(() => undefined);
          }
        }
      }
    },
    { scope: "worker", auto: true },
  ],

  // -- browser -----------------------------------------------------------------------

  // Playwright's own options, re-pointed at the settings module so the stand is configured in
  // one place — the direct equivalent of Python overriding pytest-playwright's
  // `connect_options` / `browser_type_launch_args` / `browser_context_args` fixtures.
  connectOptions: [
    async ({ settings }, use) => {
      await use(
        settings.remoteBrowserWs
          ? { wsEndpoint: settings.remoteBrowserWs, timeout: settings.browserTimeoutMs }
          : undefined,
      );
    },
    { scope: "worker" },
  ],

  launchOptions: [
    async ({ launchOptions, settings }, use) => {
      await use({ ...launchOptions, timeout: settings.browserTimeoutMs });
    },
    { scope: "worker" },
  ],

  viewport: async ({ settings }, use) => {
    await use(settings.viewport);
  },

  /** Logged into the admin panel once per worker; every `cmsPage` reuses these cookies. */
  cmsCookies: [
    async ({ playwright, settings }, use) => {
      const context = await playwright.request.newContext();
      const auth = new ApiClient(context, settings.cmsApiUrl, {
        timeoutMs: requestTimeoutMs(settings),
      });
      const response = await auth.post(
        "auth/login",
        { email: settings.cmsEmail, password: settings.cmsPassword },
        { attach: false },
      );
      if (response.status() !== HttpStatus.OK) {
        const body = (await response.text()).slice(0, BODY_SNIPPET_LENGTH);
        throw new Error(`CMS login failed: ${response.status()} ${body}`);
      }

      // Read from the context's cookie jar instead of the response headers: Playwright has no
      // `response.cookies`, and `storageState()` has already parsed every `Set-Cookie`.
      const { cookies: jar } = await context.storageState();
      const cookies = Object.fromEntries(
        jar.filter(({ name }) => AUTH_COOKIES.has(name)).map(({ name, value }) => [name, value]),
      );
      if (!(SESSION_COOKIE in cookies)) {
        throw new Error(`CMS login response carried no ${SESSION_COOKIE} cookie`);
      }

      await use(cookies);
      // The same context still holds the session, so logout needs no cookies of its own.
      await auth.post("auth/logout", undefined, { attach: false }).catch(() => undefined);
      await context.dispose();
    },
    { scope: "worker" },
  ],

  cmsPage: async ({ context, cmsCookies, settings }, use) => {
    // Cookies are bound to `cmsUrl`, not to the host that issued them: the admin API may live
    // on a different origin, and the browser only ever visits the panel.
    await context.addCookies(
      Object.entries(cmsCookies).map(([name, value]) => ({ name, value, url: settings.cmsUrl })),
    );
    await use(await context.newPage());
  },

  sitePage: async ({ page, settings }, use, testInfo) => {
    // `testInfo.skip()` is Playwright's equivalent of `pytest.skip()` inside a fixture: the test
    // is reported as skipped with the reason rather than failing on a missing base URL.
    testInfo.skip(settings.siteUrl === undefined, "SITE_BASE_URL is not configured");
    await use(page);
  },

  /**
   * Create a block of the given type plus a page template that embeds it.
   *
   * Python parametrised this fixture indirectly (`request.param`); a fixture that returns a
   * function is the TypeScript equivalent and keeps the module an ordinary argument, so the
   * suite's loop over `pageBlockModules()` stays type-checked.
   */
  pageWithBlock: async ({ create, referenceData, settings }, use, testInfo) => {
    testInfo.skip(settings.siteUrl === undefined, "SITE_BASE_URL is not configured");
    const pages = moduleSpec("pages");

    await use(async (module) => {
      if (module.blockType === undefined) {
        throw new Error(`Module "${module.key}" is not a page-constructor block`);
      }
      const block = await create(module);
      const pagePayload = pages.schema(referenceData).parse({});
      pagePayload.url = settings.testPagePath.replace(/^\/+|\/+$/g, "");
      const slot = pagePayload.blocks[0];
      if (slot === undefined) {
        throw new Error("Page template payload has no block slot to fill");
      }
      slot.blockType = module.blockType;
      slot.blockTemplateId = entityString(block.created, "id");
      await create(pages, pagePayload);
      return { module, ...block };
    });
  },
});

export { expect } from "@playwright/test";

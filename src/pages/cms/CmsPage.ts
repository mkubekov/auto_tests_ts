// Base page object for admin-panel forms (Ant Design).
//
// The admin panel renders inputs with an `id` equal to the API field name, so locators are
// built from the field name itself. There are no test ids in the markup; that is a constraint
// of the target application, not a choice.
//
// The generic parameter is the payload the form edits. Python's page objects took a bare
// `dict[str, Any]`, so nothing connected a form to the model it fills; `CmsPage<TPayload>` is
// what lets the registry tie a module's schema to its admin form (see PLAN.md §2.3,
// improvement #2), and `createElement(payload)` is checked against that module's fields at
// every call site.

import path from "node:path";
import { expect, type Page, type Response } from "@playwright/test";
import { resourcePath } from "../../data/files.js";
import { CANCEL, DELETE, SAVE, SUCCESS_LOCATOR, SYSTEM_NAME } from "../../data/labels.js";
import { type ApiClient, step } from "../../http/apiClient.js";
import { responseJson } from "../../http/assertions.js";
import { HttpStatus } from "../../models/enums.js";

/** An entity as the API returned it. Keys are decided by the stand, so values stay `unknown`. */
export type CreatedEntity = Record<string, unknown>;

/** Locator of a form input. One helper replaces the per-field locator constants of the original. */
export function field(name: string): string {
  return `[id="${name}"]`;
}

/** Locator of the caption an uploader is anchored at (`<label for="...">`). */
export function fileField(name: string): string {
  return `[for="${name}"]`;
}

/**
 * Rich-text fields come back wrapped in tags (`<p>...</p>`); compare the text only.
 *
 * Python used BeautifulSoup. Node has no DOM, and pulling in an HTML parser for a single
 * assertion is not worth the dependency: the editor emits the markup it was given, so
 * dropping tags and decoding the handful of entities it can produce is enough.
 */
export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}

/**
 * The part of a form that the shared components drive.
 *
 * Components are payload-agnostic, so they take this instead of `CmsPage<TPayload>` and stay
 * usable from every module's page object without threading its generic parameter through.
 */
export type FormPrimitives = Pick<
  CmsPage,
  | "page"
  | "fill"
  | "click"
  | "switch"
  | "check"
  | "upload"
  | "clickDashed"
  | "checkItem"
  | "checkFile"
>;

function isEntity(value: unknown): value is CreatedEntity {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Fluent helpers for admin forms plus the contract every module implements.
 *
 * Every primitive returns `this` so subclasses read like the Python original, but each one is
 * `async`: the TS Playwright API has no synchronous mode, so a chain becomes a sequence of
 * `await`s rather than one expression. Queuing the calls behind the scenes to keep the
 * single-expression form would hide failures in floating promises — not a trade worth making
 * in a test framework, where the stack of the step that failed is the whole point.
 *
 * Subclasses implement `createElement` and `checkCreatedItem`.
 */
export abstract class CmsPage<TPayload = unknown> {
  readonly page: Page;
  createdId: string | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  // -- form primitives ---------------------------------------------------------------

  async fill(caption: string, locator: string, value: unknown): Promise<this> {
    await step(`Fill "${caption}": ${String(value)}`, async () => {
      await this.page.locator(locator).fill(String(value));
    });
    return this;
  }

  async click(caption: string, locator: string): Promise<this> {
    await step(`Click "${caption}"`, async () => {
      await this.page.locator(locator).click();
    });
    return this;
  }

  /** Toggle an Ant `Switch` so that its `aria-checked` matches `active`. */
  async switch(caption: string, locator: string, active: boolean): Promise<this> {
    await step(`Set switch "${caption}" to ${active}`, async () => {
      const element = this.page.locator(locator);
      const isOn = (await element.getAttribute("aria-checked")) === "true";
      if (isOn !== active) {
        await element.click();
      }
    });
    return this;
  }

  /**
   * Toggle an Ant `Checkbox`.
   *
   * Ant renders a real `<input type="checkbox">`, so `setChecked()` reads the state and
   * toggles it in one idempotent call — the class-list check Python needed on the wrapper is
   * an implementation detail Playwright's own API already covers.
   */
  async check(caption: string, locator: string, active: boolean): Promise<this> {
    await step(`Set checkbox "${caption}" to ${active}`, async () => {
      await this.page.locator(locator).setChecked(active);
    });
    return this;
  }

  /** Upload a fixture file through the uploader anchored at its caption label. */
  async upload(caption: string, locator: string, fileName: string): Promise<this> {
    await step(`Upload "${caption}": ${fileName}`, async () => {
      const uploader = this.page.locator(locator).locator("../..");
      await uploader.locator('[type="file"]').setInputFiles(resourcePath(fileName));
      await uploader.getByText(DELETE).waitFor({ state: "visible" });
    });
    return this;
  }

  /** Click an "add item" button; Ant renders those as dashed buttons. */
  async clickDashed(caption: string): Promise<this> {
    await step(`Click "${caption}"`, async () => {
      await this.page.locator(".ant-btn-dashed").getByText(caption).last().click();
    });
    return this;
  }

  async switchTab(caption: string): Promise<this> {
    await step(`Open tab "${caption}"`, async () => {
      await this.page.locator(".ant-tabs-tab").getByText(caption).first().click();
    });
    return this;
  }

  fillName(value: string): Promise<this> {
    return this.fill(SYSTEM_NAME, field("name"), value);
  }

  /**
   * Submit the form and remember the id of the created entity.
   *
   * The listener is removed in `finally`: otherwise it would stay attached to the page and
   * overwrite `createdId` with every later 201. Reading the body is async here where Python's
   * `response.json()` was not, so the listener only records the pending read and `save()`
   * awaits it — dropping it would leave `createdId` unset whenever the body arrives after the
   * success banner.
   */
  async save(): Promise<this> {
    await step("Save", async () => {
      const pending: Promise<void>[] = [];
      const capture = (response: Response): void => {
        if (response.status() === HttpStatus.CREATED) {
          pending.push(this.rememberCreatedId(response));
        }
      };
      this.page.on("response", capture);
      try {
        await this.page.locator('[type="button"]').getByText(SAVE).click();
        await this.page.locator(SUCCESS_LOCATOR).waitFor({ state: "visible" });
      } finally {
        this.page.off("response", capture);
      }
      await Promise.all(pending);
    });
    return this;
  }

  async cancel(): Promise<this> {
    await step("Cancel", async () => {
      await this.page.getByText(CANCEL).click();
    });
    return this;
  }

  private async rememberCreatedId(response: Response): Promise<void> {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return;
    }
    if (isEntity(body) && typeof body.id === "string") {
      this.createdId = body.id;
    }
  }

  // -- assertions --------------------------------------------------------------------

  async checkItem(caption: string, sent: unknown, received: unknown): Promise<this> {
    await step(caption, async () => {
      expect(received, caption).toEqual(sent);
    });
    return this;
  }

  /** Compare a rich-text field ignoring the markup the editor adds. */
  checkText(caption: string, sent: string, receivedHtml: string): Promise<this> {
    return this.checkItem(caption, sent, stripHtml(receivedHtml));
  }

  /** Uploaded files come back as storage paths; only the file name is comparable. */
  checkFile(caption: string, sent: string, receivedPath: string): Promise<this> {
    return this.checkItem(caption, path.basename(sent), path.basename(receivedPath));
  }

  // -- contract ----------------------------------------------------------------------

  abstract createElement(payload: TPayload): Promise<this>;

  abstract checkCreatedItem(payload: TPayload, created: CreatedEntity): Promise<this>;

  /**
   * Read the entity back through the API and run the field checks.
   *
   * Verifying through the API rather than through the form it was typed into is deliberate:
   * it proves the admin panel sent what the fields said instead of re-reading the same DOM.
   *
   * `TPayload & { name: string }` is how the lookup stays typed without constraining the class
   * itself: every module schema extends `baseFields`, so the intersection collapses to the
   * payload type at each call site. The entity is returned rather than deleted here — cleanup
   * belongs to fixtures.
   */
  async verifyCreated(
    client: ApiClient,
    apiPath: string,
    payload: TPayload & { name: string },
    checks?: (payload: TPayload, created: CreatedEntity) => Promise<unknown>,
  ): Promise<CreatedEntity> {
    return step("Verify the created entity through the API", async () => {
      const found = await this.fetchCreated(client, apiPath, payload.name);
      if (found === null) {
        throw new Error(`Entity "${payload.name}" was not found via API`);
      }
      await (checks ?? ((sent, created) => this.checkCreatedItem(sent, created)))(payload, found);
      return found;
    });
  }

  /** Prefers `GET {apiPath}/{id}`; falls back to a lookup by name in the collection. */
  private async fetchCreated(
    client: ApiClient,
    apiPath: string,
    name: string,
  ): Promise<CreatedEntity | null> {
    if (this.createdId) {
      const byId = await client.get(`${apiPath}/${this.createdId}`, { attach: false });
      if (byId.status() === HttpStatus.OK) {
        const body = await responseJson(byId);
        return isEntity(body) ? body : null;
      }
    }
    const collection = await client.get(apiPath, { attach: false });
    if (collection.status() !== HttpStatus.OK) {
      return null;
    }
    const items = await responseJson(collection);
    if (!Array.isArray(items)) {
      return null;
    }
    return items.find((item) => isEntity(item) && item.name === name) ?? null;
  }
}

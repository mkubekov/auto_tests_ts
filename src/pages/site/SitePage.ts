// Base page object for the public site.
//
// The site layer is a scaffold, exactly as in the Python original: there is no real front-end
// to inspect, so the locators in the subclasses describe the markup a generic CMS-driven site
// would render (`data-block-type` hooks, semantic class names) and are meant to be repointed at
// a project's own front-end. They are illustrative, not verified against a live site.
//
// Assertions go through Playwright's `expect`, so its auto-waiting covers a site that renders
// its blocks after hydration.

import { expect, type Page } from "@playwright/test";
import { step } from "../../http/apiClient.js";
import { type CreatedEntity, stripHtml } from "../shared.js";

/**
 * Navigation and assertion primitives plus the contract every rendered block implements.
 *
 * Generic over the payload for the same reason `CmsPage` is (see PLAN.md §2.3, improvement #2):
 * Python's `check_created_item(payload: dict[str, Any], created: dict[str, Any])` accepted any
 * two dicts, so nothing tied a site page object to the module whose block it renders. Here the
 * registry can only pair a block with the view of its own payload.
 *
 * `created` stays a `CreatedEntity`: it is what the stand stored, not what the schema produces,
 * and the site renders that — the readers in `../shared.js` narrow its fields where needed.
 */
export abstract class SitePage<TPayload = unknown> {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async open(url: string): Promise<this> {
    await step(`Open ${url}`, async () => {
      await this.page.goto(url);
    });
    return this;
  }

  async click(caption: string, locator: string): Promise<this> {
    await step(`Click "${caption}"`, async () => {
      await this.page.locator(locator).click();
    });
    return this;
  }

  async clickText(caption: string, locator: string, text: string): Promise<this> {
    await step(`Click "${caption}" with text "${text}"`, async () => {
      await this.page.locator(locator).getByText(text).first().click();
    });
    return this;
  }

  async hover(text: string): Promise<this> {
    await step(`Hover "${text}"`, async () => {
      await this.page.getByText(text).hover();
    });
    return this;
  }

  /** Expect the rendered text of `locator`; `expected` may still carry editor markup. */
  async expectText(caption: string, locator: string, expected: string): Promise<this> {
    const text = stripHtml(expected);
    await step(`"${caption}" shows "${text}"`, async () => {
      await expect(this.page.locator(locator)).toHaveText(text);
    });
    return this;
  }

  async expectVisible(caption: string, locator: string): Promise<this> {
    await step(`"${caption}" is visible`, async () => {
      await expect(this.page.locator(locator)).toBeVisible();
    });
    return this;
  }

  abstract checkCreatedItem(payload: TPayload, created: CreatedEntity): Promise<this>;
}

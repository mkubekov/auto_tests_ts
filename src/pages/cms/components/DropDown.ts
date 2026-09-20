// Ant Design `Select` wrapper.

import { expect, type Locator, type Page } from "@playwright/test";
import { step } from "../../../http/apiClient.js";

/** Upper bound for walking a list with ArrowDown; enum-like lists are far shorter. */
const MAX_SCAN_STEPS = 50;
/** How long to wait for the highlighted option to move after a key press. */
const SCAN_STEP_TIMEOUT_MS = 1_000;

/** Whether the currently highlighted option is the one being looked for. */
export type OptionMatcher = (option: Locator) => Promise<boolean>;

/**
 * Two selection strategies for Ant's virtualised dropdown.
 *
 * * `set()` types the value to filter the list and picks the highlighted option. Works for
 *   long reference lists (cities, categories) because the virtual list only renders the rows
 *   that are visible.
 * * `select()` opens the list and walks it with ArrowDown until an option's label matches.
 *   Only for short, enum-like lists.
 */
export class DropDown {
  readonly caption: string;

  private readonly page: Page;
  private readonly element: Locator;

  constructor(page: Page, caption: string, locator: string) {
    this.page = page;
    this.caption = caption;
    this.element = page.locator(locator);
  }

  async set(value: string, log = true): Promise<this> {
    return this.run(`Select "${this.caption}": ${value}`, log, async () => {
      await this.element.click();
      await this.element.fill(value);
      const active = await this.activeOption();
      await expect(active).toBeVisible();
      await active.click();
    });
  }

  async setByEnter(value: string, log = true): Promise<this> {
    return this.run(`Select "${this.caption}": ${value}`, log, async () => {
      await this.element.fill(value);
      await this.element.press("Enter");
    });
  }

  async select(label: string, log = true): Promise<this> {
    return this.run(`Select "${this.caption}": ${label}`, log, async () => {
      await this.element.press("Enter");
      await this.scan(async (option) => {
        const [title, ariaLabel] = await Promise.all([
          option.getAttribute("title"),
          option.getAttribute("label"),
        ]);
        return title === label || ariaLabel === label;
      });
    });
  }

  /**
   * Open the list and take whichever option comes first.
   *
   * For dropdowns whose options are entities the stand already holds and the form only needs a
   * valid one of — the page-template block picker, say. Python looked the name up in a
   * module-level `references()` singleton, which improvement #5 removes; nothing about the
   * assertion that follows depends on *which* entity was picked.
   */
  async selectFirst(log = true): Promise<this> {
    return this.run(`Select the first option of "${this.caption}"`, log, async () => {
      await this.element.click();
      const first = (await this.listbox()).locator(".ant-select-item-option").first();
      await expect(first).toBeVisible();
      await first.click();
    });
  }

  async selectByText(text: string, log = true): Promise<this> {
    return this.run(`Select "${this.caption}": ${text}`, log, async () => {
      await this.element.click();
      await this.scan(async (option) => (await option.textContent()) === text);
    });
  }

  /** Wait until the async options finished loading (Ant shows a spinner meanwhile). */
  async waitLoaded(): Promise<this> {
    await expect(this.page.locator(".ant-spin")).toBeHidden();
    return this;
  }

  /** Create a new option through the inline "add" form at the bottom of the list. */
  async addOption(value: string): Promise<this> {
    return this.run(`Add option to "${this.caption}": ${value}`, true, async () => {
      const footer = this.page.locator(`[id="${await this.listId()}"]`).locator("..");
      await footer.locator('[type="text"]').fill(value);
      await footer.getByText("Add").click();
    });
  }

  private async run(title: string, log: boolean, action: () => Promise<void>): Promise<this> {
    await (log ? step(title, action) : action());
    return this;
  }

  private async listId(): Promise<string> {
    const id = await this.element.getAttribute("id");
    if (id === null) {
      throw new Error(`Dropdown "${this.caption}" has no id, its option list cannot be located`);
    }
    return `${id}_list`;
  }

  /** Ant renders the option list as `<select id>_list` next to a virtual list. */
  private async listbox(): Promise<Locator> {
    return this.page.locator(`[id="${await this.listId()}"] + .rc-virtual-list`);
  }

  private async activeOption(): Promise<Locator> {
    return (await this.listbox()).locator(".ant-select-item-option-active");
  }

  /** Walk the options with ArrowDown until `matches` accepts the highlighted one. */
  private async scan(matches: OptionMatcher): Promise<void> {
    await expect(await this.activeOption()).toBeVisible();
    for (let attempt = 0; attempt < MAX_SCAN_STEPS; attempt += 1) {
      const option = await this.activeOption();
      if (await matches(option)) {
        await option.click();
        return;
      }
      const previous = (await option.textContent()) ?? "";
      await this.page.keyboard.press("ArrowDown");
      try {
        await expect(await this.activeOption()).not.toHaveText(previous, {
          timeout: SCAN_STEP_TIMEOUT_MS,
        });
      } catch {
        break; // the highlight did not move: end of the list
      }
    }
    throw new Error(`Option not found in "${this.caption}"`);
  }
}

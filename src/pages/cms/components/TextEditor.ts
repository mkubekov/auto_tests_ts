// Quill rich-text editor wrapper.

import type { Locator, Page } from "@playwright/test";
import { step } from "../../../http/apiClient.js";
import type { Font } from "../../../models/enums.js";

export class TextEditor {
  readonly caption: string;

  private readonly root: Locator;

  constructor(page: Page, caption: string, locator: string) {
    this.caption = caption;
    this.root = page.locator(locator);
  }

  async type(value: string): Promise<this> {
    await step(`Fill "${this.caption}": ${value}`, async () => {
      await this.root.locator(".ql-editor").fill(value);
    });
    return this;
  }

  heading(level: number): Promise<this> {
    return this.toolbar(`heading ${level}`, `[value="${level}"]`);
  }

  bold(): Promise<this> {
    return this.toolbar("bold", ".ql-bold");
  }

  italic(): Promise<this> {
    return this.toolbar("italic", ".ql-italic");
  }

  underline(): Promise<this> {
    return this.toolbar("underline", ".ql-underline");
  }

  strike(): Promise<this> {
    return this.toolbar("strike", ".ql-strike");
  }

  orderedList(): Promise<this> {
    return this.toolbar("ordered list", '[value="ordered"]');
  }

  bulletList(): Promise<this> {
    return this.toolbar("bullet list", '[value="bullet"]');
  }

  link(): Promise<this> {
    return this.toolbar("link", ".ql-link");
  }

  clearFormatting(): Promise<this> {
    return this.toolbar("clear formatting", ".ql-clean");
  }

  textColor(value: string): Promise<this> {
    return this.pickColor("text colour", 0, value);
  }

  backgroundColor(value: string): Promise<this> {
    return this.pickColor("background colour", 1, value);
  }

  async font(value: Font): Promise<this> {
    await step(`${this.caption}: font ${value}`, async () => {
      await this.root.locator(".ql-font").click();
      await this.root.locator(`[data-value="${value}"]`).click();
    });
    return this;
  }

  private async toolbar(caption: string, locator: string): Promise<this> {
    await step(`${this.caption}: ${caption}`, async () => {
      await this.root.locator(locator).click();
    });
    return this;
  }

  /** Quill renders the text and background pickers as two identical widgets, in that order. */
  private async pickColor(caption: string, index: number, value: string): Promise<this> {
    await step(`${this.caption}: ${caption} ${value}`, async () => {
      await this.root.locator(".ql-color-picker").nth(index).click();
      await this.root.locator(`[data-value="${value}"]`).click();
    });
    return this;
  }
}

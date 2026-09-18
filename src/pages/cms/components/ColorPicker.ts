// Ant Design `ColorPicker` wrapper.
//
// Ported without a live admin panel to verify against: the DOM of the popover (hex input,
// preset swatches) is assumed from Ant Design v5 defaults.

import { expect } from "@playwright/test";
import { step } from "../../../http/apiClient.js";
import type { FormPrimitives } from "../CmsPage.js";

const HEX_INPUT = ".ant-color-picker-input input";

export class ColorPicker {
  private readonly form: FormPrimitives;

  constructor(form: FormPrimitives) {
    this.form = form;
  }

  /** Open the picker anchored at `locator` and enter `value` (`#rrggbb`). */
  async set(caption: string, locator: string, value: string): Promise<this> {
    await step(`Set colour "${caption}": ${value}`, async () => {
      const trigger = this.form.page
        .locator(locator)
        .locator("../..")
        .locator(".ant-form-item-control-input");
      await trigger.click();
      const hexInput = this.form.page.locator(HEX_INPUT);
      await expect(hexInput).toBeVisible();
      await hexInput.fill(value.replace(/^#/, ""));
      await hexInput.press("Enter");
      await trigger.click(); // close the popover
    });
    return this;
  }
}

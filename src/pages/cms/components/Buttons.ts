// Repeatable "buttons" section present on many content blocks.

import { BUTTON_ACTION, BUTTON_STYLE } from "../../../data/labels.js";
import { step } from "../../../http/apiClient.js";
import type { Button } from "../../../models/common.js";
import type { CreatedEntity, FormPrimitives } from "../CmsPage.js";
import { DropDown } from "./DropDown.js";

const ADD_BUTTON = '[id="add-button"]';

/** Adds and fills `buttons[i]` rows; `prefix` scopes ids for nested sections. */
export class Buttons {
  private readonly form: FormPrimitives;
  private readonly prefix: string;

  constructor(form: FormPrimitives, prefix = "") {
    this.form = form;
    this.prefix = prefix;
  }

  async add(): Promise<this> {
    await this.form.click("Add button", ADD_BUTTON);
    return this;
  }

  async fill(button: Button, index = 0): Promise<this> {
    if (!button.active) {
      return this;
    }
    await step(`Button ${index + 1}`, async () => {
      await this.add();
      await this.form.switch("Active", this.id(index, "active"), button.active);
      await this.form.fill("Button text", this.id(index, "text"), button.text);
      await new DropDown(this.form.page, "Button action", this.id(index, "actionType")).set(
        BUTTON_ACTION[button.actionType] ?? button.actionType,
        false,
      );
      await this.form.fill("Action value", this.id(index, "actionValue"), button.actionValue);
      await new DropDown(this.form.page, "Button style", this.id(index, "style")).setByEnter(
        BUTTON_STYLE[button.style] ?? button.style,
      );
    });
    return this;
  }

  async check(sent: Button, received: CreatedEntity): Promise<this> {
    await this.form.checkItem("Button active", sent.active, received.active);
    await this.form.checkItem("Button text", sent.text, received.text);
    await this.form.checkItem("Button action", sent.actionType, received.actionType);
    await this.form.checkItem("Action value", sent.actionValue, received.actionValue);
    return this;
  }

  private id(index: number, name: string): string {
    return `[id="${this.prefix}buttons_${index}_${name}"]`;
  }
}

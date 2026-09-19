// A text block as the public site renders it.

import type { TextBlock } from "../../../models/pageConstructor/textBlock.js";
import { type CreatedEntity, entityString } from "../../shared.js";
import { SitePage } from "../SitePage.js";

// Placeholder locators: the front-end is out of scope here, see `SitePage`.
const ROOT = '[data-block-type="textBlock"]';

export class TextBlockPage extends SitePage<TextBlock> {
  async checkCreatedItem(_payload: TextBlock, created: CreatedEntity): Promise<this> {
    await this.expectVisible("Text block", ROOT);
    await this.expectText("Text", ROOT, entityString(created, "text"));
    return this;
  }
}

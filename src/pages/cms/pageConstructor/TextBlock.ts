// Text block form.

import { SYSTEM_NAME } from "../../../data/labels.js";
import { step } from "../../../http/apiClient.js";
import type { TextBlock as TextBlockPayload } from "../../../models/pageConstructor/textBlock.js";
import { entityString } from "../../shared.js";
import { CmsPage, type CreatedEntity, field } from "../CmsPage.js";
import { TextEditor } from "../components/index.js";

const TEXT = field("text");

export class TextBlock extends CmsPage<TextBlockPayload> {
  async createElement(payload: TextBlockPayload): Promise<this> {
    await step("Create text block", async () => {
      await this.fillName(payload.name);
      await new TextEditor(this.page, "Text", TEXT).type(payload.text);
      await this.save();
    });
    return this;
  }

  async checkCreatedItem(payload: TextBlockPayload, created: CreatedEntity): Promise<this> {
    await this.checkItem(SYSTEM_NAME, payload.name, created.name);
    await this.checkText("Text", payload.text, entityString(created, "text"));
    return this;
  }
}

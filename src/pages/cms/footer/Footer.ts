// Footer form: pick existing sections from a multi-select.

import { SYSTEM_NAME } from "../../../data/labels.js";
import { step } from "../../../http/apiClient.js";
import type { Footer as FooterPayload } from "../../../models/footer/footer.js";
import { entityAt, entityString } from "../../shared.js";
import { CmsPage, type CreatedEntity, field } from "../CmsPage.js";
import { DropDown } from "../components/index.js";

const SECTIONS = field("sections");

export class Footer extends CmsPage<FooterPayload> {
  async createElement(payload: FooterPayload): Promise<this> {
    await step("Create footer", async () => {
      await this.fillName(payload.name);
      for (const section of payload.sections) {
        await new DropDown(this.page, "Section", SECTIONS).set(entityString(section, "name"));
      }
      await this.save();
    });
    return this;
  }

  async checkCreatedItem(payload: FooterPayload, created: CreatedEntity): Promise<this> {
    await this.checkItem(SYSTEM_NAME, payload.name, created.name);
    for (const [index, section] of payload.sections.entries()) {
      const got = entityAt(created, "sections", index);
      await this.checkItem("Section", entityString(section, "name"), got.name);
    }
    return this;
  }
}

// Footer section form: title, position and a repeatable list of links.

import { SYSTEM_NAME } from "../../../data/labels.js";
import { step } from "../../../http/apiClient.js";
import type { FooterSection as FooterSectionPayload } from "../../../models/footer/footerSection.js";
import { entityAt } from "../../shared.js";
import { CmsPage, type CreatedEntity, field } from "../CmsPage.js";

const TITLE = field("title");
const PRIORITY = field("priority");
const IS_SHOW_TITLE = field("isShowTitle");
const ADD_LINK = "Add link";

const link = (index: number, name: string): string => field(`links_${index}_${name}`);

type FooterLink = FooterSectionPayload["links"][number];

export class FooterSection extends CmsPage<FooterSectionPayload> {
  async addLink(index: number, entry: FooterLink): Promise<this> {
    await step(`Link ${index + 1}`, async () => {
      await this.clickDashed(ADD_LINK);
      await this.fill("Link text", link(index, "linkText"), entry.linkText);
      await this.fill("Link", link(index, "link"), entry.link);
      await this.fill("Link priority", link(index, "priority"), entry.priority);
    });
    return this;
  }

  async createElement(payload: FooterSectionPayload): Promise<this> {
    await step("Create footer section", async () => {
      await this.fillName(payload.name);
      await this.fill("Title", TITLE, payload.title);
      await this.fill("Priority", PRIORITY, payload.priority);
      await this.switch("Show title", IS_SHOW_TITLE, payload.isShowTitle);
      for (const [index, entry] of payload.links.entries()) {
        await this.addLink(index, entry);
      }
      await this.save();
    });
    return this;
  }

  async checkCreatedItem(payload: FooterSectionPayload, created: CreatedEntity): Promise<this> {
    await this.checkItem(SYSTEM_NAME, payload.name, created.name);
    await this.checkItem("Title", payload.title, created.title);
    await this.checkItem("Priority", payload.priority, created.priority);
    await this.checkItem("Show title", payload.isShowTitle, created.isShowTitle);
    for (const [index, entry] of payload.links.entries()) {
      const got = entityAt(created, "links", index);
      await step(`Link ${index + 1}`, async () => {
        await this.checkItem("Link text", entry.linkText, got.linkText);
        await this.checkItem("Link", entry.link, got.link);
        await this.checkItem("Link priority", entry.priority, got.priority);
      });
    }
    return this;
  }
}

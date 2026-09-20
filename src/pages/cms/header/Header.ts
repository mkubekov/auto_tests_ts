// Header form: logo upload and existing categories picked from a multi-select.

import { SYSTEM_NAME } from "../../../data/labels.js";
import { step } from "../../../http/apiClient.js";
import type { Header as HeaderPayload } from "../../../models/header/header.js";
import { entityAt, entityString } from "../../shared.js";
import { CmsPage, type CreatedEntity, field, labelFor } from "../CmsPage.js";
import { DropDown } from "../components/index.js";

const LOGO = labelFor("logoImage");
const CATEGORIES = field("categories");

export class Header extends CmsPage<HeaderPayload> {
  async createElement(payload: HeaderPayload): Promise<this> {
    await step("Create header", async () => {
      await this.fillName(payload.name);
      await this.upload("Logo", LOGO, payload.logoImage);
      for (const category of payload.categories) {
        await new DropDown(this.page, "Categories", CATEGORIES).set(
          entityString(category, "menuCategory"),
        );
      }
      await this.save();
    });
    return this;
  }

  async checkCreatedItem(payload: HeaderPayload, created: CreatedEntity): Promise<this> {
    await this.checkItem(SYSTEM_NAME, payload.name, created.name);
    await this.checkFile("Logo", payload.logoImage, entityString(created, "logoImage"));
    for (const [index, category] of payload.categories.entries()) {
      const got = entityAt(created, "categories", index);
      await this.checkItem("Category", entityString(category, "name"), got.name);
    }
    return this;
  }
}

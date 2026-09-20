// Header category form: the action type drives which sub-form is shown.
//
// The nested-subcategory widgets are not verified against a live admin panel; the module
// carries a `cmsSkipReason` in the registry until they are.

import { HEADER_ACTION, MENU_TYPE, SYSTEM_NAME } from "../../../data/labels.js";
import { step } from "../../../http/apiClient.js";
import { HeaderActionType, MenuType } from "../../../models/enums.js";
import type { HeaderCategory as HeaderCategoryPayload } from "../../../models/header/headerCategory.js";
import { entityString } from "../../shared.js";
import { CmsPage, type CreatedEntity, field } from "../CmsPage.js";
import { DropDown } from "../components/index.js";

const MENU_CATEGORY = field("menuCategory");
const MENU_TYPE_FIELD = field("menuType");
const COLOR_FILL = field("colorFill");
const POSITION = field("position");
const ACTION_TYPE = field("actionType");
const LINK = field("link");
const SUBCATEGORIES = field("subcategories");

const nestedSubcategories = (index: number): string =>
  field(`nestedSubcategories_${index}_subcategories`);

export class HeaderCategory extends CmsPage<HeaderCategoryPayload> {
  private async fillExpandMenu(payload: HeaderCategoryPayload): Promise<void> {
    if (payload.menuType !== null) {
      await new DropDown(this.page, "Menu type", MENU_TYPE_FIELD).select(
        MENU_TYPE[payload.menuType] ?? payload.menuType,
      );
    }
    await this.check("Colour fill", COLOR_FILL, payload.colorFill);
    if (payload.menuType === MenuType.FLAT) {
      for (const entry of payload.subcategories) {
        await new DropDown(this.page, "Subcategories", SUBCATEGORIES).set(
          entityString(entry.subcategory, "name"),
        );
      }
      return;
    }
    for (const [index, nested] of payload.nestedSubcategories.entries()) {
      for (const subcategory of nested.subcategories) {
        await new DropDown(this.page, "Nested subcategories", nestedSubcategories(index)).set(
          entityString(subcategory, "name"),
        );
      }
    }
  }

  async createElement(payload: HeaderCategoryPayload): Promise<this> {
    await step("Create header category", async () => {
      await this.fillName(payload.name);
      await this.fill("Menu category", MENU_CATEGORY, payload.menuCategory);
      await this.fill("Position", POSITION, payload.position ?? 0);
      await new DropDown(this.page, "Action", ACTION_TYPE).select(
        HEADER_ACTION[payload.actionType] ?? payload.actionType,
      );
      if (payload.actionType === HeaderActionType.EXPAND) {
        await this.fillExpandMenu(payload);
      } else {
        await this.fill("Link", LINK, payload.link ?? "");
      }
      await this.save();
    });
    return this;
  }

  async checkCreatedItem(payload: HeaderCategoryPayload, created: CreatedEntity): Promise<this> {
    await this.checkItem(SYSTEM_NAME, payload.name, created.name);
    await this.checkItem("Menu category", payload.menuCategory, created.menuCategory);
    await this.checkItem("Position", payload.position, created.position);
    await this.checkItem("Action", payload.actionType, created.actionType);
    if (payload.actionType === HeaderActionType.EXPAND) {
      await this.checkItem("Menu type", payload.menuType, created.menuType);
      await this.checkItem("Colour fill", payload.colorFill, created.colorFill);
    } else {
      await this.checkItem("Link", payload.link, created.link);
    }
    return this;
  }
}

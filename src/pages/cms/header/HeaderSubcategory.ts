// Header subcategory form: the list type drives the fields of each repeated item.

import { SUBCATEGORY_ACTION, SUBCATEGORY_TYPE, SYSTEM_NAME } from "../../../data/labels.js";
import { step } from "../../../http/apiClient.js";
import { SubcategoryAction, SubcategoryType } from "../../../models/enums.js";
import type { HeaderSubcategory as HeaderSubcategoryPayload } from "../../../models/header/headerSubcategory.js";
import { entityAt } from "../../shared.js";
import { CmsPage, type CreatedEntity, field, labelFor } from "../CmsPage.js";
import { DropDown } from "../components/index.js";

const TYPE = field("type");
const TITLE = field("title");
const ACTION_TYPE = field("actionType");
const LINK = field("link");
const ADD_ITEM = "Add item";

const item = (index: number, name: string): string => field(`list_${index}_${name}`);
const itemUpload = (index: number, name: string): string => labelFor(`list_${index}_${name}`);

type SubcategoryItem = NonNullable<HeaderSubcategoryPayload["list"]>[number];

export class HeaderSubcategory extends CmsPage<HeaderSubcategoryPayload> {
  async addItem(index: number, entry: SubcategoryItem, listType: string): Promise<this> {
    await step(`Item ${index + 1}`, async () => {
      await this.clickDashed(ADD_ITEM);
      if (listType === SubcategoryType.LIST) {
        await this.fill("Item text", item(index, "text"), entry.title ?? "");
      } else {
        await this.fill("Item title", item(index, "title"), entry.title ?? "");
        await this.fill("Item subtitle", item(index, "subtitle"), entry.subtitle ?? "");
        if (entry.image !== null) {
          await this.upload("Item image", itemUpload(index, "image"), entry.image);
        }
      }
      await new DropDown(this.page, "Item action", item(index, "actionType")).select(
        SUBCATEGORY_ACTION[entry.actionType] ?? entry.actionType,
      );
      if (entry.actionType === SubcategoryAction.LINK) {
        await this.fill("Item link", item(index, "link"), entry.link ?? "");
      }
    });
    return this;
  }

  async createElement(payload: HeaderSubcategoryPayload): Promise<this> {
    await step("Create header subcategory", async () => {
      await this.fillName(payload.name);
      await new DropDown(this.page, "List type", TYPE).select(
        SUBCATEGORY_TYPE[payload.type] ?? payload.type,
      );
      await this.fill("Title", TITLE, payload.title ?? "");
      if (payload.actionType !== null) {
        await new DropDown(this.page, "Action", ACTION_TYPE).select(
          SUBCATEGORY_ACTION[payload.actionType] ?? payload.actionType,
        );
        if (payload.actionType === SubcategoryAction.LINK) {
          await this.fill("Link", LINK, payload.link ?? "");
        }
      }
      for (const [index, entry] of (payload.list ?? []).entries()) {
        await this.addItem(index, entry, payload.type);
      }
      await this.save();
    });
    return this;
  }

  async checkCreatedItem(payload: HeaderSubcategoryPayload, created: CreatedEntity): Promise<this> {
    await this.checkItem(SYSTEM_NAME, payload.name, created.name);
    await this.checkItem("List type", payload.type, created.type);
    await this.checkItem("Title", payload.title, created.title);
    await this.checkItem("Action", payload.actionType, created.actionType);
    if (payload.actionType === SubcategoryAction.LINK) {
      await this.checkItem("Link", payload.link, created.link);
    }
    for (const [index, entry] of (payload.list ?? []).entries()) {
      const got = entityAt(created, "list", index);
      await step(`Item ${index + 1}`, async () => {
        await this.checkItem("Item title", entry.title, got.title);
        await this.checkItem("Item action", entry.actionType, got.actionType);
      });
    }
    return this;
  }
}

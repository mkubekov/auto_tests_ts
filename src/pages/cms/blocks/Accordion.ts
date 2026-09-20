// Accordion form: category dropdown, colour scheme, repeatable items with rich text.

import { BLOCK_COLOR, SYSTEM_NAME } from "../../../data/labels.js";
import { step } from "../../../http/apiClient.js";
import type { Accordion as AccordionPayload } from "../../../models/blocks/accordion.js";
import { entityAt, entityString } from "../../shared.js";
import { CmsPage, type CreatedEntity, field } from "../CmsPage.js";
import { DropDown, TextEditor } from "../components/index.js";

const CATEGORY = field("category");
const TITLE = field("title");
const BLOCK_COLOR_FIELD = field("blockColor");
const ADD_ITEM = "Add item";

const item = (index: number, name: string): string => field(`items_${index}_${name}`);

type AccordionItem = AccordionPayload["items"][number];

export class Accordion extends CmsPage<AccordionPayload> {
  async selectCategory(value: string): Promise<this> {
    await new DropDown(this.page, "Category", CATEGORY).set(value);
    return this;
  }

  async selectColor(value: string): Promise<this> {
    await new DropDown(this.page, "Block colour", BLOCK_COLOR_FIELD).select(
      BLOCK_COLOR[value] ?? value,
    );
    return this;
  }

  async addItem(index: number, entry: AccordionItem): Promise<this> {
    await step(`Item ${index + 1}`, async () => {
      await this.clickDashed(ADD_ITEM);
      await new TextEditor(this.page, "Item title", item(index, "title")).type(entry.title);
      await new TextEditor(this.page, "Item description", item(index, "description")).type(
        entry.description,
      );
    });
    return this;
  }

  async createElement(payload: AccordionPayload): Promise<this> {
    await step("Create accordion", async () => {
      await this.fillName(payload.name);
      await this.selectCategory(payload.category);
      await new TextEditor(this.page, "Title", TITLE).type(payload.title ?? "");
      await this.selectColor(payload.blockColor);
      for (const [index, entry] of payload.items.entries()) {
        await this.addItem(index, entry);
      }
      await this.save();
    });
    return this;
  }

  async checkCreatedItem(payload: AccordionPayload, created: CreatedEntity): Promise<this> {
    await this.checkItem(SYSTEM_NAME, payload.name, created.name);
    await this.checkItem("Category", payload.category, created.category);
    await this.checkText("Title", payload.title ?? "", entityString(created, "title"));
    await this.checkItem("Block colour", payload.blockColor, created.blockColor);
    for (const [index, entry] of payload.items.entries()) {
      const got = entityAt(created, "items", index);
      await step(`Item ${index + 1}`, async () => {
        await this.checkText("Item title", entry.title, entityString(got, "title"));
        await this.checkText(
          "Item description",
          entry.description,
          entityString(got, "description"),
        );
      });
    }
    return this;
  }
}

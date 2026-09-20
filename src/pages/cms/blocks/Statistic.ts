// Statistics block form: rich-text heading and a list of metric cards.

import { SYSTEM_NAME } from "../../../data/labels.js";
import { step } from "../../../http/apiClient.js";
import type { Statistic as StatisticPayload } from "../../../models/blocks/statistic.js";
import { entityAt, entityString } from "../../shared.js";
import { CmsPage, type CreatedEntity, field } from "../CmsPage.js";
import { TextEditor } from "../components/index.js";

const TITLE = field("title");
const SUBTITLE = field("subtitle");

const metric = (index: number, name: string): string => field(`statBlocks_${index}_${name}`);

export class Statistic extends CmsPage<StatisticPayload> {
  async createElement(payload: StatisticPayload): Promise<this> {
    await step("Create statistics block", async () => {
      await this.fillName(payload.name);
      await new TextEditor(this.page, "Title", TITLE).type(payload.title);
      await new TextEditor(this.page, "Subtitle", SUBTITLE).type(payload.subtitle);
      for (const [index, card] of payload.statBlocks.entries()) {
        await step(`Metric ${index + 1}`, async () => {
          await new TextEditor(this.page, "Metric", metric(index, "title")).type(card.title);
          await new TextEditor(this.page, "Description", metric(index, "text")).type(card.text);
        });
      }
      await this.save();
    });
    return this;
  }

  async checkCreatedItem(payload: StatisticPayload, created: CreatedEntity): Promise<this> {
    await this.checkItem(SYSTEM_NAME, payload.name, created.name);
    await this.checkText("Title", payload.title, entityString(created, "title"));
    await this.checkText("Subtitle", payload.subtitle, entityString(created, "subtitle"));
    for (const [index, card] of payload.statBlocks.entries()) {
      const got = entityAt(created, "statBlocks", index);
      await step(`Metric ${index + 1}`, async () => {
        await this.checkText("Metric", card.title, entityString(got, "title"));
        await this.checkText("Description", card.text, entityString(got, "text"));
      });
    }
    return this;
  }
}

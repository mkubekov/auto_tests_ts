// Webhook form: the minimal page object, a good template for new modules.

import { SYSTEM_NAME } from "../../../data/labels.js";
import { step } from "../../../http/apiClient.js";
import type { Webhook as WebhookPayload } from "../../../models/webhooks/webhook.js";
import { CmsPage, type CreatedEntity, field } from "../CmsPage.js";

const EXTERNAL_ID = field("externalId");
const CAMPAIGN_CODE = field("campaignCode");

export class Webhook extends CmsPage<WebhookPayload> {
  async createElement(payload: WebhookPayload): Promise<this> {
    await step("Create webhook", async () => {
      await this.fillName(payload.name);
      await this.fill("External id", EXTERNAL_ID, payload.externalId);
      await this.fill("Campaign code", CAMPAIGN_CODE, payload.campaignCode);
      await this.save();
    });
    return this;
  }

  async checkCreatedItem(payload: WebhookPayload, created: CreatedEntity): Promise<this> {
    await this.checkItem(SYSTEM_NAME, payload.name, created.name);
    await this.checkItem("External id", payload.externalId, created.externalId);
    await this.checkItem("Campaign code", payload.campaignCode, created.campaignCode);
    return this;
  }
}

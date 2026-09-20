// Banner form: two uploads, rich text, buttons, multi-select targeting, switches.

import { BANNER_POSITION, SYSTEM_NAME } from "../../../data/labels.js";
import { step } from "../../../http/apiClient.js";
import type { Banner as BannerPayload } from "../../../models/banners/banner.js";
import type { Tooltip } from "../../../models/common.js";
import { entityAt, entityObject, entityString } from "../../shared.js";
import { CmsPage, type CreatedEntity, field, labelFor } from "../CmsPage.js";
import { Buttons, DropDown, TextEditor } from "../components/index.js";

const ANALYTICS_ID = field("analyticsId");
const ACTIVE = field("active");
const IS_ADVERTISEMENT = field("isAdvertisement");
const TOOLTIP_TITLE = field("tooltip.title");
const TOOLTIP_TEXT = field("tooltip.text");
const TEXT = '[class="quill "]';
const BACKGROUND_IMAGE = labelFor("backgroundImage");
const IMAGE = labelFor("image");
const CATEGORIES = field("categories");
const BANNER_POSITION_FIELD = field("bannerPosition");
const PROPAGATION = field("propagation");

export class Banner extends CmsPage<BannerPayload> {
  private readonly buttons = new Buttons(this);

  async fillTooltip(tooltip: Tooltip): Promise<this> {
    await this.fill("Tooltip title", TOOLTIP_TITLE, tooltip.title);
    await this.fill("Tooltip text", TOOLTIP_TEXT, tooltip.text);
    return this;
  }

  async selectCategory(value: string): Promise<this> {
    await new DropDown(this.page, "Category", CATEGORIES).set(value);
    return this;
  }

  async selectPosition(value: string): Promise<this> {
    await new DropDown(this.page, "Position", BANNER_POSITION_FIELD).select(
      BANNER_POSITION[value] ?? value,
    );
    return this;
  }

  async createElement(payload: BannerPayload): Promise<this> {
    await step("Create banner", async () => {
      await this.fillName(payload.name);
      await this.fill("Analytics id", ANALYTICS_ID, payload.analyticsId);
      await this.switch("Active", ACTIVE, payload.active);
      await this.switch("Advertisement", IS_ADVERTISEMENT, payload.isAdvertisement);
      if (payload.isAdvertisement && payload.tooltip !== null) {
        await this.fillTooltip(payload.tooltip);
      }
      await new TextEditor(this.page, "Text", TEXT).type(payload.text);
      await this.upload("Background image", BACKGROUND_IMAGE, payload.backgroundImage);
      await this.upload("Image", IMAGE, payload.image);
      for (const [index, button] of payload.buttons.entries()) {
        await this.buttons.fill(button, index);
      }
      for (const category of payload.categories ?? []) {
        await this.selectCategory(category);
      }
      await this.selectPosition(payload.bannerPosition);
      await this.switch("Propagate to child pages", PROPAGATION, payload.propagation ?? false);
      await this.save();
    });
    return this;
  }

  async checkCreatedItem(payload: BannerPayload, created: CreatedEntity): Promise<this> {
    await this.checkItem(SYSTEM_NAME, payload.name, created.name);
    await this.checkItem("Analytics id", payload.analyticsId, created.analyticsId);
    await this.checkItem("Active", payload.active, created.active);
    await this.checkItem("Advertisement", payload.isAdvertisement, created.isAdvertisement);
    if (payload.isAdvertisement && payload.tooltip !== null) {
      const tooltip = entityObject(created, "tooltip");
      await this.checkItem("Tooltip title", payload.tooltip.title, tooltip.title);
      await this.checkItem("Tooltip text", payload.tooltip.text, tooltip.text);
    }
    await this.checkText("Text", payload.text, entityString(created, "text"));
    await this.checkFile(
      "Background image",
      payload.backgroundImage,
      entityString(created, "backgroundImage"),
    );
    await this.checkFile("Image", payload.image, entityString(created, "image"));
    for (const [index, button] of payload.buttons.entries()) {
      await step(`Button ${index + 1}`, async () => {
        await this.buttons.check(button, entityAt(created, "buttons", index));
      });
    }
    await this.checkItem("Categories", payload.categories ?? [], created.categories ?? []);
    await this.checkItem("Position", payload.bannerPosition, created.bannerPosition);
    return this;
  }
}

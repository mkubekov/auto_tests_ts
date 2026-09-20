// Promo banner form: colour picker, responsive images, audience.
//
// The activity-period date-range picker is not automated; the module carries a `cmsSkipReason`
// in the registry until it is.

import {
  AUDIENCE,
  PROMO_BANNER_POSITION,
  PROMO_BUTTON_STYLE,
  SYSTEM_NAME,
} from "../../../data/labels.js";
import { step } from "../../../http/apiClient.js";
import type { PromoBanner as PromoBannerPayload } from "../../../models/banners/promoBanner.js";
import { entityObject, entityString } from "../../shared.js";
import { CmsPage, type CreatedEntity, field, labelFor } from "../CmsPage.js";
import { ColorPicker, DropDown } from "../components/index.js";

const BANNER_POSITION_FIELD = field("bannerPosition");
const COLOR = labelFor("color");
const BUTTON_TEXT = field("button.text");
const BUTTON_LINK = field("button.link");
const BUTTON_STYLE_FIELD = field("button.style");
const AUDIENCE_FIELD = field("audience");

const IMAGE_BREAKPOINTS = ["web", "tablet", "mobile"] as const;

export class PromoBanner extends CmsPage<PromoBannerPayload> {
  async createElement(payload: PromoBannerPayload): Promise<this> {
    await step("Create promo banner", async () => {
      await this.fillName(payload.name);
      await new DropDown(this.page, "Position", BANNER_POSITION_FIELD).select(
        PROMO_BANNER_POSITION[payload.bannerPosition] ?? payload.bannerPosition,
      );
      await new ColorPicker(this).set("Banner colour", COLOR, payload.color);
      for (const breakpoint of IMAGE_BREAKPOINTS) {
        await this.upload(
          `Image (${breakpoint})`,
          labelFor(`images.${breakpoint}`),
          payload.images[breakpoint],
        );
      }
      await this.fill("Button text", BUTTON_TEXT, payload.button.text);
      await this.fill("Button link", BUTTON_LINK, payload.button.link);
      await new DropDown(this.page, "Button style", BUTTON_STYLE_FIELD).select(
        PROMO_BUTTON_STYLE[payload.button.style] ?? payload.button.style,
      );
      // The activity period (Ant `RangePicker`) is left untouched; see the registry skip reason.
      for (const audience of payload.audience) {
        await new DropDown(this.page, "Audience", AUDIENCE_FIELD).select(
          AUDIENCE[audience] ?? audience,
        );
      }
      await this.save();
    });
    return this;
  }

  async checkCreatedItem(payload: PromoBannerPayload, created: CreatedEntity): Promise<this> {
    await this.checkItem(SYSTEM_NAME, payload.name, created.name);
    await this.checkItem("Position", payload.bannerPosition, created.bannerPosition);
    const images = entityObject(created, "images");
    for (const breakpoint of IMAGE_BREAKPOINTS) {
      await this.checkFile(
        `Image (${breakpoint})`,
        payload.images[breakpoint],
        entityString(images, breakpoint),
      );
    }
    const button = entityObject(created, "button");
    await this.checkItem("Button text", payload.button.text, button.text);
    await this.checkItem("Button link", payload.button.link, button.link);
    await this.checkItem("Button style", payload.button.style, button.style);
    await this.checkItem("Audience", payload.audience, created.audience);
    return this;
  }
}

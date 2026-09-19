// A gallery block as the public site renders it: one slide visible at a time.

import type { GalleryBlock } from "../../../models/pageConstructor/galleryBlock.js";
import { type CreatedEntity, entityList, entityString } from "../../shared.js";
import { SitePage } from "../SitePage.js";

// Placeholder locators: the front-end is out of scope here, see `SitePage`.
const ROOT = '[data-block-type="galleryBlock"]';
const SLIDE_TITLE = `${ROOT} .slide-title`;
const SLIDE_TEXT = `${ROOT} .slide-text`;
const NEXT_SLIDE = `${ROOT} .slide-next`;

export class GalleryBlockPage extends SitePage<GalleryBlock> {
  nextSlide(): Promise<this> {
    return this.click("Next slide", NEXT_SLIDE);
  }

  async checkCreatedItem(_payload: GalleryBlock, created: CreatedEntity): Promise<this> {
    await this.expectVisible("Gallery block", ROOT);
    for (const [index, slide] of entityList(created, "galleryList").entries()) {
      if (index > 0) {
        await this.nextSlide();
      }
      await this.expectText("Slide title", SLIDE_TITLE, entityString(slide, "title"));
      await this.expectText("Slide text", SLIDE_TEXT, entityString(slide, "text"));
    }
    return this;
  }
}

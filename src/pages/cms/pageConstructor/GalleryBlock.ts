// Gallery block form: repeatable slides with media, rich text and breakpoint offsets.

import { SYSTEM_NAME } from "../../../data/labels.js";
import { step } from "../../../http/apiClient.js";
import type { GalleryBlock as GalleryBlockPayload } from "../../../models/pageConstructor/galleryBlock.js";
import { entityAt, entityObject, entityString } from "../../shared.js";
import { CmsPage, type CreatedEntity, field } from "../CmsPage.js";
import { TextEditor, VideoLoader } from "../components/index.js";

const ADD_SLIDE = "Add slide";

const BREAKPOINTS = ["ultraHD", "fullHD", "desktop", "tablet", "pad", "mobile"] as const;

const slideField = (index: number, name: string): string => field(`galleryList_${index}_${name}`);

type Slide = GalleryBlockPayload["galleryList"][number];

export class GalleryBlock extends CmsPage<GalleryBlockPayload> {
  async addSlide(index: number, slide: Slide): Promise<this> {
    await step(`Slide ${index + 1}`, async () => {
      await this.clickDashed(ADD_SLIDE);
      // Link mode rather than an upload: no video fixture ships with this repository and the
      // model's `src` is already a URL. See `VideoLessons` for the same trade.
      const media = new VideoLoader(this, `galleryList_${index}_`);
      await media.switchSource(true);
      await media.fillLink(slide.src);
      await media.uploadPoster(slide.previewImageSrc);
      await new TextEditor(this.page, "Slide title", slideField(index, "title")).type(slide.title);
      await this.fill("Slide text", slideField(index, "text"), slide.text);
      await this.switch(
        "Advertisement",
        slideField(index, "isAdvertisement"),
        slide.isAdvertisement,
      );
      if (slide.isAdvertisement) {
        await this.fill("Tooltip title", slideField(index, "tooltip_title"), slide.tooltip.title);
        await this.fill("Tooltip text", slideField(index, "tooltip_text"), slide.tooltip.text);
      }
      await this.fill("Duration, ms", slideField(index, "duration"), slide.duration);
      for (const size of BREAKPOINTS) {
        await this.fill(
          `Offset (${size})`,
          slideField(index, `offset_${size}`),
          slide.offset[size],
        );
      }
    });
    return this;
  }

  async createElement(payload: GalleryBlockPayload): Promise<this> {
    await step("Create gallery block", async () => {
      await this.fillName(payload.name);
      for (const [index, slide] of payload.galleryList.entries()) {
        await this.addSlide(index, slide);
      }
      await this.save();
    });
    return this;
  }

  async checkCreatedItem(payload: GalleryBlockPayload, created: CreatedEntity): Promise<this> {
    await this.checkItem(SYSTEM_NAME, payload.name, created.name);
    for (const [index, slide] of payload.galleryList.entries()) {
      const got = entityAt(created, "galleryList", index);
      await step(`Slide ${index + 1}`, async () => {
        await this.checkText("Slide title", slide.title, entityString(got, "title"));
        await this.checkItem("Slide text", slide.text, got.text);
        await this.checkItem("Media", slide.src, got.src);
        await this.checkFile("Poster", slide.previewImageSrc, entityString(got, "previewImageSrc"));
        await this.checkItem("Advertisement", slide.isAdvertisement, got.isAdvertisement);
        const offset = entityObject(got, "offset");
        for (const size of BREAKPOINTS) {
          await this.checkItem(`Offset (${size})`, slide.offset[size], offset[size]);
        }
      });
    }
    return this;
  }
}

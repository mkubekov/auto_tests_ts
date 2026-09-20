// Video lessons page form: hero section, SEO meta, colour and a list of videos.

import { SYSTEM_NAME } from "../../../data/labels.js";
import { step } from "../../../http/apiClient.js";
import type { VideoLessons as VideoLessonsPayload } from "../../../models/sections/videoLessons.js";
import { entityAt, entityObject, entityString } from "../../shared.js";
import { CmsPage, type CreatedEntity, field, labelFor } from "../CmsPage.js";
import { ColorPicker, DropDown, VideoLoader } from "../components/index.js";

const EXTERNAL_NAME = field("externalName");
const URL = field("url");
const BLOCK_COLOR_FIELD = labelFor("blockColor");
const HERO_TITLE = field("firstScreen.title");
const HERO_SUBTITLE = field("firstScreen.subtitle");
const HERO_BUTTON = field("firstScreen.btnText");
const HERO_IMAGE = labelFor("firstScreen.imageUrl");
const NO_INDEX = field("meta.noIndex");
const META_TITLE = field("meta.title");
const META_DESCRIPTION = field("meta.description");
const VIDEO_TITLE = field("videoTitle");
const ADD_VIDEO = "Add video";

const videoField = (index: number, name: string): string => field(`videos_${index}_${name}`);

type Hero = NonNullable<VideoLessonsPayload["firstScreen"]>;
type Meta = NonNullable<VideoLessonsPayload["meta"]>;
type VideoItem = VideoLessonsPayload["videos"][number];

export class VideoLessons extends CmsPage<VideoLessonsPayload> {
  async fillHero(hero: Hero): Promise<this> {
    await step("Hero section", async () => {
      await this.fill("Title", HERO_TITLE, hero.title);
      await this.fill("Subtitle", HERO_SUBTITLE, hero.subtitle);
      await this.fill("Button text", HERO_BUTTON, hero.btnText);
      await this.upload("Image", HERO_IMAGE, hero.imageUrl);
    });
    return this;
  }

  async fillMeta(meta: Meta): Promise<this> {
    await step("SEO meta", async () => {
      await this.switch("No index", NO_INDEX, meta.noIndex);
      await this.fill("Meta title", META_TITLE, meta.title);
      await this.fill("Meta description", META_DESCRIPTION, meta.description);
    });
    return this;
  }

  async addVideo(index: number, video: VideoItem): Promise<this> {
    await step(`Video ${index + 1}`, async () => {
      await this.clickDashed(ADD_VIDEO);
      await this.fill("Video title", videoField(index, "title"), video.title);
      await this.fill("Video description", videoField(index, "description"), video.description);
      // Python uploaded a fixture video here. This repository ships no video file, and the
      // model already carries a `videoLink`, so the widget is switched to its link mode — the
      // field then holds exactly what was sent, which is also what the check below compares.
      const widget = new VideoLoader(this, `videos_${index}_`);
      await widget.switchSource(true);
      await widget.fillLink(video.videoLink, "videoLink");
      await widget.uploadPoster(video.imageLink, "imageLink");
      for (const label of video.labels) {
        await new DropDown(this.page, "Labels", videoField(index, "labels")).set(label);
      }
    });
    return this;
  }

  async createElement(payload: VideoLessonsPayload): Promise<this> {
    await step("Create video lessons page", async () => {
      await this.fillName(payload.name);
      await this.fill("External name", EXTERNAL_NAME, payload.externalName);
      await this.fill("URL", URL, payload.url ?? "");
      if (payload.blockColor !== null) {
        await new ColorPicker(this).set("Block colour", BLOCK_COLOR_FIELD, payload.blockColor);
      }
      if (payload.firstScreen !== null) {
        await this.fillHero(payload.firstScreen);
      }
      if (payload.meta !== null) {
        await this.fillMeta(payload.meta);
      }
      await this.fill("Videos title", VIDEO_TITLE, payload.videoTitle);
      for (const [index, video] of payload.videos.entries()) {
        await this.addVideo(index, video);
      }
      await this.save();
    });
    return this;
  }

  async checkCreatedItem(payload: VideoLessonsPayload, created: CreatedEntity): Promise<this> {
    await this.checkItem(SYSTEM_NAME, payload.name, created.name);
    await this.checkItem("External name", payload.externalName, created.externalName);
    await this.checkItem("URL", payload.url, created.url);
    if (payload.firstScreen !== null) {
      const hero = entityObject(created, "firstScreen");
      await this.checkItem("Hero title", payload.firstScreen.title, hero.title);
      await this.checkItem("Hero subtitle", payload.firstScreen.subtitle, hero.subtitle);
      await this.checkItem("Hero button", payload.firstScreen.btnText, hero.btnText);
      await this.checkFile(
        "Hero image",
        payload.firstScreen.imageUrl,
        entityString(hero, "imageUrl"),
      );
    }
    if (payload.meta !== null) {
      const meta = entityObject(created, "meta");
      await this.checkItem("No index", payload.meta.noIndex, meta.noIndex);
      await this.checkItem("Meta title", payload.meta.title, meta.title);
      await this.checkItem("Meta description", payload.meta.description, meta.description);
    }
    await this.checkItem("Videos title", payload.videoTitle, created.videoTitle);
    for (const [index, video] of payload.videos.entries()) {
      const got = entityAt(created, "videos", index);
      await step(`Video ${index + 1}`, async () => {
        await this.checkItem("Video title", video.title, got.title);
        await this.checkItem("Video description", video.description, got.description);
        await this.checkItem("Video link", video.videoLink, got.videoLink);
        await this.checkFile("Poster", video.imageLink, entityString(got, "imageLink"));
        await this.checkItem("Labels", video.labels, got.labels);
      });
    }
    return this;
  }
}

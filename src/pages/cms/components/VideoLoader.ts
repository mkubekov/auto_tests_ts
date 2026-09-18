// Video widget: upload a file or paste a link, plus a poster image.

import type { CreatedEntity, FormPrimitives } from "../CmsPage.js";

/** The media fields of a payload item, as the API names them. */
export interface VideoFields {
  videoLink: string;
  imageLink: string;
}

/** `prefix` scopes the field ids when the widget is repeated inside a list. */
export class VideoLoader {
  private readonly form: FormPrimitives;
  private readonly prefix: string;

  constructor(form: FormPrimitives, prefix = "") {
    this.form = form;
    this.prefix = prefix;
  }

  async switchSource(byLink: boolean): Promise<this> {
    await this.form.switch("Video by link", this.id("videoLinkType"), byLink);
    return this;
  }

  /**
   * The repository ships no video fixture (it would be a binary blob nothing can play back
   * against a stand that does not exist), so the file name is always explicit here.
   */
  async upload(fileName: string, name = "src"): Promise<this> {
    await this.form.upload("Video", this.labelFor(name), fileName);
    return this;
  }

  async fillLink(url: string, name = "src"): Promise<this> {
    await this.form.fill("Video link", this.id(name), url);
    return this;
  }

  async uploadPoster(fileName: string, name = "previewImageSrc"): Promise<this> {
    await this.form.upload("Poster", this.labelFor(name), fileName);
    return this;
  }

  async check(sent: VideoFields, received: CreatedEntity): Promise<this> {
    await this.form.checkFile("Video", sent.videoLink, String(received.videoLink));
    await this.form.checkFile("Poster", sent.imageLink, String(received.imageLink));
    return this;
  }

  private id(name: string): string {
    return `[id="${this.prefix}${name}"]`;
  }

  private labelFor(name: string): string {
    return `[for="${this.prefix}${name}"]`;
  }
}

// SEO block shared by page-like entities: index flag plus meta title/description.

import { type CreatedEntity, type FormPrimitives, field } from "../CmsPage.js";

/** The SEO fields of a payload. Declared structurally so any page-like model satisfies it. */
export interface IndexingFields {
  noIndex?: boolean | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

const IS_INDEXED = field("isIndexed");

export class Indexing {
  private readonly form: FormPrimitives;

  constructor(form: FormPrimitives) {
    this.form = form;
  }

  /** `noIndex` in the API is the inverse of the "Index this page" switch. */
  async fill(payload: IndexingFields): Promise<this> {
    const indexed = !payload.noIndex;
    await this.form.switch("Index this page", IS_INDEXED, indexed);
    if (indexed) {
      // Both fields are nullable in the API; an unset one clears the input rather than
      // typing the string "null" into it.
      await this.form.fill("Meta title", field("metaTitle"), payload.metaTitle ?? "");
      await this.form.fill(
        "Meta description",
        field("metaDescription"),
        payload.metaDescription ?? "",
      );
    }
    return this;
  }

  async check(sent: IndexingFields, received: CreatedEntity): Promise<this> {
    await this.form.checkItem("noIndex", sent.noIndex ?? false, received.noIndex ?? false);
    if (!sent.noIndex) {
      await this.form.checkItem("Meta title", sent.metaTitle, received.metaTitle);
      await this.form.checkItem("Meta description", sent.metaDescription, received.metaDescription);
    }
    return this;
  }
}

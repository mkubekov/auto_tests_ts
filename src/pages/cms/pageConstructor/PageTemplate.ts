// Page template form: SEO block, breadcrumbs and the list of composed blocks.

import { BLOCK_TYPE, SYSTEM_NAME } from "../../../data/labels.js";
import { step } from "../../../http/apiClient.js";
import type { Page as PageTemplatePayload } from "../../../models/pageConstructor/page.js";
import { entityAt, entityList } from "../../shared.js";
import { CmsPage, type CreatedEntity, field } from "../CmsPage.js";
import { DropDown, Indexing } from "../components/index.js";

const IS_ACTIVE = field("isActive");
const HAS_MICRO_MARKUP = field("hasMicroMarkup");
const URL = field("url");
const ADD_BREADCRUMB = "Add breadcrumb";
const ADD_BLOCK = "Add block";

const breadcrumbField = (index: number, name: string): string =>
  field(`breadcrumbs_${index}_${name}`);
const blockField = (index: number, name: string): string => field(`blocks_${index}_${name}`);

type Breadcrumb = PageTemplatePayload["breadcrumbs"][number];
type Block = PageTemplatePayload["blocks"][number];

// The model type is named `Page`, which collides with Playwright's `Page`; the class is named
// for what it drives, and the payload is imported aliased — same convention as the site-side
// `PageTemplatePage`.
export class PageTemplate extends CmsPage<PageTemplatePayload> {
  private readonly indexing = new Indexing(this);

  async addBreadcrumb(index: number, crumb: Breadcrumb): Promise<this> {
    await step(`Breadcrumb ${index + 1}`, async () => {
      await this.clickDashed(ADD_BREADCRUMB);
      await this.fill("Breadcrumb text", breadcrumbField(index, "name"), crumb.name);
      await this.fill("Breadcrumb path", breadcrumbField(index, "path"), crumb.path);
    });
    return this;
  }

  async addBlock(index: number, block: Block): Promise<this> {
    await step(`Block ${index + 1}`, async () => {
      await this.clickDashed(ADD_BLOCK);
      await new DropDown(this.page, "Block type", blockField(index, "blockType")).set(
        BLOCK_TYPE[block.blockType] ?? block.blockType,
      );
      // Whichever template the stand offers for that block type will do: the form needs a valid
      // one, and nothing below asserts on which was picked. Python read a name out of a
      // module-level `references()` singleton here (see README §Improvements, improvement #5).
      await new DropDown(
        this.page,
        "Block template",
        blockField(index, "blockTemplateId"),
      ).selectFirst();
      await this.fill("Scroll id", blockField(index, "scrollId"), block.scrollId);
      await this.check("Block fill", blockField(index, "blockFill"), block.blockFill);
    });
    return this;
  }

  async createElement(payload: PageTemplatePayload): Promise<this> {
    await step("Create page template", async () => {
      await this.fillName(payload.name);
      await this.switch("Active", IS_ACTIVE, payload.isActive);
      await this.fill("URL", URL, payload.url);
      await this.switch("Micro markup", HAS_MICRO_MARKUP, payload.hasMicroMarkup ?? false);
      await this.indexing.fill(payload);
      for (const [index, crumb] of payload.breadcrumbs.entries()) {
        await this.addBreadcrumb(index, crumb);
      }
      for (const [index, block] of payload.blocks.entries()) {
        await this.addBlock(index, block);
      }
      await this.save();
    });
    return this;
  }

  async checkCreatedItem(payload: PageTemplatePayload, created: CreatedEntity): Promise<this> {
    await this.checkItem(SYSTEM_NAME, payload.name, created.name);
    await this.checkItem("Active", payload.isActive, created.isActive);
    await this.checkItem("URL", payload.url, created.url);
    await this.indexing.check(payload, created);
    await this.checkItem(
      "Number of blocks",
      payload.blocks.length,
      entityList(created, "blocks").length,
    );
    for (const [index, block] of payload.blocks.entries()) {
      const got = entityAt(created, "blocks", index);
      await step(`Block ${index + 1}`, async () => {
        await this.checkItem("Block type", block.blockType, got.blockType);
        await this.checkItem("Scroll id", block.scrollId, got.scrollId);
      });
    }
    return this;
  }
}

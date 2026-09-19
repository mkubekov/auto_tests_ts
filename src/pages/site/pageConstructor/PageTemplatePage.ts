// A page template as the public site renders it: breadcrumbs plus the blocks it embeds.

import type { Page as PageTemplate } from "../../../models/pageConstructor/page.js";
import { type CreatedEntity, entityList, entityString } from "../../shared.js";
import { SitePage } from "../SitePage.js";

// Placeholder locators: the front-end is out of scope here, see `SitePage`.
const BREADCRUMBS = "nav.breadcrumbs";
const BLOCK = "[data-block-type]";

// The model's own type is named `Page`, which collides with Playwright's `Page`; the alias keeps
// both readable in one file, and the class name says which of the two this page object is.
export class PageTemplatePage extends SitePage<PageTemplate> {
  async checkCreatedItem(_payload: PageTemplate, created: CreatedEntity): Promise<this> {
    for (const crumb of entityList(created, "breadcrumbs")) {
      const path = entityString(crumb, "path");
      await this.expectText(
        "Breadcrumb",
        `${BREADCRUMBS} a[href="${path}"]`,
        entityString(crumb, "name"),
      );
    }
    for (const block of entityList(created, "blocks")) {
      const blockType = entityString(block, "blockType");
      await this.expectVisible(`Block ${blockType}`, `${BLOCK}[data-block-type="${blockType}"]`);
    }
    return this;
  }
}

// Blocks created through the API must render on the public page that embeds them — the port of
// `tests/e2e/ui/test_render.py`.
//
// Skipped unless `SITE_BASE_URL` is configured: the site page objects are a scaffold whose
// locators depend on the project's own front-end.

import { pageBlockModules } from "../../../src/registry/selectors.js";
import { test } from "../fixtures.js";

for (const module of pageBlockModules()) {
  test(`${module.key} renders on the public page`, async ({
    sitePage,
    pageWithBlock,
    settings,
  }) => {
    // Python parametrised the fixture indirectly (`indirect=True`) and unpacked an untyped
    // tuple; `pageWithBlock` is a function, so the module stays an ordinary argument and the
    // payload it returns is tied to that module's schema.
    const { payload, created } = await pageWithBlock(module);
    const view = new module.SitePageClass(sitePage);

    // `sitePage` has already skipped the test when the site URL is unset; this narrows the
    // optional for the compiler and can only fire if that fixture stops guarding it.
    const { siteUrl } = settings;
    if (siteUrl === undefined) {
      throw new Error("SITE_BASE_URL is not configured");
    }

    await view.open(`${siteUrl}${settings.testPagePath}`);
    await view.checkCreatedItem(payload, created);
  });
}

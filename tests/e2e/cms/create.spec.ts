// Create every module through the admin panel and verify the result via the API — the port of
// `tests/e2e/cms/test_create.py`.
//
// Verification deliberately goes through the API rather than re-reading the form: that is what
// proves the panel sent what the fields said, instead of checking the DOM against itself.

import { ADD } from "../../../src/data/labels.js";
import { entityString } from "../../../src/pages/shared.js";
import { cmsModules } from "../../../src/registry/selectors.js";
import { test } from "../fixtures.js";
import { createdPath, entityPath, modulePayload } from "../helpers.js";

for (const { module, skipReason } of cmsModules()) {
  test(`create ${module.key} through the admin form`, async ({
    cmsPage,
    apiClient,
    referenceData,
    cleanup,
    settings,
  }) => {
    // A runtime skip rather than Python's collection-time `pytest.mark.skip`: the test still
    // appears in the HTML report, carrying the reason the registry gave for it.
    test.skip(skipReason !== undefined, skipReason);

    // `cmsModules()` yields `CmsModule`, so the page class and the path are non-optional here —
    // this is where Python needed two `assert ... is not None` lines.
    const form = new module.CmsPageClass(cmsPage);
    const payload = modulePayload(referenceData, module);

    await test.step(`Open ${module.cmsPath} and start a new entity`, async () => {
      await cmsPage.goto(`${settings.cmsUrl}/${module.cmsPath}`);
      await cmsPage.getByText(ADD).click();
    });

    await form.createElement(payload);
    // Registered as soon as the id is known, before any assertion: a failing check must still
    // leave the entity to be deleted.
    if (form.createdId !== null) {
      cleanup.add(entityPath(module, form.createdId));
    }

    // The name is read back off the payload instead of being spelled as `payload.name`: a loop
    // over the registry only knows `Record<string, unknown>`, and the reader fails naming the
    // field should a module schema ever stop extending `baseFields`.
    const created = await form.verifyCreated(apiClient, module.apiPath, {
      ...payload,
      name: entityString(payload, "name"),
    });

    // The form never saw a 201 (the panel may create through a route this page object does not
    // listen on), so the lookup by name is what produced the id.
    if (form.createdId === null) {
      cleanup.add(createdPath(module, created));
    }
  });
}

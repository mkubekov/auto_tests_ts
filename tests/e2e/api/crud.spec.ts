// Positive API checks for every registered module — the port of `tests/e2e/api/test_crud.py`.
//
// Python parametrised over module *keys* (`@pytest.mark.parametrize("module_key", api_params())`)
// and looked the spec up again inside every test, because a pytest parameter id has to be a
// printable value and a `ModuleSpec` is not. Playwright has no collection phase: a plain `for`
// loop at module scope is what declares the tests, so the module object stays in scope and no
// body has to resolve it a second time.

import { assertEcho, assertResponse, jsonValue } from "../../../src/http/assertions.js";
import { HttpStatus } from "../../../src/models/enums.js";
import { apiModules, writableModules } from "../../../src/registry/selectors.js";
import { expect, test } from "../fixtures.js";
import { createdPath } from "../helpers.js";

for (const module of apiModules()) {
  test(`GET ${module.key}: the collection is readable and matches the schema`, async ({
    apiClient,
    referenceData,
  }) => {
    const response = await apiClient.get(module.apiPath);

    await assertResponse(response, HttpStatus.OK, module.schema(referenceData));
  });
}

for (const module of writableModules()) {
  test(`POST ${module.key}: the entity is created with every field sent`, async ({ create }) => {
    const { payload, created } = await create(module);

    assertEcho(created, payload);
  });

  test(`PATCH ${module.key}: the change is persisted`, async ({
    apiClient,
    referenceData,
    create,
  }) => {
    const schema = module.schema(referenceData);
    const { payload, created } = await create(module);
    const itemPath = createdPath(module, created);
    const patched = `${String(payload[module.patchField])}-patched`;

    const response = await apiClient.patch(itemPath, { ...payload, [module.patchField]: patched });
    await assertResponse(response, HttpStatus.OK, schema);

    await test.step("Read the entity back", async () => {
      const stored = await apiClient.get(itemPath);
      await assertResponse(stored, HttpStatus.OK, schema);
      expect(await jsonValue(stored, module.patchField)).toBe(patched);
    });
  });

  test(`DELETE ${module.key}: the entity disappears`, async ({ apiClient, create }) => {
    const { created } = await create(module);
    const itemPath = createdPath(module, created);

    await assertResponse(await apiClient.delete(itemPath), HttpStatus.NO_CONTENT);
    await assertResponse(await apiClient.get(itemPath), HttpStatus.NOT_FOUND);
  });
}

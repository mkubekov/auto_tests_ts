// `headers` is the one module that cannot be created on its own: it references an existing
// category. `writableModules()` leaves it out of the generic CRUD loop, so it gets this flow —
// the port of `tests/e2e/api/test_header.py`.

import { assertResponse } from "../../../src/http/assertions.js";
import { HttpStatus } from "../../../src/models/enums.js";
import { moduleSpec } from "../../../src/registry/modules.js";
import { test } from "../fixtures.js";
import { createdPath } from "../helpers.js";

const headerCategories = moduleSpec("headerCategories");
const headers = moduleSpec("headers");

test("a header referencing a freshly created category is created and updated", async ({
  apiClient,
  referenceData,
  create,
}) => {
  // Registered in this order, deleted in reverse: the header goes before its category.
  const { created: category } = await create(headerCategories);

  // The category is passed *into* `parse()` rather than assigned over a built payload, the way
  // Python did (`payload["categories"] = [created_category]`): the schema's own default would
  // otherwise resolve a reference entity that this test immediately discards.
  const schema = headers.schema(referenceData);
  const payload = schema.parse({ categories: [category] });
  const { created: header } = await create(headers, payload);

  const renamed = { ...payload, name: `${payload.name}-patched` };
  const response = await apiClient.patch(createdPath(headers, header), renamed);

  await assertResponse(response, HttpStatus.OK, schema);
});

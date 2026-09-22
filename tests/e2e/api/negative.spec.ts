// Negative API checks: authentication, validation, idempotency and routing errors — the port of
// `tests/e2e/api/test_negative.py`.
//
// Every error response must carry the `ErrorResponse` envelope; a bare status code with no body
// is a defect too, which is why `errorResponseSchema` declares no optional fields.

import { assertResponse } from "../../../src/http/assertions.js";
import { HttpStatus } from "../../../src/models/enums.js";
import { errorResponseSchema } from "../../../src/models/error.js";
import { writableModules } from "../../../src/registry/selectors.js";
import { test } from "../fixtures.js";
import { createdPath, modulePayload } from "../helpers.js";

// Python spelled these as `pytest.param(value, id=...)`; a tuple of title and body is the same
// thing without the framework ceremony, since the title is built into the test name below.
const MALFORMED_BODIES: readonly (readonly [title: string, body: unknown])[] = [
  ["empty object", {}],
  ["empty list", []],
  ["number", 333],
  ["string", "text"],
  ["boolean", false],
];

const UNKNOWN_PATH = "content/does-not-exist";

for (const module of writableModules()) {
  test(`POST ${module.key} without an API key is forbidden`, async ({
    anonClient,
    referenceData,
  }) => {
    const response = await anonClient.post(module.apiPath, modulePayload(referenceData, module));

    await assertResponse(response, HttpStatus.FORBIDDEN, errorResponseSchema);
  });

  for (const [title, body] of MALFORMED_BODIES) {
    test(`POST ${module.key} with a malformed body (${title}) is rejected`, async ({
      apiClient,
    }) => {
      const response = await apiClient.post(module.apiPath, body);

      await assertResponse(response, HttpStatus.BAD_REQUEST, errorResponseSchema);
    });
  }

  test(`POST ${module.key} twice with the same payload conflicts`, async ({
    apiClient,
    create,
  }) => {
    const { payload } = await create(module);

    const response = await apiClient.post(module.apiPath, payload);

    await assertResponse(response, HttpStatus.CONFLICT, errorResponseSchema);
  });

  test(`POST ${module.key}/<id> is not a valid route`, async ({ apiClient, create }) => {
    const { payload, created } = await create(module);

    const response = await apiClient.post(createdPath(module, created), payload);

    await assertResponse(response, HttpStatus.NOT_FOUND, errorResponseSchema);
  });

  test(`DELETE ${module.key}/<id> twice: the second call is not found`, async ({
    apiClient,
    create,
  }) => {
    const { created } = await create(module);
    const itemPath = createdPath(module, created);

    await assertResponse(await apiClient.delete(itemPath), HttpStatus.NO_CONTENT);
    await assertResponse(
      await apiClient.delete(itemPath),
      HttpStatus.NOT_FOUND,
      errorResponseSchema,
    );
  });

  test(`PUT ${module.key} is not supported`, async ({ apiClient }) => {
    const response = await apiClient.put(module.apiPath, {});

    // This API answers 404, not 405, for verbs it does not route. Encoded on purpose.
    await assertResponse(response, HttpStatus.NOT_FOUND, errorResponseSchema);
  });
}

test("an unknown resource returns 404 for every verb", async ({ apiClient }) => {
  const calls = {
    POST: () => apiClient.post(UNKNOWN_PATH, {}),
    GET: () => apiClient.get(UNKNOWN_PATH),
    PATCH: () => apiClient.patch(UNKNOWN_PATH, {}),
    DELETE: () => apiClient.delete(UNKNOWN_PATH),
  };

  for (const [method, send] of Object.entries(calls)) {
    // A step per verb: Python's bare loop reported one failure with no clue which verb produced
    // it, and the HTML report names the step that failed.
    await test.step(`${method} ${UNKNOWN_PATH}`, async () => {
      await assertResponse(await send(), HttpStatus.NOT_FOUND, errorResponseSchema);
    });
  }
});

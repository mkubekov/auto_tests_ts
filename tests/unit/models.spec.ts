import { expect, test } from "@playwright/test";
import { runMarker } from "../../src/data/faker.js";
import {
  bannerSchema,
  buildPayload,
  errorResponseSchema,
  headerSchema,
  headerSubcategorySchema,
  webhookSchema,
} from "../../src/models/index.js";
import { allModules } from "../../src/registry/modules.js";
import { STUB_ENTITY, stubReferences } from "./fakes.js";

for (const module of allModules()) {
  test.describe(module.key, () => {
    test("payload carries the run marker and no server-managed fields", () => {
      const payload = buildPayload(module.schema(stubReferences));

      expect(payload.name).toMatch(new RegExp(`^${runMarker()}-`));
      for (const field of ["id", "createdAt", "updatedAt"]) {
        expect(payload, field).not.toHaveProperty(field);
      }
    });

    test("payload survives a JSON round trip and re-validates against its own schema", () => {
      // Pydantic gets this for free via `model_dump` + `model_validate`. A zod default can
      // produce a value its own field rejects (a number for a string, a bare object where a
      // nested default was expected), and nothing but an explicit re-parse catches it.
      const schema = module.schema(stubReferences);
      const payload = buildPayload(schema);
      const wire = JSON.parse(JSON.stringify(payload));

      expect(wire).toEqual(payload);
      const reparsed = schema.safeParse(wire);
      expect(reparsed.error?.issues ?? []).toEqual([]);
      expect(reparsed.data).toEqual(payload);
    });
  });
}

test("each call generates fresh data", () => {
  const first = buildPayload(webhookSchema);
  const second = buildPayload(webhookSchema);

  expect(first.name).not.toBe(second.name);
});

test("reference defaults come from the reference source", () => {
  const header = buildPayload(headerSchema(stubReferences));

  expect(header).toMatchObject({ categories: [STUB_ENTITY] });
});

test("reserved-looking keys are sent under their wire name", () => {
  const payload = buildPayload(headerSubcategorySchema);

  expect(payload).toHaveProperty("list");
  expect(payload.list).toHaveLength(2);
  expect(payload).not.toHaveProperty("items");
});

test("a reference field of the wrong type fails at build time", () => {
  const broken = { ...stubReferences, value: () => 42 };

  expect(() => buildPayload(bannerSchema(broken))).toThrow(
    'Reference "categories.value" is number, expected string',
  );
});

test("error response rejects an empty body", () => {
  expect(errorResponseSchema.safeParse({}).success).toBe(false);
  expect(
    errorResponseSchema.safeParse({
      statusCode: 400,
      response: { message: "x" },
      timestamp: "t",
      path: "/p",
    }).success,
  ).toBe(true);
});

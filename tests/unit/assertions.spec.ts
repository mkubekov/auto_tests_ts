import { expect, test } from "@playwright/test";
import { z } from "zod";
import {
  assertEcho,
  assertResponse,
  assertSchema,
  assertStatus,
  jsonValue,
  responseJson,
} from "../../src/http/assertions.js";
import { fakeResponse } from "./fakes.js";

const thingSchema = z.object({ id: z.string(), name: z.string() });

test("assertStatus passes on the expected status", async () => {
  await assertStatus(fakeResponse(201, { body: { id: "1" } }), 201);
});

test("assertStatus message names the url, both statuses and the body", async () => {
  const response = fakeResponse(500, { body: { error: "boom" } });

  const error = await assertStatus(response, 201).then(
    () => undefined,
    (thrown: unknown) => thrown,
  );

  expect(error).toBeInstanceOf(Error);
  const message = (error as Error).message;
  expect(message).toContain("content/things");
  expect(message).toContain("returned 500, expected 201");
  expect(message).toContain("boom");
});

test("responseJson quotes a non-JSON body", async () => {
  await expect(responseJson(fakeResponse(200, { text: "<html>oops</html>" }))).rejects.toThrow(
    /not JSON.*oops/,
  );
});

test("assertSchema accepts an object and an array, returning parsed data", async () => {
  const one = await assertSchema(
    fakeResponse(200, { body: { id: "1", name: "a", extra: 1 } }),
    thingSchema,
  );
  expect(one).toEqual({ id: "1", name: "a" });

  const many = await assertSchema(
    fakeResponse(200, {
      body: [
        { id: "1", name: "a" },
        { id: "2", name: "b" },
      ],
    }),
    thingSchema,
  );
  expect(many).toHaveLength(2);
});

test("assertSchema names the failing item and field", async () => {
  const response = fakeResponse(200, { body: [{ id: "1", name: "a" }, { id: "2" }] });

  await expect(assertSchema(response, thingSchema)).rejects.toThrow(/item #1[\s\S]*name/);
});

test("assertResponse accepts an empty 204", async () => {
  expect(await assertResponse(fakeResponse(204), 204)).toBeUndefined();
});

test("assertResponse checks the status before the schema", async () => {
  await expect(
    assertResponse(fakeResponse(400, { body: { id: "1", name: "a" } }), 201, thingSchema),
  ).rejects.toThrow("expected 201");
});

test("assertResponse validates the schema", async () => {
  const created = await assertResponse(
    fakeResponse(201, { body: { id: "1", name: "a" } }),
    201,
    thingSchema,
  );
  expect(created).toEqual({ id: "1", name: "a" });

  await expect(
    assertResponse(fakeResponse(201, { body: { id: "1" } }), 201, thingSchema),
  ).rejects.toThrow(/name/);
});

test("assertResponse without a schema returns the parsed body", async () => {
  expect(await assertResponse(fakeResponse(200, { body: [1, 2] }), 200)).toEqual([1, 2]);
});

test("assertResponse attaches response headers and body", async () => {
  const before = test.info().attachments.length;

  await assertResponse(fakeResponse(200, { body: { id: "1" } }), 200);

  const names = test
    .info()
    .attachments.slice(before)
    .map((attachment) => attachment.name);
  expect(names).toEqual(["Response headers", "Response body"]);
});

test("jsonValue returns the key or reports it missing", async () => {
  expect(await jsonValue(fakeResponse(201, { body: { id: "42" } }), "id")).toBe("42");

  await expect(jsonValue(fakeResponse(201, { body: { name: "x" } }), "id")).rejects.toThrow(
    '"id" is missing',
  );
  await expect(jsonValue(fakeResponse(200, { body: [] }), "id")).rejects.toThrow("got array");
});

test("assertEcho flags dropped fields", () => {
  const sent = { name: "n", title: "t", items: [] };

  assertEcho({ id: "1", name: "n", title: "<p>t</p>", items: [] }, sent);

  expect(() => assertEcho({ id: "1", name: "n", title: "t" }, sent)).toThrow(/items/);

  assertEcho({ id: "1", name: "n", title: "t" }, sent, { ignore: ["items"] });
});

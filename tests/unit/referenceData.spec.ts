import { expect, test } from "@playwright/test";
import type { ResponseLike } from "../../src/http/assertions.js";
import { type Getter, ReferenceData } from "../../src/http/referenceData.js";
import { fakeResponse } from "./fakes.js";

const PATHS = {
  categories: "content/handbooks?type=categories",
  cities: "content/cities",
};

function makeData(...responses: ResponseLike[]): { data: ReferenceData; requested: string[] } {
  const requested: string[] = [];
  const getter: Getter = {
    get: async (path) => {
      requested.push(path);
      return responses.shift() ?? fakeResponse(200, { body: [{ id: "default" }] });
    },
  };
  return { data: new ReferenceData(getter, PATHS), requested };
}

test("the first item is cached and a second load makes no request", async () => {
  const { data, requested } = makeData(
    fakeResponse(200, { body: [{ id: "1", value: "/a" }, { id: "2" }] }),
  );

  await data.load("categories");
  await data.load("categories");

  expect(data.value("categories", "value")).toBe("/a");
  expect(data.first("categories").id).toBe("1");
  expect(requested).toEqual(["content/handbooks?type=categories"]);
});

test("load without keys fetches every known collection", async () => {
  const { data, requested } = makeData();

  await data.load();

  expect(requested.sort()).toEqual(Object.values(PATHS).sort());
});

test("an object payload is accepted as is", async () => {
  const { data } = makeData(fakeResponse(200, { body: { id: "solo" } }));

  await data.load("categories");

  expect(data.first("categories")).toEqual({ id: "solo" });
});

test("an unknown key is rejected before any request", async () => {
  const { data, requested } = makeData();

  await expect(data.load("categories", "unknown")).rejects.toThrow(
    'Unknown reference "unknown"; known: categories, cities',
  );
  expect(requested).toEqual([]);
});

test("an empty collection throws instead of returning nothing", async () => {
  const { data } = makeData(fakeResponse(200, { body: [] }));

  await expect(data.load("categories")).rejects.toThrow('Reference "categories" is empty');
});

test("a non-object payload is rejected", async () => {
  const { data } = makeData(fakeResponse(200, { body: ["just a string"] }));

  await expect(data.load("categories")).rejects.toThrow("unexpected payload string");
});

test("an error status is reported with the body", async () => {
  const { data } = makeData(fakeResponse(503, { text: "maintenance" }));

  await expect(data.load("categories")).rejects.toThrow(/503.*maintenance/);
});

test("reading before load() throws", () => {
  const { data } = makeData();

  expect(() => data.first("categories")).toThrow("await load() first");
});

test("a missing field lists the fields that exist", async () => {
  const { data } = makeData(fakeResponse(200, { body: [{ id: "1", value: "/a" }] }));
  await data.load("categories");

  expect(() => data.value("categories", "city")).toThrow("fields: id, value");
});

test("clear() drops the cache so the next load fetches again", async () => {
  const { data, requested } = makeData();
  await data.load("cities");

  data.clear();

  expect(() => data.first("cities")).toThrow("await load() first");
  await data.load("cities");
  expect(requested).toEqual(["content/cities", "content/cities"]);
});

test("reference requests stay out of the report", async () => {
  const options: unknown[] = [];
  const data = new ReferenceData({
    get: async (_path, requestOptions) => {
      options.push(requestOptions);
      return fakeResponse(200, { body: [{ id: "1" }] });
    },
  });

  await data.load("cities");

  expect(options).toEqual([{ attach: false }]);
});

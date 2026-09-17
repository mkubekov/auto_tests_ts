import { expect, test } from "@playwright/test";
import { faker, RUN_ID, runMarker, shortText, uniqueName } from "../../src/data/faker.js";

test("run marker is stable within a process", () => {
  expect(RUN_ID).toMatch(/^[0-9a-f]{8}$/);
  expect(runMarker()).toBe(`autotest-${RUN_ID}`);
  expect(runMarker()).toBe(runMarker());
});

test("unique names share the marker but differ", () => {
  const names = new Set(Array.from({ length: 50 }, () => uniqueName()));

  expect(names.size).toBe(50);
  for (const name of names) {
    expect(name.startsWith(`${runMarker()}-`)).toBe(true);
  }
});

test("seed makes generation reproducible", () => {
  const sample = () => [faker.person.fullName(), faker.internet.url(), faker.color.rgb()];

  faker.seed(12345);
  const first = sample();
  faker.seed(12345);
  const second = sample();

  expect(first).toEqual(second);
});

test("shortText respects the limit and ends a sentence", () => {
  for (const maxChars of [5, 15, 20, 60]) {
    for (let i = 0; i < 20; i++) {
      const text = shortText(maxChars);
      expect(text.length).toBeLessThanOrEqual(maxChars);
      expect(text).toMatch(/^[A-Z].*\.$/);
    }
  }
});

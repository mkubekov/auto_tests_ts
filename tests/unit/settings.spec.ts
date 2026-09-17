import { expect, test } from "@playwright/test";
import { loadSettings, SettingsError } from "../../src/config/settings.js";
import { REQUIRED_ENV } from "./fakes.js";

// An explicit env object on every call: a developer's shell or `.env` must not leak in.
function settingsFrom(overrides: NodeJS.ProcessEnv = {}) {
  return loadSettings({ ...REQUIRED_ENV, ...overrides });
}

function settingsErrorFrom(env: NodeJS.ProcessEnv): SettingsError {
  try {
    loadSettings(env);
  } catch (error) {
    if (error instanceof SettingsError) {
      return error;
    }
    throw error;
  }
  throw new Error("loadSettings() accepted an invalid environment");
}

test("defaults derive urls, viewport and timeouts", () => {
  const settings = settingsFrom();

  expect(settings.apiUrl).toBe("https://api.example.com/api/v3");
  expect(settings.cmsUrl).toBe("https://cms.example.com");
  expect(settings.cmsApiUrl).toBe("https://cms.example.com/api/v1");
  expect(settings.siteUrl).toBeUndefined();
  expect(settings.viewport).toEqual({ width: 1920, height: 1080 });
  expect(settings.requestTimeout).toEqual({ connectS: 10, readS: 60 });
  expect(settings.testPagePath).toBe("/autotest");
  expect(settings.browserTimeoutMs).toBe(240_000);
});

test("explicit urls lose their trailing slash", () => {
  const settings = settingsFrom({
    CMS_API_BASE_URL: "https://auth.example.com/v1/",
    SITE_BASE_URL: "https://www.example.com/",
  });

  expect(settings.cmsApiUrl).toBe("https://auth.example.com/v1");
  expect(settings.siteUrl).toBe("https://www.example.com");
});

test("numeric variables are coerced from strings", () => {
  const settings = settingsFrom({ BROWSER_TIMEOUT_MS: "5000", FAKER_SEED: "42" });

  expect(settings.browserTimeoutMs).toBe(5000);
  expect(settings.fakerSeed).toBe(42);
});

test("viewport is parsed into width and height", () => {
  expect(settingsFrom({ VIEWPORT: "800x600" }).viewport).toEqual({ width: 800, height: 600 });
});

for (const bad of ["1920", "1920 x 1080", "wide", "1920x"]) {
  test(`viewport rejects ${JSON.stringify(bad)}`, () => {
    const error = settingsErrorFrom({ ...REQUIRED_ENV, VIEWPORT: bad });

    expect(error.message).toContain("viewport");
    expect(error.zodError.issues.map((issue) => issue.path.join("."))).toEqual(["viewport"]);
  });
}

test("missing required variables are reported together", () => {
  const error = settingsErrorFrom({});

  const paths = error.zodError.issues.map((issue) => issue.path.join("."));
  expect(paths.sort()).toEqual(["apiBaseUrl", "apiKey", "cmsBaseUrl", "cmsEmail", "cmsPassword"]);
  for (const path of paths) {
    expect(error.message).toContain(path);
  }
});

test("invalid values are aggregated with missing ones", () => {
  const error = settingsErrorFrom({ ...REQUIRED_ENV, API_KEY: undefined, CMS_BASE_URL: "nope" });

  const paths = error.zodError.issues.map((issue) => issue.path.join("."));
  expect(paths.sort()).toEqual(["apiKey", "cmsBaseUrl"]);
});

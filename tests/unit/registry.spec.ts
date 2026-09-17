import { expect, test } from "@playwright/test";
import { z } from "zod";
import { DEFAULT_REFERENCE_PATHS } from "../../src/http/referenceData.js";
import { hasCms } from "../../src/registry/moduleSpec.js";
import { allModules, MODULES } from "../../src/registry/modules.js";
import {
  apiModules,
  cmsModules,
  pageBlockModules,
  writableModules,
} from "../../src/registry/selectors.js";
import { stubReferences } from "./fakes.js";

const keys = (modules: { key: string }[]) => modules.map((module) => module.key);

test("registry keys match spec keys", () => {
  for (const [key, module] of Object.entries(MODULES)) {
    expect(module.key, key).toBe(key);
  }
});

test("api paths are unique", () => {
  const paths = allModules().map((module) => module.apiPath);

  expect(new Set(paths).size).toBe(paths.length);
});

test("every schema factory yields a zod object schema", () => {
  for (const module of allModules()) {
    expect(module.schema(stubReferences), module.key).toBeInstanceOf(z.ZodObject);
  }
});

test("patch field exists in the module schema", () => {
  // The compiler already checks this for literals passed through `defineModule`; this guards
  // against a spec that bypasses it with a cast.
  for (const module of allModules()) {
    expect(Object.keys(module.schema(stubReferences).shape), module.key).toContain(
      module.patchField,
    );
  }
});

test("a CMS page object always comes with a CMS path", () => {
  // TODO(Step 15): make this two-way (`cmsPath` implies `CmsPageClass`) once every module with
  // an admin form has its page object; until then `cmsPath` is set ahead of the class.
  for (const module of allModules()) {
    if (module.CmsPageClass !== undefined) {
      expect(module.cmsPath, module.key).toBeDefined();
    }
  }
});

test("block type is reserved for page-constructor blocks", () => {
  const blocks = allModules().filter((module) => module.blockType !== undefined);

  for (const module of blocks) {
    expect(module.apiPath, module.key).toContain("page-constructor");
  }
  expect(keys(blocks)).toEqual(["textBlocks", "galleryBlocks"]);
});

test("a site page object is only attached to a block", () => {
  for (const module of allModules()) {
    if (module.SitePageClass !== undefined) {
      expect(module.blockType, module.key).toBeDefined();
    }
  }
});

test("skip reason only makes sense with an admin form", () => {
  // TODO(Step 15): check `hasCms(module)` instead of `cmsPath` once page objects are wired in.
  for (const module of allModules()) {
    if (module.cmsSkipReason !== undefined) {
      expect(module.cmsPath, module.key).toBeDefined();
    }
  }
});

test("selectors reflect the registry", () => {
  expect(keys(apiModules())).toEqual(Object.keys(MODULES));

  const writable = keys(writableModules());
  expect(writable).not.toContain("headers");
  expect(writable).toEqual(Object.keys(MODULES).filter((key) => key !== "headers"));

  const cms = cmsModules();
  expect(keys(cms.map((selection) => selection.module))).toEqual(keys(allModules().filter(hasCms)));
  for (const { module, skipReason } of cms) {
    expect(skipReason, module.key).toBe(module.cmsSkipReason);
  }

  // TODO(Step 15): expect exactly ["textBlocks", "galleryBlocks"] once site page objects exist.
  for (const key of keys(pageBlockModules())) {
    expect(["textBlocks", "galleryBlocks"]).toContain(key);
  }
});

test("reference paths point at registered modules", () => {
  const apiPaths = new Set(allModules().map((module) => module.apiPath));

  for (const [key, path] of Object.entries(DEFAULT_REFERENCE_PATHS)) {
    expect(apiPaths.has(path.split("?")[0] ?? ""), key).toBe(true);
  }
});

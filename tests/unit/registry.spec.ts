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

test("a CMS page object and a CMS path always come together", () => {
  // Either half alone is a module that silently never reaches the CMS suite: `hasCms()` needs
  // both, so a form with no route (or a route with no form) would just not be collected.
  for (const module of allModules()) {
    expect(module.CmsPageClass !== undefined, module.key).toBe(module.cmsPath !== undefined);
  }
});

test("block type is reserved for page-constructor blocks", () => {
  const blocks = allModules().filter((module) => module.blockType !== undefined);

  for (const module of blocks) {
    expect(module.apiPath, module.key).toContain("page-constructor");
  }
  expect(keys(blocks)).toEqual(["textBlocks", "galleryBlocks"]);
});

test("a site page object is only attached to a block or the page template", () => {
  // The page template is the one non-block module the public site renders on its own: it is
  // the container the blocks are embedded in. `pageBlockModules()` still filters on
  // `blockType`, so it stays out of the per-block rendering suite.
  for (const module of allModules()) {
    if (module.SitePageClass !== undefined) {
      expect(module.blockType !== undefined || module.key === "pages", module.key).toBe(true);
    }
  }
});

test("skip reason only makes sense with an admin form", () => {
  for (const module of allModules()) {
    if (module.cmsSkipReason !== undefined) {
      expect(hasCms(module), module.key).toBe(true);
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

  expect(keys(pageBlockModules())).toEqual(["textBlocks", "galleryBlocks"]);
});

test("reference paths point at registered modules", () => {
  const apiPaths = new Set(allModules().map((module) => module.apiPath));

  for (const [key, path] of Object.entries(DEFAULT_REFERENCE_PATHS)) {
    expect(apiPaths.has(path.split("?")[0] ?? ""), key).toBe(true);
  }
});

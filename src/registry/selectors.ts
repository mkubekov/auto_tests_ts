// Registry slices the test suites parametrise over. Pure functions over `MODULES`, so a suite
// never filters the registry inline and every suite agrees on what "writable" means.

import {
  type CmsModule,
  hasCms,
  isSiteBlock,
  isStandalone,
  type ModuleSpec,
  type SiteBlockModule,
} from "./moduleSpec.js";
import { allModules } from "./modules.js";

/** A module selected for the CMS suite, plus the reason its admin-form test is skipped. */
export interface CmsSelection {
  module: CmsModule;
  skipReason?: string;
}

/** Every module, for read-only API checks. */
export function apiModules(): ModuleSpec[] {
  return allModules();
}

/** Modules that can be created on their own, for generic write/negative API checks. */
export function writableModules(): ModuleSpec[] {
  return allModules().filter(isStandalone);
}

/**
 * Modules with an admin form. The skip reason travels with the module instead of becoming a
 * collection-time mark (Python's `pytest.mark.skip`): the suite passes it to `test.skip()`, so
 * the test still shows up in the report with its reason attached.
 */
export function cmsModules(): CmsSelection[] {
  return allModules()
    .filter(hasCms)
    .map((module) => ({ module, skipReason: module.cmsSkipReason }));
}

/** Page-constructor blocks that have a public-site page object. */
export function pageBlockModules(): SiteBlockModule[] {
  return allModules().filter(isSiteBlock);
}

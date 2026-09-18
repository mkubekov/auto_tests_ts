// One `ModuleSpec` binds a CMS module across all three layers: API path, request schema, admin
// form and public-site page. Tests are parametrised from the registry, so adding a module there
// is what puts it under test.

import type { Page } from "@playwright/test";
import type { z } from "zod";
import type { ReferenceSource } from "../http/referenceData.js";
import type { CmsPage } from "../pages/cms/CmsPage.js";

/** Any request schema: every module schema is an object built on `baseFields`. */
export type AnySchema = z.ZodObject;

/**
 * Schemas are always factories, even when a module needs no reference data (`() => schema`).
 * A uniform shape keeps the registry homogeneous, so a test loop can call `module.schema(refs)`
 * without knowing which modules depend on the stand.
 */
export type SchemaFactory<TSchema extends AnySchema = AnySchema> = (
  refs: ReferenceSource,
) => TSchema;

/**
 * The admin form of a module, bound to the payload that module's schema produces.
 *
 * This is the payoff of `ModuleSpec` being a real generic (see PLAN.md §2.3, improvement #2):
 * Python's `page_class: type[CmsPage]` said nothing about which model the form edits, so
 * `create_element(payload)` took a `dict[str, Any]` and a wrong payload only failed in the
 * browser. Here a mismatched pair is a compile error at the registry entry.
 */
export type CmsPageClass<TSchema extends AnySchema = AnySchema> = new (
  page: Page,
) => CmsPage<z.infer<TSchema>>;

// TODO(Step 14): tighten to `new (page: Page) => SitePage` once `SitePage` exists. Kept loose
// so the registry and the site page objects stay independently buildable.
export type SitePageClass = new (page: Page) => unknown;

export interface ModuleSpec<TSchema extends AnySchema = AnySchema> {
  key: string;
  apiPath: string;
  schema: SchemaFactory<TSchema>;
  cmsPath?: string;
  CmsPageClass?: CmsPageClass<TSchema>;
  SitePageClass?: SitePageClass;
  /** Discriminator used by page templates to embed this block (page-constructor blocks only). */
  blockType?: string;
  /** `false` for entities that need related entities first; they get dedicated tests. */
  standalone?: boolean;
  /**
   * Field changed by the PATCH test. Typed against the module's own schema, so a typo like
   * `"nmae"` is a compile error — Python's plain `patch_field: str` accepts anything.
   */
  patchField: keyof z.infer<TSchema> & string;
  /** Why the admin-panel test is skipped. Shown in the report instead of a silent skip. */
  cmsSkipReason?: string;
}

/**
 * Identity function. It exists purely for inference: passing an object literal through it lets
 * TypeScript infer `TSchema` from `schema` and then check `patchField` against that schema,
 * which a plain `const spec: ModuleSpec = {...}` annotation cannot do.
 */
export function defineModule<TSchema extends AnySchema>(
  spec: ModuleSpec<TSchema>,
): ModuleSpec<TSchema> {
  return spec;
}

/** A module has an admin form only when both the page object and the path are known. */
export function hasCms(module: ModuleSpec): boolean {
  return module.CmsPageClass !== undefined && module.cmsPath !== undefined;
}

/** Modules are created on their own unless the spec says otherwise. */
export function isStandalone(module: ModuleSpec): boolean {
  return module.standalone !== false;
}

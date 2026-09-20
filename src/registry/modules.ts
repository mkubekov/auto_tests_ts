// The registry itself. Adding a module here is what puts it under test.
//
// A typed object literal rather than Python's `dict[str, ModuleSpec]`: keys stay literal, so
// `MODULES.banners` and `moduleSpec("banners")` are checked at compile time and a mistyped key
// never reaches a test run.

import { bannerSchema } from "../models/banners/banner.js";
import { promoBannerSchema } from "../models/banners/promoBanner.js";
import { accordionSchema } from "../models/blocks/accordion.js";
import { statisticSchema } from "../models/blocks/statistic.js";
import { footerSchema } from "../models/footer/footer.js";
import { footerSectionSchema } from "../models/footer/footerSection.js";
import { handbookSchema } from "../models/handbooks/handbook.js";
import { headerSchema } from "../models/header/header.js";
import { headerCategorySchema } from "../models/header/headerCategory.js";
import { headerSubcategorySchema } from "../models/header/headerSubcategory.js";
import { galleryBlockSchema } from "../models/pageConstructor/galleryBlock.js";
import { pageSchema } from "../models/pageConstructor/page.js";
import { textBlockSchema } from "../models/pageConstructor/textBlock.js";
import { citySchema } from "../models/regional/city.js";
import { videoLessonsSchema } from "../models/sections/videoLessons.js";
import { webhookSchema } from "../models/webhooks/webhook.js";
import * as cms from "../pages/cms/index.js";
import * as site from "../pages/site/index.js";
import { defineModule, type ModuleSpec } from "./moduleSpec.js";

export const MODULES = {
  handbooks: defineModule({
    key: "handbooks",
    apiPath: "content/handbooks",
    schema: () => handbookSchema,
    patchField: "value",
  }),
  webhooks: defineModule({
    key: "webhooks",
    apiPath: "content/webhooks",
    schema: () => webhookSchema,
    cmsPath: "integrations/webhooks",
    CmsPageClass: cms.Webhook,
    patchField: "name",
  }),
  statistics: defineModule({
    key: "statistics",
    apiPath: "content/statistics",
    schema: statisticSchema,
    cmsPath: "blocks/statistics",
    CmsPageClass: cms.Statistic,
    patchField: "name",
  }),
  accordions: defineModule({
    key: "accordions",
    apiPath: "content/accordions",
    schema: accordionSchema,
    cmsPath: "blocks/accordions",
    CmsPageClass: cms.Accordion,
    patchField: "name",
  }),
  banners: defineModule({
    key: "banners",
    apiPath: "content/banners",
    schema: bannerSchema,
    cmsPath: "banners",
    CmsPageClass: cms.Banner,
    patchField: "name",
  }),
  promoBanners: defineModule({
    key: "promoBanners",
    apiPath: "content/promo-banners",
    schema: () => promoBannerSchema,
    cmsPath: "promo-banners",
    CmsPageClass: cms.PromoBanner,
    patchField: "name",
    cmsSkipReason: "activity period: the date-range picker is not automated yet",
  }),
  footerSections: defineModule({
    key: "footerSections",
    apiPath: "content/footer-sections",
    schema: () => footerSectionSchema,
    cmsPath: "footer/sections",
    CmsPageClass: cms.FooterSection,
    patchField: "name",
  }),
  footers: defineModule({
    key: "footers",
    apiPath: "content/footers",
    schema: footerSchema,
    cmsPath: "footer",
    CmsPageClass: cms.Footer,
    patchField: "name",
  }),
  headerSubcategories: defineModule({
    key: "headerSubcategories",
    apiPath: "content/header-subcategories",
    schema: () => headerSubcategorySchema,
    cmsPath: "header/subcategories",
    CmsPageClass: cms.HeaderSubcategory,
    patchField: "name",
  }),
  headerCategories: defineModule({
    key: "headerCategories",
    apiPath: "content/header-categories",
    schema: headerCategorySchema,
    cmsPath: "header/categories",
    CmsPageClass: cms.HeaderCategory,
    patchField: "name",
    cmsSkipReason: "nested subcategory widgets are not verified against a live admin panel",
  }),
  headers: defineModule({
    key: "headers",
    apiPath: "content/headers",
    schema: headerSchema,
    cmsPath: "header",
    CmsPageClass: cms.Header,
    patchField: "name",
    // Needs a category first: see the dedicated header API suite (Step 17).
    standalone: false,
  }),
  cities: defineModule({
    key: "cities",
    apiPath: "content/cities",
    schema: () => citySchema,
    cmsPath: "locations/cities",
    CmsPageClass: cms.City,
    patchField: "name",
  }),
  videoLessons: defineModule({
    key: "videoLessons",
    apiPath: "content/video-lessons",
    schema: videoLessonsSchema,
    cmsPath: "video-lessons",
    CmsPageClass: cms.VideoLessons,
    patchField: "name",
  }),
  textBlocks: defineModule({
    key: "textBlocks",
    apiPath: "content/page-constructor/text-block-templates",
    schema: () => textBlockSchema,
    cmsPath: "page-constructor/text-block-templates",
    CmsPageClass: cms.TextBlock,
    SitePageClass: site.TextBlockPage,
    blockType: "textBlock",
    patchField: "name",
  }),
  galleryBlocks: defineModule({
    key: "galleryBlocks",
    apiPath: "content/page-constructor/gallery-block-templates",
    schema: () => galleryBlockSchema,
    cmsPath: "page-constructor/gallery-block-templates",
    CmsPageClass: cms.GalleryBlock,
    SitePageClass: site.GalleryBlockPage,
    blockType: "galleryBlock",
    patchField: "name",
  }),
  pages: defineModule({
    key: "pages",
    apiPath: "content/page-constructor/page-templates",
    schema: pageSchema,
    cmsPath: "page-constructor/page-templates",
    CmsPageClass: cms.PageTemplate,
    SitePageClass: site.PageTemplatePage,
    patchField: "name",
  }),
} satisfies Record<string, ModuleSpec>;

export type ModuleKey = keyof typeof MODULES;

/** A module by key. The key is checked at compile time; no runtime lookup can miss. */
export function moduleSpec<K extends ModuleKey>(key: K): (typeof MODULES)[K] {
  return MODULES[key];
}

/** Every module, in registration order. */
export function allModules(): ModuleSpec[] {
  return Object.values(MODULES);
}

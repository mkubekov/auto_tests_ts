// Request schemas. `buildPayload(schema)` yields a fresh fake payload; schemas whose defaults
// point at existing entities are factories taking a loaded `ReferenceSource`.

export { type Banner, bannerSchema } from "./banners/banner.js";
export { type PromoBanner, promoBannerSchema } from "./banners/promoBanner.js";
export { type Accordion, accordionSchema } from "./blocks/accordion.js";
export { type Statistic, statisticSchema } from "./blocks/statistic.js";
export {
  type Button,
  baseFields,
  buildPayload,
  buttonSchema,
  type Reference,
  referenceSchema,
  type Tooltip,
  tooltipSchema,
} from "./common.js";
export * from "./enums.js";
export { type ErrorResponse, errorResponseSchema } from "./error.js";
export { type Footer, footerSchema } from "./footer/footer.js";
export { type FooterSection, footerSectionSchema } from "./footer/footerSection.js";
export { type Handbook, handbookSchema } from "./handbooks/handbook.js";
export { type Header, headerSchema } from "./header/header.js";
export { type HeaderCategory, headerCategorySchema } from "./header/headerCategory.js";
export { type HeaderSubcategory, headerSubcategorySchema } from "./header/headerSubcategory.js";
export { type GalleryBlock, galleryBlockSchema } from "./pageConstructor/galleryBlock.js";
export { type Page, pageSchema } from "./pageConstructor/page.js";
export { type TextBlock, textBlockSchema } from "./pageConstructor/textBlock.js";
export { type City, citySchema } from "./regional/city.js";
export { type VideoLessons, videoLessonsSchema } from "./sections/videoLessons.js";
export { type Webhook, webhookSchema } from "./webhooks/webhook.js";

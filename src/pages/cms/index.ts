// Admin-panel page objects. Each implements `createElement` and `checkCreatedItem`.
//
// There is no real admin panel to inspect, so every locator below this barrel is illustrative:
// it describes the markup a generic Ant Design CMS would render, and is meant to be repointed
// at a project's own panel. The conventions the forms assume, in one place:
//
// * an input's `id` is the API field path — `name`, `tooltip.title`, `images.web`;
// * a repeated row numbers its path instead — `links_0_linkText`, `blocks_1_scrollId`;
// * uploaders and colour pickers are anchored at their `<label for="...">`, hence `labelFor()`;
// * "add another row" is a dashed Ant button carrying the caption, hence `clickDashed()`.
//
// Each module's payload type shares its name with the form that fills it, so models are
// imported aliased (`Webhook as WebhookPayload`).

export { Banner } from "./banners/Banner.js";
export { PromoBanner } from "./banners/PromoBanner.js";
export { Accordion } from "./blocks/Accordion.js";
export { Statistic } from "./blocks/Statistic.js";
export {
  CmsPage,
  type CreatedEntity,
  type FormPrimitives,
  field,
  labelFor,
  stripHtml,
} from "./CmsPage.js";
export * from "./components/index.js";
export { Footer } from "./footer/Footer.js";
export { FooterSection } from "./footer/FooterSection.js";
export { Header } from "./header/Header.js";
export { HeaderCategory } from "./header/HeaderCategory.js";
export { HeaderSubcategory } from "./header/HeaderSubcategory.js";
export { GalleryBlock } from "./pageConstructor/GalleryBlock.js";
export { PageTemplate } from "./pageConstructor/PageTemplate.js";
export { TextBlock } from "./pageConstructor/TextBlock.js";
export { City } from "./regional/City.js";
export { VideoLessons } from "./sections/VideoLessons.js";
export { Webhook } from "./webhooks/Webhook.js";

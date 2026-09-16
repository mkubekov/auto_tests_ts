// Page template: the container that composes blocks by type and template id.

import { z } from "zod";
import { faker, shortText } from "../../data/faker.js";
import type { ReferenceSource } from "../../http/referenceData.js";
import { baseFields, referenceValue } from "../common.js";

export const breadcrumbSchema = z.object({
  name: z.string().default(() => shortText(20)),
  path: z.string().default(() => `/${faker.lorem.slug()}`),
});

export const pageSchema = (refs: ReferenceSource) => {
  const citiesSchema = z.array(z.string()).default(() => [referenceValue(refs, "cities", "city")]);

  // One slot of the page. `blockTemplateId` is a placeholder until a test replaces it with the
  // id of a block it created (see the `pageWithBlock` fixture).
  const pageBlockSchema = z.object({
    blockType: z.string().default("textBlock"),
    scrollId: z.string().default(() => faker.lorem.slug()),
    priority: z.number().int().default(10),
    inlineBlockData: z
      .record(z.string(), z.unknown())
      .nullable()
      .default(() => ({})),
    noMargin: z.boolean().default(() => faker.datatype.boolean()),
    topOffset: z.string().default("default"),
    bottomOffset: z.string().default("default"),
    blockFill: z.boolean().default(() => faker.datatype.boolean()),
    blockFillColor: z.string().default(() => faker.color.rgb()),
    blockTemplateId: z
      .string()
      .nullable()
      .default(() => faker.string.uuid()),
    cities: citiesSchema,
  });

  return baseFields.extend({
    isActive: z.boolean().default(() => faker.datatype.boolean()),
    cities: citiesSchema,
    url: z.string().default(() => faker.lorem.slug()),
    metaTitle: z
      .string()
      .nullable()
      .default(() => shortText(20)),
    metaDescription: z
      .string()
      .nullable()
      .default(() => shortText(20)),
    noIndex: z
      .boolean()
      .nullable()
      .default(() => faker.datatype.boolean()),
    hasMicroMarkup: z
      .boolean()
      .nullable()
      .default(() => faker.datatype.boolean()),
    breadcrumbs: z.array(breadcrumbSchema).prefault(() => [{}]),
    blocks: z.array(pageBlockSchema).prefault(() => [{}]),
  });
};
export type Page = z.infer<ReturnType<typeof pageSchema>>;

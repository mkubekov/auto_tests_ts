// Site banner: images, rich text, buttons, targeting by category and city.

import { z } from "zod";
import { faker, shortText } from "../../data/faker.js";
import { IMAGE_PNG } from "../../data/files.js";
import type { ReferenceSource } from "../../http/referenceData.js";
import { baseFields, buttonSchema, referenceValue, tooltipSchema } from "../common.js";
import { BannerPosition } from "../enums.js";

export const bannerSchema = (refs: ReferenceSource) =>
  baseFields.extend({
    active: z.boolean().default(() => faker.datatype.boolean()),
    analyticsId: z.string().default(() => faker.lorem.slug()),
    backgroundColor: z.string().default(() => faker.color.rgb()),
    backgroundImage: z.string().default(IMAGE_PNG),
    image: z.string().default(IMAGE_PNG),
    title: z
      .string()
      .nullable()
      .default(() => shortText(20)),
    text: z.string().default(() => shortText(20)),
    categories: z
      .array(z.string())
      .nullable()
      .default(() => [referenceValue(refs, "categories", "value")]),
    cities: z.array(z.string()).default(() => [referenceValue(refs, "cities", "city")]),
    buttons: z.array(buttonSchema).prefault(() => [{}]),
    propagation: z
      .boolean()
      .nullable()
      .default(() => faker.datatype.boolean()),
    bannerPosition: z.enum(BannerPosition).default(() => faker.helpers.enumValue(BannerPosition)),
    isAdvertisement: z.boolean().default(() => faker.datatype.boolean()),
    tooltip: tooltipSchema.nullable().prefault(() => ({})),
  });
export type Banner = z.infer<ReturnType<typeof bannerSchema>>;

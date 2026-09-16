// Gallery block: slides with media, buttons and per-breakpoint content offsets.

import { z } from "zod";
import { faker, shortText } from "../../data/faker.js";
import { IMAGE_PNG } from "../../data/files.js";
import { baseFields, buttonSchema, tooltipSchema } from "../common.js";

function px(min: number, max: number): string {
  return `${faker.number.int({ min, max })}px`;
}

export const offsetSchema = z.object({
  mobile: z.string().default(() => px(320, 500)),
  pad: z.string().default(() => px(500, 750)),
  tablet: z.string().default(() => px(750, 1000)),
  desktop: z.string().default(() => px(1000, 1500)),
  fullHD: z.string().default(() => px(1500, 2000)),
  ultraHD: z.string().default(() => px(2000, 2500)),
});

export const galleryItemSchema = z.object({
  buttons: z.array(buttonSchema).prefault(() => [{}]),
  src: z.string().default(() => faker.internet.url()),
  previewImageSrc: z.string().default(IMAGE_PNG),
  duration: z
    .number()
    .int()
    .default(() => faker.number.int({ min: 1000, max: 2000 })),
  text: z.string().default(() => shortText(20)),
  title: z.string().default(() => shortText(20)),
  offset: offsetSchema.prefault(() => ({})),
  isAdvertisement: z.boolean().default(() => faker.datatype.boolean()),
  tooltip: tooltipSchema.prefault(() => ({})),
});

export const galleryBlockSchema = baseFields.extend({
  galleryList: z.array(galleryItemSchema).prefault(() => [{}]),
});
export type GalleryBlock = z.infer<typeof galleryBlockSchema>;

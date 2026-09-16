// Video lessons page: hero section, SEO meta and a list of videos with labels.

import { z } from "zod";
import { faker, shortText } from "../../data/faker.js";
import { IMAGE_PNG } from "../../data/files.js";
import type { ReferenceSource } from "../../http/referenceData.js";
import { baseFields, referenceValue } from "../common.js";

export const heroSectionSchema = z.object({
  title: z.string().default(() => shortText(20)),
  subtitle: z.string().default(() => shortText(20)),
  btnText: z.string().default(() => shortText(20)),
  imageUrl: z.string().default(IMAGE_PNG),
});

export const metaSchema = z.object({
  noIndex: z.boolean().default(() => faker.datatype.boolean()),
  title: z.string().default(() => shortText(20)),
  description: z.string().default(() => shortText(20)),
});

export const videoLessonsSchema = (refs: ReferenceSource) => {
  const videoItemSchema = z.object({
    title: z.string().default(() => shortText(20)),
    description: z.string().default(() => shortText(20)),
    videoLink: z.string().default(() => faker.internet.url()),
    imageLink: z.string().default(IMAGE_PNG),
    labels: z.array(z.string()).default(() => [referenceValue(refs, "labels", "value")]),
  });

  return baseFields.extend({
    noIndex: z
      .boolean()
      .nullable()
      .default(() => faker.datatype.boolean()),
    externalName: z.string().default(() => shortText(20)),
    url: z
      .string()
      .nullable()
      .default(() => `/video-lessons/${faker.lorem.slug()}`),
    blockColor: z
      .string()
      .nullable()
      .default(() => faker.color.rgb()),
    firstScreen: heroSectionSchema.nullable().prefault(() => ({})),
    meta: metaSchema.nullable().prefault(() => ({})),
    videoTitle: z.string().default(() => shortText(20)),
    videos: z.array(videoItemSchema).prefault(() => [{}]),
  });
};
export type VideoLessons = z.infer<ReturnType<typeof videoLessonsSchema>>;

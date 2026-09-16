// Promo banner shown to a chosen audience for a limited period.

import { z } from "zod";
import { faker } from "../../data/faker.js";
import { IMAGE_PNG } from "../../data/files.js";
import { baseFields, isoDate } from "../common.js";
import { Audience, PromoBannerPosition, PromoButtonStyle } from "../enums.js";

const ACTIVITY_PERIOD_DAYS = 90;

export const promoButtonSchema = z.object({
  link: z.string().default(() => faker.internet.url()),
  text: z.string().default(() => faker.lorem.word()),
  color: z.string().default(() => faker.color.rgb()),
  style: z.enum(PromoButtonStyle).default(() => faker.helpers.enumValue(PromoButtonStyle)),
});

export const responsiveImagesSchema = z.object({
  web: z.string().default(IMAGE_PNG),
  tablet: z.string().default(IMAGE_PNG),
  mobile: z.string().default(IMAGE_PNG),
});

export const activityPeriodSchema = z.object({
  dateOfStart: z.string().default(() => {
    const now = new Date();
    return isoDate(faker.date.between({ from: new Date(now.getFullYear(), 0, 1), to: now }));
  }),
  dateOfEnd: z.string().default(() => isoDate(faker.date.soon({ days: ACTIVITY_PERIOD_DAYS }))),
});

export const promoBannerSchema = baseFields.extend({
  bannerPosition: z
    .enum(PromoBannerPosition)
    .default(() => faker.helpers.enumValue(PromoBannerPosition)),
  color: z.string().default(() => faker.color.rgb()),
  images: responsiveImagesSchema.prefault(() => ({})),
  button: promoButtonSchema.prefault(() => ({})),
  activityPeriod: activityPeriodSchema.prefault(() => ({})),
  audience: z.array(z.enum(Audience)).default(() => [faker.helpers.enumValue(Audience)]),
});
export type PromoBanner = z.infer<typeof promoBannerSchema>;

// Statistics block: a heading and a fixed set of metric cards.

import { z } from "zod";
import { faker, shortText } from "../../data/faker.js";
import type { ReferenceSource } from "../../http/referenceData.js";
import { baseFields, referenceValue } from "../common.js";

const STAT_CARD_COUNT = 4;

export const statItemSchema = z.object({
  title: z.string().default(() => `${faker.number.int({ min: 1, max: 99 })}%`),
  text: z.string().default(() => shortText(20)),
});

// A factory rather than a constant: the default category comes from the stand, and taking the
// source as an argument (instead of a global, as Python does) keeps it stubbable in unit tests.
export const statisticSchema = (refs: ReferenceSource) =>
  baseFields.extend({
    categories: z.array(z.string()).default(() => [referenceValue(refs, "categories", "value")]),
    title: z.string().default(() => shortText(20)),
    subtitle: z.string().default(() => shortText(20)),
    statBlocks: z
      .array(statItemSchema)
      .prefault(() => Array.from({ length: STAT_CARD_COUNT }, () => ({}))),
  });
export type Statistic = z.infer<ReturnType<typeof statisticSchema>>;

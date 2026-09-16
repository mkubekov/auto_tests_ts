// Accordion block: expandable items, each with its own buttons.

import { z } from "zod";
import { faker, shortText } from "../../data/faker.js";
import type { ReferenceSource } from "../../http/referenceData.js";
import { baseFields, buttonSchema, referenceValue } from "../common.js";
import { BlockColor } from "../enums.js";

export const accordionItemSchema = z.object({
  title: z.string().default(() => shortText(20)),
  description: z.string().default(() => shortText(20)),
  buttons: z.array(buttonSchema).prefault(() => [{}]),
});

export const customColorsSchema = z.object({
  accentColor: z.string().default(() => faker.color.rgb()),
  backgroundColor: z.string().default(() => faker.color.rgb()),
});

export const accordionSchema = (refs: ReferenceSource) =>
  baseFields.extend({
    category: z.string().default(() => referenceValue(refs, "categories", "value")),
    title: z
      .string()
      .nullable()
      .default(() => shortText(20)),
    blockColor: z.enum(BlockColor).default(() => faker.helpers.enumValue(BlockColor)),
    customColors: customColorsSchema.nullable().prefault(() => ({})),
    items: z.array(accordionItemSchema).prefault(() => [{}]),
    buttons: z
      .array(buttonSchema)
      .nullable()
      .prefault(() => [{}]),
  });
export type Accordion = z.infer<ReturnType<typeof accordionSchema>>;

// Header category: a top-level menu entry that groups existing subcategories.

import { z } from "zod";
import { faker } from "../../data/faker.js";
import type { ReferenceSource } from "../../http/referenceData.js";
import { baseFields, referenceSchema } from "../common.js";
import { HeaderActionType, MenuType } from "../enums.js";

export const headerCategorySchema = (refs: ReferenceSource) => {
  const nestedSubcategoriesSchema = z.object({
    position: z.number().int().default(0),
    elementValue: z.string().default("title"),
    subcategories: referenceSchema.array().prefault(() => [refs.first("headerSubcategories")]),
  });

  const positionedSubcategorySchema = z.object({
    position: z.number().int().default(1),
    subcategory: referenceSchema.prefault(() => refs.first("headerSubcategories")),
  });

  return baseFields.extend({
    menuType: z
      .enum(MenuType)
      .nullable()
      .default(() => faker.helpers.enumValue(MenuType)),
    menuCategory: z.string().default(() => faker.lorem.word()),
    actionType: z.enum(HeaderActionType).default(() => faker.helpers.enumValue(HeaderActionType)),
    link: z
      .string()
      .nullable()
      .default(() => faker.internet.url()),
    position: z.number().int().nullable().default(1),
    colorFill: z.boolean().default(() => faker.datatype.boolean()),
    subcategories: z.array(positionedSubcategorySchema).prefault(() => [{}]),
    nestedElements: z
      .array(z.string())
      .nullable()
      .default(() => []),
    nestedSubcategories: z.array(nestedSubcategoriesSchema).prefault(() => [{}]),
  });
};
export type HeaderCategory = z.infer<ReturnType<typeof headerCategorySchema>>;

// Header subcategory: the leaf level of the navigation menu.

import { z } from "zod";
import { faker, shortText } from "../../data/faker.js";
import { IMAGE_PNG } from "../../data/files.js";
import { baseFields } from "../common.js";
import { SubcategoryAction, SubcategoryType } from "../enums.js";

export const subcategoryItemSchema = z.object({
  title: z
    .string()
    .nullable()
    .default(() => faker.lorem.word()),
  actionType: z.enum(SubcategoryAction).default(() => faker.helpers.enumValue(SubcategoryAction)),
  link: z
    .string()
    .nullable()
    .default(() => faker.internet.url()),
  image: z.string().nullable().default(IMAGE_PNG),
  subtitle: z
    .string()
    .nullable()
    .default(() => faker.lorem.word()),
});

export const headerSubcategorySchema = baseFields.extend({
  title: z
    .string()
    .nullable()
    .default(() => shortText(20)),
  type: z.enum(SubcategoryType).default(() => faker.helpers.enumValue(SubcategoryType)),
  actionType: z
    .enum(SubcategoryAction)
    .nullable()
    .default(() => faker.helpers.enumValue(SubcategoryAction)),
  link: z
    .string()
    .nullable()
    .default(() => faker.internet.url()),
  // The API calls this field `list`. Python aliased it to avoid shadowing the builtin; a TS
  // object key has no such clash, so the schema matches the wire format with no alias layer.
  list: z
    .array(subcategoryItemSchema)
    .nullable()
    .prefault(() => [{}, {}]),
});
export type HeaderSubcategory = z.infer<typeof headerSubcategorySchema>;

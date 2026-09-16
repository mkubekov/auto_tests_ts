// Site header: logo, buttons and existing categories referenced by object.

import { z } from "zod";
import { IMAGE_PNG } from "../../data/files.js";
import type { ReferenceSource } from "../../http/referenceData.js";
import { baseFields, buttonSchema, referenceSchema } from "../common.js";

export const headerSchema = (refs: ReferenceSource) =>
  baseFields.extend({
    logoImage: z.string().default(IMAGE_PNG),
    buttons: z
      .array(buttonSchema)
      .nullable()
      .prefault(() => [{}]),
    categories: referenceSchema.array().prefault(() => [refs.first("headerCategories")]),
  });
export type Header = z.infer<ReturnType<typeof headerSchema>>;

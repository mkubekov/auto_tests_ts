// Text block: the smallest page-constructor template.

import { z } from "zod";
import { shortText } from "../../data/faker.js";
import { baseFields } from "../common.js";

export const textBlockSchema = baseFields.extend({
  text: z.string().default(() => shortText(20)),
});
export type TextBlock = z.infer<typeof textBlockSchema>;

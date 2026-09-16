// Reference dictionary row. One endpoint serves every dictionary; `type` selects it.

import { z } from "zod";
import { faker } from "../../data/faker.js";
import { baseFields } from "../common.js";
import { HandbookType } from "../enums.js";

export const handbookSchema = baseFields.extend({
  type: z.enum(HandbookType).default(() => faker.helpers.enumValue(HandbookType)),
  value: z.string().default(() => `/${faker.lorem.slug()}`),
  extraFields: z.record(z.string(), z.unknown()).default(() => ({})),
});
export type Handbook = z.infer<typeof handbookSchema>;

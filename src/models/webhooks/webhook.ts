// Webhook integration: the minimal two-field module, a good starting point for new ones.

import { z } from "zod";
import { faker } from "../../data/faker.js";
import { baseFields } from "../common.js";

export const webhookSchema = baseFields.extend({
  externalId: z.string().default(() => faker.helpers.replaceSymbols("EXT-####-####")),
  campaignCode: z.string().default(() => faker.helpers.replaceSymbols("CMP-####-####")),
});
export type Webhook = z.infer<typeof webhookSchema>;

// Footer section: a titled list of links.

import { z } from "zod";
import { faker, shortText } from "../../data/faker.js";
import { baseFields } from "../common.js";

export const footerLinkSchema = z.object({
  linkText: z.string().default(() => faker.lorem.word()),
  link: z.string().default(() => faker.internet.url()),
  priority: z.string().default("1"),
});

export const footerSectionSchema = baseFields.extend({
  title: z.string().default(() => shortText(20)),
  priority: z.string().default("1"),
  isShowTitle: z.boolean().default(() => faker.datatype.boolean()),
  links: z.array(footerLinkSchema).prefault(() => [{}]),
});
export type FooterSection = z.infer<typeof footerSectionSchema>;

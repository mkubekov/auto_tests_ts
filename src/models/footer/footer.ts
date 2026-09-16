// Footer: composed of existing footer sections referenced by object.

import type { z } from "zod";
import type { ReferenceSource } from "../../http/referenceData.js";
import { baseFields, referenceSchema } from "../common.js";

export const footerSchema = (refs: ReferenceSource) =>
  baseFields.extend({
    sections: referenceSchema.array().prefault(() => [refs.first("footerSections")]),
  });
export type Footer = z.infer<ReturnType<typeof footerSchema>>;

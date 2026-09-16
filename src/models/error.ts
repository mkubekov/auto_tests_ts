// Error envelope the API returns for 4xx responses.

import { z } from "zod";

/** No defaults and no optional fields on purpose: negative tests must fail on a bare `{}`. */
export const errorResponseSchema = z.object({
  statusCode: z.union([z.number().int(), z.string()]),
  response: z.union([z.record(z.string(), z.unknown()), z.string()]),
  timestamp: z.string(),
  path: z.string(),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

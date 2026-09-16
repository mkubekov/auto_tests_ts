// Building blocks shared by request schemas.
//
// Every field carries a default, so `schema.parse({})` yields a complete, fresh payload — the
// zod counterpart of instantiating a pydantic model with `default_factory` fields.
//
// Two kinds of default are used on purpose. `.default(fn)` for leaf values: zod 4 returns the
// value as is. `.prefault(fn)` for nested objects: the value is run through the schema, so a
// bare `{}` gets its own defaults filled in — no need to repeat `schema.parse({})` inline.

import { z } from "zod";
import { faker, shortText, uniqueName } from "../data/faker.js";
import type { ReferenceSource } from "../http/referenceData.js";
import { ButtonAction, ButtonStyle } from "./enums.js";

/**
 * An existing entity referenced by the whole object the API returned for it. Kept loose on
 * purpose: the referenced entity is sent back exactly as the stand describes it.
 */
export const referenceSchema = z.record(z.string(), z.unknown());
export type Reference = z.infer<typeof referenceSchema>;

/**
 * A string field of a loaded reference entity. `ReferenceSource.value()` is `unknown` because
 * the stand decides the shape; checking here turns a surprise (a number id, a nested object)
 * into a readable error at payload build time rather than a 400 from the API.
 */
export function referenceValue(refs: ReferenceSource, key: string, field: string): string {
  const value = refs.value(key, field);
  if (typeof value !== "string") {
    throw new Error(`Reference "${key}.${field}" is ${typeof value}, expected string`);
  }
  return value;
}

/** Fields every CMS entity has. `name` carries the run marker that cleanup searches for. */
export const baseFields = z.object({
  id: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  name: z.string().default(() => uniqueName()),
});

export const buttonSchema = z.object({
  text: z.string().default(() => shortText(15)),
  style: z.enum(ButtonStyle).default(() => faker.helpers.enumValue(ButtonStyle)),
  active: z.boolean().default(true),
  actionType: z.enum(ButtonAction).default(ButtonAction.LINK),
  actionValue: z.string().default(() => faker.internet.url()),
  backgroundColor: z
    .string()
    .nullable()
    .default(() => faker.color.rgb()),
});
export type Button = z.infer<typeof buttonSchema>;

export const tooltipSchema = z.object({
  title: z.string().default(() => shortText(20)),
  text: z.string().default(() => shortText(20)),
});
export type Tooltip = z.infer<typeof tooltipSchema>;

/**
 * A fresh payload for `schema`. Takes the schema, not a value: defaults run at call time, so
 * every call yields new fake data.
 */
export function buildPayload<T extends z.ZodTypeAny>(schema: T): z.infer<T> {
  return schema.parse({});
}

/** Calendar date as the API expects it: `YYYY-MM-DD`. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

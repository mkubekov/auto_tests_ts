// Faker instance and per-run identifiers.
//
// The locale is read from `FAKER_LOCALE` directly rather than from `config/settings.ts` so
// that importing a model never requires a fully configured environment (unit tests rely on
// this — see `settings.ts`'s laziness contract).

import { randomUUID } from "node:crypto";
import { allFakers, type Faker } from "@faker-js/faker";

const FAKER_LOCALE = process.env.FAKER_LOCALE ?? "en_US";

function resolveFaker(locale: string): Faker {
  const instance = (allFakers as Record<string, Faker | undefined>)[locale];
  if (!instance) {
    throw new Error(`Unknown FAKER_LOCALE: ${JSON.stringify(locale)}`);
  }
  return instance;
}

export const faker: Faker = resolveFaker(FAKER_LOCALE);

// Unique per process. Cleanup searches by this marker, so a run never deletes entities
// created by another run (or by another Playwright worker) on a shared stand.
export const RUN_ID: string = randomUUID().slice(0, 8);

/** Prefix shared by every entity created in this process. */
export function runMarker(): string {
  return `autotest-${RUN_ID}`;
}

/** Entity name: run marker plus a short suffix, so a lookup by name is unambiguous. */
export function uniqueName(): string {
  return `${runMarker()}-${randomUUID().slice(0, 6)}`;
}

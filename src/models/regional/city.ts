// City with an office: main address, extra addresses and legal requisites.

import { z } from "zod";
import { faker } from "../../data/faker.js";
import { baseFields } from "../common.js";

function clockTime(): string {
  return faker.date.anytime().toISOString().slice(11, 16);
}

function fullAddress(): string {
  const street = faker.location.streetAddress({ useFullAddress: true });
  return `${street}, ${faker.location.city()}, ${faker.location.zipCode()}`;
}

export const addressSchema = z.object({
  email: z.string().default(() => faker.internet.email()),
  metro: z.string().default(() => faker.location.street()),
  phone: z.string().default(() => faker.phone.number()),
  address: z.string().default(fullAddress),
  workTime: z.string().default(() => `${clockTime()}-${clockTime()}`),
  isPhoneCalltracking: z.boolean().default(() => faker.datatype.boolean()),
});

export const requisiteSchema = z.object({
  name: z.string().default(() => faker.lorem.word()),
  value: z.string().default(() => faker.string.numeric(10)),
});

export const citySchema = baseFields.extend({
  city: z.string().default(() => faker.location.city()),
  actualAddress: addressSchema.prefault(() => ({})),
  requisites: z.array(requisiteSchema).prefault(() => [{}]),
  multiAddress: z.boolean().default(() => faker.datatype.boolean()),
  secondaryAddresses: z.array(addressSchema).prefault(() => [{}]),
  hasCenter: z.boolean().default(() => faker.datatype.boolean()),
  regionName: z.string().default(() => faker.location.state()),
  regionId: z.string().default(() => faker.string.uuid()),
  cityGuid: z.string().default(() => faker.string.uuid()),
});
export type City = z.infer<typeof citySchema>;

// City form: tabs for the main address, requisites and additional addresses.
//
// Unlike the other forms this one is submitted with a primary "Add" button and confirms with a
// notification, so `save()` is overridden.

import { ADD, NOTIFICATION_LOCATOR } from "../../../data/labels.js";
import { step } from "../../../http/apiClient.js";
import type { City as CityPayload } from "../../../models/regional/city.js";
import { entityAt, entityObject } from "../../shared.js";
import { CmsPage, type CreatedEntity, field } from "../CmsPage.js";

const CITY = field("city");
const REGION_NAME = field("regionName");
const REGION_ID = field("regionId");
const CITY_GUID = field("cityGuid");
const MULTI_ADDRESS = field("multiAddress");
const TAB_REQUISITES = "Requisites";
const TAB_ADDRESSES = "Additional addresses";

type Address = CityPayload["actualAddress"];
type Requisite = CityPayload["requisites"][number];

const ADDRESS_FIELDS = ["address", "email", "metro", "workTime", "phone"] as const;

const addressField = (prefix: string, name: string): string => field(`${prefix}_${name}`);

export class City extends CmsPage<CityPayload> {
  async fillAddress(caption: string, prefix: string, address: Address): Promise<this> {
    await step(caption, async () => {
      for (const name of ADDRESS_FIELDS) {
        await this.fill(name, addressField(prefix, name), address[name]);
      }
      await this.switch(
        "Call tracking",
        addressField(prefix, "isPhoneCalltracking"),
        address.isPhoneCalltracking,
      );
    });
    return this;
  }

  async fillRequisites(requisites: Requisite[]): Promise<this> {
    await this.switchTab(TAB_REQUISITES);
    for (const [index, requisite] of requisites.entries()) {
      await step(`Requisite ${index + 1}`, async () => {
        await this.clickDashed(ADD);
        await this.fill("Requisite name", field(`requisites_${index}_name`), requisite.name);
        await this.fill("Requisite value", field(`requisites_${index}_value`), requisite.value);
      });
    }
    return this;
  }

  async fillSecondaryAddresses(addresses: Address[]): Promise<this> {
    await this.switchTab(TAB_ADDRESSES);
    await this.switch("Several addresses", MULTI_ADDRESS, true);
    for (const [index, address] of addresses.entries()) {
      await this.clickDashed(ADD);
      await this.fillAddress(
        `Additional address ${index + 1}`,
        `secondaryAddresses_${index}`,
        address,
      );
    }
    return this;
  }

  override save(): Promise<this> {
    return this.submit(ADD, '[type="submit"]', NOTIFICATION_LOCATOR);
  }

  async createElement(payload: CityPayload): Promise<this> {
    await step("Create city", async () => {
      await this.fill("City", CITY, payload.city);
      await this.fillAddress("Main address", "actualAddress", payload.actualAddress);
      await this.fill("Region name", REGION_NAME, payload.regionName);
      await this.fill("Region id", REGION_ID, payload.regionId);
      await this.fill("City GUID", CITY_GUID, payload.cityGuid);
      if (payload.requisites.length > 0) {
        await this.fillRequisites(payload.requisites);
      }
      if (payload.multiAddress && payload.secondaryAddresses.length > 0) {
        await this.fillSecondaryAddresses(payload.secondaryAddresses);
      }
      await this.save();
    });
    return this;
  }

  private async checkAddress(
    caption: string,
    sent: Address,
    received: CreatedEntity,
  ): Promise<void> {
    await step(caption, async () => {
      for (const name of ADDRESS_FIELDS) {
        await this.checkItem(name, sent[name], received[name]);
      }
    });
  }

  async checkCreatedItem(payload: CityPayload, created: CreatedEntity): Promise<this> {
    await this.checkItem("City", payload.city, created.city);
    await this.checkItem("Region name", payload.regionName, created.regionName);
    await this.checkItem("Region id", payload.regionId, created.regionId);
    await this.checkItem("City GUID", payload.cityGuid, created.cityGuid);
    const actualAddress = entityObject(created, "actualAddress");
    await this.checkAddress("Main address", payload.actualAddress, actualAddress);
    await this.checkItem(
      "Call tracking",
      payload.actualAddress.isPhoneCalltracking,
      actualAddress.isPhoneCalltracking,
    );
    for (const [index, requisite] of payload.requisites.entries()) {
      const got = entityAt(created, "requisites", index);
      await step(`Requisite ${index + 1}`, async () => {
        await this.checkItem("Requisite name", requisite.name, got.name);
        await this.checkItem("Requisite value", requisite.value, got.value);
      });
    }
    if (payload.multiAddress) {
      for (const [index, address] of payload.secondaryAddresses.entries()) {
        await this.checkAddress(
          `Additional address ${index + 1}`,
          address,
          entityAt(created, "secondaryAddresses", index),
        );
      }
    }
    return this;
  }
}

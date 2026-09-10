// Access to binary fixtures shipped with this package (images, text) for upload tests.

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RESOURCES_DIR = path.join(fileURLToPath(new URL(".", import.meta.url)), "..", "resources");

export const IMAGE_PNG = "image.png";
export const ICON_SVG = "icon.svg";
export const SAMPLE_TXT = "sample.txt";

/** Absolute path of a fixture file; throws early instead of failing inside Playwright. */
export function resourcePath(name: string): string {
  const filePath = path.join(RESOURCES_DIR, name);
  if (!existsSync(filePath)) {
    throw new Error(`Fixture file not found: ${filePath}`);
  }
  return filePath;
}

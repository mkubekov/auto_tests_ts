// Helpers both page-object layers need: the shape of an entity the API returned, the readers
// that narrow it, and the markup stripping a rich-text comparison needs.
//
// They live above `cms/` and `site/` because the two layers verify the same API response from
// opposite ends — the admin form checks what it typed, the site checks what it renders — and
// neither should import the other for it.

/** An entity as the API returned it. Keys are decided by the stand, so values stay `unknown`. */
export type CreatedEntity = Record<string, unknown>;

export function isEntity(value: unknown): value is CreatedEntity {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Read a string field of a created entity.
 *
 * Python indexed the response dict directly (`created["text"]`), which TypeScript cannot do
 * over `unknown` without a cast — and a cast would turn a stand that changed its payload into
 * a confusing locator or assertion failure much later. These readers fail at the field that is
 * actually missing instead.
 */
export function entityString(entity: CreatedEntity, key: string): string {
  const value = entity[key];
  if (typeof value !== "string") {
    throw new Error(`Field "${key}" of the created entity is not a string: ${String(value)}`);
  }
  return value;
}

/** Read a list-of-objects field of a created entity (slides, breadcrumbs, blocks). */
export function entityList(entity: CreatedEntity, key: string): CreatedEntity[] {
  const value = entity[key];
  if (!Array.isArray(value) || !value.every(isEntity)) {
    throw new Error(`Field "${key}" of the created entity is not a list of objects`);
  }
  return value;
}

/**
 * Rich-text fields come back wrapped in tags (`<p>...</p>`); compare the text only.
 *
 * Python used BeautifulSoup. Node has no DOM, and pulling in an HTML parser for a single
 * assertion is not worth the dependency: the editor emits the markup it was given, so
 * dropping tags and decoding the handful of entities it can produce is enough.
 */
export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}

/** Read a nested object field of a created entity (a tooltip, a hero section, an address). */
export function entityObject(entity: CreatedEntity, key: string): CreatedEntity {
  const value = entity[key];
  if (!isEntity(value)) {
    throw new Error(`Field "${key}" of the created entity is not an object: ${String(value)}`);
  }
  return value;
}

/**
 * Read one row of a list-of-objects field.
 *
 * `entityList(created, "items")[index]` is `CreatedEntity | undefined` under
 * `noUncheckedIndexedAccess`, and the interesting failure — the stand stored fewer rows than
 * the form sent — deserves to be named rather than to surface as "cannot read title of
 * undefined" inside an assertion.
 */
export function entityAt(entity: CreatedEntity, key: string, index: number): CreatedEntity {
  const items = entityList(entity, key);
  const item = items[index];
  if (item === undefined) {
    throw new Error(
      `Field "${key}" of the created entity has no row ${index}: ${items.length} in all`,
    );
  }
  return item;
}

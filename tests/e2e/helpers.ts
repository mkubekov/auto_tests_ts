// Helpers shared by the e2e suites.
//
// Everything here works on a `ModuleSpec`, so a suite stays a loop over the registry: nothing
// below knows which module it is creating.

import type { z } from "zod";
import { type ApiClient, step } from "../../src/http/apiClient.js";
import { assertResponse, type ResponseLike, responseJson } from "../../src/http/assertions.js";
import type { CleanupStack } from "../../src/http/cleanupStack.js";
import type { ReferenceSource } from "../../src/http/referenceData.js";
import { buildPayload } from "../../src/models/common.js";
import { HttpStatus } from "../../src/models/enums.js";
import { type CreatedEntity, entityString, isEntity } from "../../src/pages/shared.js";
import type { AnySchema, ModuleSpec } from "../../src/registry/moduleSpec.js";

/**
 * What creating an entity needs: where to send it, what to clean up afterwards, and the
 * reference data its schema resolves defaults from.
 *
 * Python read the references off a module-level singleton, so `create_entity` needed only the
 * client and the stack. The singleton is gone (see README §Improvements, improvement #5), and passing
 * the three together keeps the call sites from growing a fourth positional argument.
 */
export interface CreateContext {
  client: ApiClient;
  cleanup: CleanupStack;
  refs: ReferenceSource;
}

export interface CreatedResult<TSchema extends AnySchema> {
  payload: z.infer<TSchema>;
  /** The entity exactly as the stand stored it — not the schema's view of it. */
  created: CreatedEntity;
}

/** A fresh payload for `module`, with reference-backed defaults resolved. */
export function modulePayload<TSchema extends AnySchema>(
  refs: ReferenceSource,
  module: ModuleSpec<TSchema>,
): z.infer<TSchema> {
  return buildPayload(module.schema(refs));
}

export function entityPath(module: ModuleSpec, id: string): string {
  return `${module.apiPath}/${id}`;
}

/**
 * The item path of an entity the API just returned.
 *
 * Python wrote `f"{module.api_path}/{created['id']}"` at every call site; over `unknown` that
 * subscript needs a cast, and `entityString` turns a stand that stopped returning an id into a
 * failure naming the field instead of a request to `.../undefined`.
 */
export function createdPath(module: ModuleSpec, created: CreatedEntity): string {
  return entityPath(module, entityString(created, "id"));
}

/**
 * Register a created entity for cleanup, tolerating anything the stand may have answered.
 *
 * Runs *before* the status assertion on purpose: if the assertion fails, teardown still deletes
 * the entity and the assertion's own message is what fails the test.
 */
async function registerCreated(
  cleanup: CleanupStack,
  module: ModuleSpec,
  response: ResponseLike,
): Promise<CreatedEntity | null> {
  if (response.status() !== HttpStatus.CREATED) {
    return null;
  }
  let body: unknown;
  try {
    body = await responseJson(response);
  } catch {
    return null;
  }
  if (!isEntity(body)) {
    return null;
  }
  if (typeof body.id === "string") {
    cleanup.add(entityPath(module, body.id));
  }
  return body;
}

/** POST a payload for `module` and return what was sent alongside what came back. */
export async function createEntity<TSchema extends AnySchema>(
  ctx: CreateContext,
  module: ModuleSpec<TSchema>,
  payload?: z.infer<TSchema>,
): Promise<CreatedResult<TSchema>> {
  const schema = module.schema(ctx.refs);
  const sent: z.infer<TSchema> = payload ?? buildPayload(schema);
  return step(`Create ${module.key}`, async () => {
    const response = await ctx.client.post(module.apiPath, sent);
    const created = await registerCreated(ctx.cleanup, module, response);
    await assertResponse(response, HttpStatus.CREATED, schema);
    if (created === null) {
      throw new Error(`POST ${module.apiPath} returned no JSON object to continue from`);
    }
    return { payload: sent, created };
  });
}

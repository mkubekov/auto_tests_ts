import { expect, test } from "@playwright/test";
import { CleanupStack, type Deleter } from "../../src/http/cleanupStack.js";
import { fakeResponse } from "./fakes.js";

function recordingDeleter(...statuses: number[]): { deleter: Deleter; deleted: string[] } {
  const deleted: string[] = [];
  const deleter: Deleter = {
    delete: async (path) => {
      deleted.push(path);
      return fakeResponse(statuses.shift() ?? 204);
    },
  };
  return { deleter, deleted };
}

test("deletes in reverse order and empties the stack", async () => {
  const { deleter, deleted } = recordingDeleter(204, 204);
  const stack = new CleanupStack(deleter);
  stack.add("content/header-categories/1");
  stack.add("content/headers/2");

  const failures = await stack.run();

  expect(failures).toEqual([]);
  expect(deleted).toEqual(["content/headers/2", "content/header-categories/1"]);
  expect(stack.pending).toEqual([]);
});

test("add returns the path and pending is a copy", () => {
  const stack = new CleanupStack(recordingDeleter().deleter);

  expect(stack.add("a/1")).toBe("a/1");
  const snapshot = stack.pending as string[];
  snapshot.push("a/2");
  expect(stack.pending).toEqual(["a/1"]);
});

test("failures are collected and do not stop the sweep", async () => {
  // Deletion runs last-added first: a/3 gets 500, a/2 gets 404 (already gone), a/1 gets 200.
  const { deleter, deleted } = recordingDeleter(500, 404, 200);
  const stack = new CleanupStack(deleter);
  for (const path of ["a/1", "a/2", "a/3"]) {
    stack.add(path);
  }

  const failures = await stack.run();

  expect(failures).toEqual([{ path: "a/3", reason: "DELETE returned 500" }]);
  expect(deleted).toHaveLength(3);
});

test("exceptions are swallowed and reported", async () => {
  const stack = new CleanupStack({
    delete: async () => {
      throw new Error("stand is down");
    },
  });
  stack.add("a/1");
  stack.add("a/2");

  const failures = await stack.run();

  expect(failures).toEqual([
    { path: "a/2", reason: "DELETE threw: stand is down" },
    { path: "a/1", reason: "DELETE threw: stand is down" },
  ]);
});

test("cleanup requests stay out of the report", async () => {
  const options: unknown[] = [];
  const stack = new CleanupStack({
    delete: async (_path, requestOptions) => {
      options.push(requestOptions);
      return fakeResponse(204);
    },
  });
  stack.add("a/1");

  await stack.run();

  expect(options).toEqual([{ attach: false }]);
});

test("a second run has nothing left to delete", async () => {
  const { deleter, deleted } = recordingDeleter();
  const stack = new CleanupStack(deleter);
  stack.add("a/1");

  await stack.run();
  await stack.run();

  expect(deleted).toEqual(["a/1"]);
});

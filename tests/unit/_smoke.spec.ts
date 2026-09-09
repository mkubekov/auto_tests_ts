import { expect, test } from "@playwright/test";

// Temporary wiring smoke test — deleted in Step 11 once real unit tests exist (see PLAN.md).
test("wiring works", () => {
  expect(1 + 1).toBe(2);
});

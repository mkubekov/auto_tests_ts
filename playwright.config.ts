import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  fullyParallel: true,
  reporter: [["html", { open: "never" }]],
  projects: [
    {
      name: "unit",
      testDir: "tests/unit",
    },
    {
      name: "api",
      testDir: "tests/e2e/api",
    },
    {
      name: "cms",
      testDir: "tests/e2e/cms",
      use: {
        ...devices["Desktop Chrome"],
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
      },
    },
    {
      name: "ui",
      testDir: "tests/e2e/ui",
      use: {
        ...devices["Desktop Chrome"],
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
      },
    },
  ],
});

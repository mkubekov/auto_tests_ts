import { defineConfig, devices } from "@playwright/test";

// The CLI's `--browser` flag is rejected once a config defines projects, so the browser for
// the cms/ui suites is chosen here instead. Read from the shell environment (the e2e workflow
// sets it), not `.env`, which only the settings module loads.
const BROWSER_DEVICES = {
  chromium: devices["Desktop Chrome"],
  firefox: devices["Desktop Firefox"],
  webkit: devices["Desktop Safari"],
};

function browserDevice(): (typeof BROWSER_DEVICES)[keyof typeof BROWSER_DEVICES] {
  const name = process.env.BROWSER ?? "chromium";
  if (!Object.hasOwn(BROWSER_DEVICES, name)) {
    throw new Error(
      `BROWSER must be one of ${Object.keys(BROWSER_DEVICES).join(", ")} (got ${JSON.stringify(name)})`,
    );
  }
  return BROWSER_DEVICES[name as keyof typeof BROWSER_DEVICES];
}

const browserUse = {
  ...browserDevice(),
  trace: "retain-on-failure",
  screenshot: "only-on-failure",
  video: "retain-on-failure",
} as const;

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
      use: browserUse,
    },
    {
      name: "ui",
      testDir: "tests/e2e/ui",
      use: browserUse,
    },
  ],
});

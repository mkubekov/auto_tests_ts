// Single source of configuration: environment variables plus an optional `.env` file.
//
// Everything that depends on a concrete stand lives here. Nothing else in `src/` reads
// `process.env` directly except the Faker locale (see `data/faker.ts`), so importing models
// or page objects never requires a configured environment.

import { config as loadDotenv } from "dotenv";
import { z } from "zod";

const VIEWPORT_RE = /^(\d{3,5})x(\d{3,5})$/;

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

const settingsSchema = z.object({
  apiBaseUrl: z.url(),
  cmsBaseUrl: z.url(),
  cmsApiBaseUrl: z.url().optional(),
  siteBaseUrl: z.url().optional(),

  apiKey: z.string().min(1),
  cmsEmail: z.string().min(1),
  cmsPassword: z.string().min(1),

  testPagePath: z.string().default("/autotest"),
  // Collapses Python's `viewport: str` field plus its separate `viewport_size` computed
  // property into one declaration (see README §Improvements, improvement #8).
  viewport: z
    .string()
    .default("1920x1080")
    .transform((value, ctx) => {
      const match = VIEWPORT_RE.exec(value);
      if (!match) {
        ctx.addIssue({
          code: "custom",
          message: `viewport must look like WIDTHxHEIGHT, e.g. 1920x1080 (got ${JSON.stringify(value)})`,
        });
        return z.NEVER;
      }
      return { width: Number(match[1]), height: Number(match[2]) };
    }),
  remoteBrowserWs: z.string().optional(),
  browserTimeoutMs: z.coerce.number().int().min(1_000).default(240_000),
  connectTimeoutS: z.coerce.number().positive().default(10),
  readTimeoutS: z.coerce.number().positive().default(60),
  fakerSeed: z.coerce.number().int().optional(),
  globalSearchPath: z.string().default("content/global-search"),
});

type ParsedSettings = z.infer<typeof settingsSchema>;

export interface Settings extends ParsedSettings {
  /** `apiBaseUrl` with any trailing slash removed. */
  readonly apiUrl: string;
  /** `cmsBaseUrl` with any trailing slash removed. */
  readonly cmsUrl: string;
  /** `cmsApiBaseUrl`, or `<cmsUrl>/api/v1` when unset. */
  readonly cmsApiUrl: string;
  /** `siteBaseUrl` with any trailing slash removed, or `undefined` when unset (UI tests skip). */
  readonly siteUrl?: string;
  /** `(connect, read)` timeout for HTTP calls, in seconds. */
  readonly requestTimeout: { connectS: number; readS: number };
}

/**
 * Aggregated settings validation failure. Wraps the underlying `ZodError` so callers can
 * format it however they need (see README §Improvements, improvement #9), while `.message` already
 * reads well on its own (e.g. printed by a CI job).
 */
export class SettingsError extends Error {
  readonly zodError: z.ZodError;

  constructor(zodError: z.ZodError) {
    super(SettingsError.formatIssues(zodError));
    this.name = "SettingsError";
    this.zodError = zodError;
  }

  private static formatIssues(error: z.ZodError): string {
    const lines = error.issues.map(
      (issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`,
    );
    return `Invalid settings:\n${lines.join("\n")}`;
  }
}

function readEnvInput(env: NodeJS.ProcessEnv): Record<keyof ParsedSettings, string | undefined> {
  return {
    apiBaseUrl: env.API_BASE_URL,
    cmsBaseUrl: env.CMS_BASE_URL,
    cmsApiBaseUrl: env.CMS_API_BASE_URL,
    siteBaseUrl: env.SITE_BASE_URL,
    apiKey: env.API_KEY,
    cmsEmail: env.CMS_EMAIL,
    cmsPassword: env.CMS_PASSWORD,
    testPagePath: env.TEST_PAGE_PATH,
    viewport: env.VIEWPORT,
    remoteBrowserWs: env.REMOTE_BROWSER_WS,
    browserTimeoutMs: env.BROWSER_TIMEOUT_MS,
    connectTimeoutS: env.CONNECT_TIMEOUT_S,
    readTimeoutS: env.READ_TIMEOUT_S,
    fakerSeed: env.FAKER_SEED,
    globalSearchPath: env.GLOBAL_SEARCH_PATH,
  };
}

let dotenvLoaded = false;

function ensureDotenvLoaded(): void {
  if (!dotenvLoaded) {
    loadDotenv();
    dotenvLoaded = true;
  }
}

/**
 * Parses and validates settings from `env` (defaults to `process.env`), loading `.env` on
 * first call. Deliberately not evaluated at import time — mirrors the Python `lru_cache
 * get_settings()` laziness contract: importing this module never requires a configured
 * environment.
 */
export function loadSettings(env: NodeJS.ProcessEnv = process.env): Settings {
  ensureDotenvLoaded();

  const result = settingsSchema.safeParse(readEnvInput(env));
  if (!result.success) {
    throw new SettingsError(result.error);
  }

  const parsed = result.data;
  const cmsUrl = stripTrailingSlash(parsed.cmsBaseUrl);

  return {
    ...parsed,
    apiUrl: stripTrailingSlash(parsed.apiBaseUrl),
    cmsUrl,
    cmsApiUrl: parsed.cmsApiBaseUrl ? stripTrailingSlash(parsed.cmsApiBaseUrl) : `${cmsUrl}/api/v1`,
    siteUrl: parsed.siteBaseUrl ? stripTrailingSlash(parsed.siteBaseUrl) : undefined,
    requestTimeout: { connectS: parsed.connectTimeoutS, readS: parsed.readTimeoutS },
  };
}

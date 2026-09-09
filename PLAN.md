# TypeScript Rewrite of cms-autotests — Implementation Plan

## 1. Context

**Why this rewrite exists**

- The user wants to rewrite `D:\Projects\cms-autotests` (a Python/pytest/Playwright-sync/Allure test-automation project) into TypeScript, purely as a **learning exercise and portfolio artifact** to demonstrate TS skill to employers.
- `cms-autotests` is a genericized public template demonstrating patterns from what was originally a ~1000-case production suite. It is architecturally solid — the registry-driven parametrization (one entry per CMS content type drives API/CMS/UI tests) is the standout idea worth preserving.
- The goal of `auto_tests_ts` is **not** a line-by-line port. It rebuilds the same *concepts* (registry pattern, POM, fake-data-as-schema, cleanup stack, reference-data cache, layered fixtures) using idiomatic TS/Playwright-Test tooling, and improves on the original wherever the TS ecosystem genuinely allows it.
- `cms-autotests` stays completely untouched at `D:\Projects\cms-autotests` — read-only reference only, never edited during this work.

**Key constraints that shape the plan**

1. **No live test stand.** Nobody can execute e2e/API/CMS/UI tests against a real backend during this build. The domain being tested is therefore a *self-invented generic content CMS* (banners, headers, footers, page-constructor blocks, etc. — same shape as the Python template, no real product tie-in — user confirmed keeping the same generic domain rather than inventing a new one).
2. **Two tiers of "passing".** Framework self-tests (config, fake data, registry consistency, HTTP client behavior, cleanup stack, assertion helpers — the `tests/unit` equivalent) must run for real, with zero external dependencies, at every step from the moment they exist. E2E-style suites (API/CMS/UI) only need to be **structurally and type-correct**, verified via `playwright test --list` (the direct analog of pytest's `--collect-only`), never actually executed.
3. **Incremental, reviewable pace.** The user commits 1-2 times per session with review each time. Every step below is scoped to fit that cadence, ends in a defined, checkable state, and says explicitly whether that state is fully green or an intentional stepping stone toward the next commit.
4. **Portfolio-quality bar + deliberate improvement.** Every phase below calls out concretely where and why the TS version does something better than the Python original — talking points for interviews, not incidental differences. The README (Step 22) explicitly states this is a TS learning port of the Python original, with a link back to it — chosen deliberately over a "silent" independent-looking repo, since honest attribution reads better to employers than an unexplained copy.

**Locked-in technology decisions** (confirmed with the user, do not revisit):

| Concern | Choice | Python original |
|---|---|---|
| Test runner | Playwright Test (`@playwright/test`), used idiomatically (projects, `test.extend()` fixtures) — not a mechanical port of pytest's parametrize/marks | pytest + pytest-playwright (sync) |
| Schema/validation | zod | pydantic 2 + pydantic-settings |
| Fake data | `@faker-js/faker`, seeded | Faker (seeded) |
| Reporting | Playwright's native HTML reporter + trace viewer | allure-pytest |
| Lint/format | Biome (single tool) + `tsc --noEmit` for type-checking | ruff (lint+format) + ty |
| Package manager | pnpm | uv |
| CMS domain | same generic invented domain as the Python template (banners/headers/footers/pages/etc.) | same |

---

## 2. Target Architecture Overview

### 2.1 Final directory structure — `D:\Projects\auto_tests_ts`

```
auto_tests_ts/
├── package.json                      pnpm scripts: build, lint, test, test:list, format
├── pnpm-lock.yaml
├── tsconfig.json                     strict, NodeNext, ES2022
├── biome.json                        lint + format rules
├── playwright.config.ts              projects: unit / api / cms / ui, reporters, retries
├── .env.example                      documents required/optional env vars
├── .gitignore
├── README.md
├── LICENSE
├── .github/
│   ├── workflows/ci.yml              lint + typecheck + unit tests + e2e --list (no stand)
│   ├── workflows/e2e.yml             manual dispatch, real run against secrets
│   └── dependabot.yml                pnpm + actions, monthly
├── src/
│   ├── config/
│   │   └── settings.ts               zod schema + loadSettings(), lazy/uncached-by-default
│   ├── data/
│   │   ├── faker.ts                  seeded faker instance, runMarker(), uniqueName()
│   │   ├── labels.ts                 UI text / dropdown label maps
│   │   └── files.ts                  resourcePath() for fixture binaries
│   ├── models/                       zod request schemas, one file per module, grouped
│   │   ├── common.ts                 baseFields schema, buildPayload<T>(), Button/Tooltip
│   │   ├── enums.ts                  HttpStatus + CMS string enums
│   │   ├── banners/, blocks/, footer/, handbooks/, header/,
│   │   │   pageConstructor/, regional/, sections/, webhooks/
│   ├── http/
│   │   ├── apiClient.ts              wraps Playwright APIRequestContext
│   │   ├── assertions.ts             assertStatus/assertSchema/assertResponse/assertEcho
│   │   ├── cleanupStack.ts           register-before-assert, LIFO teardown
│   │   └── referenceData.ts          reference-entity cache, worker-fixture-backed
│   ├── registry/
│   │   ├── moduleSpec.ts             ModuleSpec<TSchema> generic type + defineModule()
│   │   ├── modules.ts                the 13 registered modules
│   │   └── selectors.ts              apiModules/writableModules/cmsModules/pageBlockModules
│   └── pages/
│       ├── cms/
│       │   ├── CmsPage.ts            base fluent POM (fill/click/switch/check/upload/save)
│       │   ├── components/           DropDown, TextEditor, Buttons, ColorPicker, Indexing, VideoLoader
│       │   └── banners/, blocks/, footer/, header/, regional/, sections/, webhooks/, pageConstructor/
│       └── site/
│           ├── SitePage.ts           base public-site POM
│           └── pageConstructor/      TextBlockPage, GalleryBlockPage, PageTemplatePage
├── tests/
│   ├── unit/                         project "unit" — no browser, no stand, runs for real
│   │   ├── settings.spec.ts
│   │   ├── faker.spec.ts
│   │   ├── apiClient.spec.ts         mocked APIRequestContext
│   │   ├── cleanupStack.spec.ts
│   │   ├── assertions.spec.ts
│   │   ├── referenceData.spec.ts
│   │   ├── registry.spec.ts
│   │   └── models.spec.ts
│   └── e2e/
│       ├── fixtures.ts               test.extend(): apiClient, anonClient, cleanup,
│       │                             referenceData (worker-scoped), cmsCookies, cmsPage,
│       │                             sitePage, pageWithBlock
│       ├── helpers.ts                createEntity()
│       ├── api/crud.spec.ts, header.spec.ts, negative.spec.ts
│       ├── cms/create.spec.ts
│       └── ui/render.spec.ts
```

### 2.2 Python → TypeScript file mapping

| Python (`cmstest/…`) | TypeScript (`src/…`) | Notes |
|---|---|---|
| `settings.py` | `config/settings.ts` | pydantic-settings → zod `safeParse` over `process.env` |
| `registry.py` | `registry/moduleSpec.ts` + `modules.ts` + `selectors.ts` | one dataclass+dict → generic type + typed builder + pure selector fns |
| `http/client.py` | `http/apiClient.ts` | `requests.Session` → Playwright `APIRequestContext` |
| `http/assertions.py` | `http/assertions.ts` | 1:1 concept port |
| `http/cleanup.py` | `http/cleanupStack.ts` | 1:1 concept port |
| `http/references.py` | `http/referenceData.ts` | module-level singleton → worker-scoped fixture |
| `reporting/attachments.py` | *(deleted, no replacement file)* | `testInfo.attach()` + trace viewer replace it entirely |
| `models/**` | `models/**` | pydantic `BaseModel` → zod schema, `default_factory` → `.default(fn)` |
| `models/common.py: build_payload` | `models/common.ts: buildPayload` | `model().model_dump()` → `schema.parse({})` |
| `pages/cms/base.py` | `pages/cms/CmsPage.ts` | fluent API preserved almost verbatim |
| `pages/site/base.py` | `pages/site/SitePage.ts` | 1:1 concept port |
| `data/generators.py` | `data/faker.ts` | `Faker` → `@faker-js/faker`, same seed/run-marker idea |
| `data/enums.py`, `labels.py`, `files.py` | `models/enums.ts`, `data/labels.ts`, `data/files.ts` | 1:1 |
| `tests/conftest.py` (root) | `playwright.config.ts` global setup + `tests/unit` | Faker seeding moves to config-level setup |
| `tests/e2e/conftest.py` | `tests/e2e/fixtures.ts` | conftest fixtures → `test.extend()` fixtures |
| `tests/e2e/helpers.py` | `tests/e2e/helpers.ts` | 1:1 |
| `tests/unit/*` | `tests/unit/*` | pytest functions → Playwright Test `test()` blocks |
| `.github/workflows/ci.yml` | `.github/workflows/ci.yml` | uv → pnpm, ruff/ty → biome/tsc, `--collect-only` → `--list` |
| `.github/workflows/e2e.yml` | `.github/workflows/e2e.yml` | Allure report build/upload → Playwright HTML report/traces upload |

### 2.3 Deliberate improvements over the Python original (concrete, not marketing)

1. **Runtime validation TS doesn't get for free.** Vanilla TS erases types at compile time — `const x = (await res.json()) as Foo` is a lie the compiler can't check. Python already has dynamic typing at runtime, so pydantic there is "extra" safety; in TS, zod is what makes `response.json()` *actually* trustworthy. Every `assertSchema`/`assertResponse` call in the TS version closes a hole that exists by default in TS and didn't in Python.
2. **`ModuleSpec<TSchema>` is a real generic, not a dataclass of loosely-typed fields.** Python's `patch_field: str` and `request_model: type[BaseModel]` are unconstrained — nothing stops a typo like `patch_field="nmae"`. In TS, `patchField: keyof z.infer<TSchema> & string` makes that a compile error. Likewise `CmsPageClass?: new (page: Page) => CmsPage<z.infer<TSchema>>` ties the admin-form page object's generic type parameter to the exact model it edits, so `createElement(payload)` is typed against the *specific* module's fields at every call site, not a bare `dict[str, Any]`.
3. **No bespoke reporting layer.** Python needed `reporting/attachments.py` + the `curlify` dependency because `requests` + pytest + Allure don't attach anything automatically. Playwright Test's `testInfo.attach()` plus the built-in trace viewer (step-through DOM snapshots, network log, console, per-action screenshots) do this natively — an entire module and a dependency are deleted outright; what remains (`ApiClient`) only needs a small `attach()` helper for curl-repro text, not a whole attachment abstraction.
4. **Trace viewer > static screenshot-on-fail.** Allure's failure artifact is a screenshot + curl text. Playwright's `trace: 'retain-on-failure'` gives a scrubbable timeline of the whole test (DOM before/after every action, network waterfall, console) — strictly more information for debugging a CI failure, for the same one-line config.
5. **Worker-scoped fixtures replace the manual global singleton.** Python's `ReferenceData` needs a module-level mutable global (`_current`) plus an explicit `override_references()` context manager because pytest fixtures are function-scoped by default and cross-process worker isolation isn't automatic. Playwright Test's fixture system has first-class `{ scope: 'worker' }` fixtures — one instance per worker process, automatic setup/teardown, no manual global state, no override-and-restore dance for tests that need a stub.
6. **Declarative suite selection via projects, not markers + CLI flags.** Python selects `api`/`cms`/`ui` suites by directory path passed on the CLI, each with ad-hoc flags (`--browser`, `--screenshot`, `--tracing`) glued together in workflow YAML. Playwright `projects` in `playwright.config.ts` declare each suite's `testDir`, browser, retries, and trace/screenshot policy once, in version-controlled config — the CI YAML just says `--project=api`.
7. **One test runner for everything.** Instead of pytest for unit+e2e and a separate assertion/mocking story, Playwright Test runs `tests/unit` (no browser fixtures touched → nothing launches) and `tests/e2e` (browser/API fixtures) through the *same* binary, same config, same HTML reporter — fewer moving parts than pytest + pytest-playwright + pytest-xdist + pytest-rerunfailures + allure-pytest stacked together.
8. **Zod's `.transform()` collapses a two-step config pattern into one.** Python's `Settings.viewport: str` plus a separate `viewport_size` computed property becomes a single zod field: a regex-validated string transformed directly into `{ width, height }` at parse time — one declaration instead of a field + a derived property kept in sync by hand.
9. **`safeParse` aggregates config errors, explicitly typed.** Same idea as pydantic's validation-error aggregation (all missing/invalid env vars reported together, not one-at-a-time), but the *shape* of the error is a typed `ZodError` the caller can format however CI needs, rather than pydantic's exception-to-string.

---

## 3. Ordered Commit Plan

Legend: **[GREEN]** = fully working at the end of this step. **[STEPPING STONE]** = intentionally incomplete/red in one narrow way, resolved by the very next step (called out explicitly).

### Phase 0 — Scaffolding & Tooling

**Step 1 — Initialize the pnpm/TypeScript skeleton**
- Create: `package.json` (name, private, `"type": "module"`, `engines.node >=20`), `tsconfig.json` (`strict: true`, `module: NodeNext`, `moduleResolution: NodeNext`, `target: ES2022`, `include: ["src", "tests"]`), `.gitignore` (`node_modules`, `test-results`, `playwright-report`, `.env`, `dist`), `README.md` stub (one paragraph: what this is, link back to the Python original as inspiration), `LICENSE` (MIT, same author).
- Add one placeholder file so `tsc` has something to compile: `src/index.ts` with a top-of-file comment describing the project and `export {}`.
- Commit: `chore: scaffold pnpm + TypeScript project skeleton`
- Done check: `pnpm install` succeeds; `pnpm exec tsc --noEmit` succeeds.
- **[GREEN]**

**Step 2 — Biome + npm scripts**
- Create: `biome.json` (formatter: double quotes/2-space indent to taste, linter: recommended + a few strict rules mirroring the Python ruff selection — no-unused-vars, no-explicit-any where reasonable).
- Edit `package.json`: add scripts `"lint": "biome check ."`, `"format": "biome format --write ."`, `"build": "tsc --noEmit"`.
- Commit: `chore: configure Biome for lint and format`
- Done check: `pnpm lint` and `pnpm build` both pass.
- **[GREEN]**

**Step 3 — Playwright Test wiring**
- Add devDependency `@playwright/test`. Create `playwright.config.ts` with four `projects`: `unit` (`testDir: 'tests/unit'`, no browser use), `api` (`testDir: 'tests/e2e/api'`, no browser use, uses `APIRequestContext`), `cms` and `ui` (`testDir: 'tests/e2e/cms'` / `'tests/e2e/ui'`, `use: { ...devices['Desktop Chrome'] }`, `trace: 'retain-on-failure'`, `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`). Set `reporter: [['html', { open: 'never' }]]`, `fullyParallel: true`.
- Add one temporary smoke test `tests/unit/_smoke.spec.ts` (`test('wiring works', () => expect(1 + 1).toBe(2))`) — clearly commented as temporary, deleted in Step 11 once real unit tests exist.
- Add script `"test": "playwright test --project=unit"`, `"test:list": "playwright test --project=api --project=cms --project=ui --list"`.
- Commit: `chore: add Playwright Test runner with unit/api/cms/ui projects`
- Done check: `pnpm test` runs and passes (the smoke test); `pnpm test:list` runs (0 tests found is fine — projects/dirs exist but are empty).
- **[STEPPING STONE]** — smoke test is a placeholder, removed once Phase 5 lands real unit tests.

### Phase 1 — Config & Fake Data

**Step 4 — Settings module**
- Add dependencies `zod`, `dotenv`.
- Create `src/config/settings.ts`: a zod object schema mirroring `Settings` field-for-field (`apiBaseUrl`, `cmsBaseUrl`, `cmsApiBaseUrl?`, `siteBaseUrl?`, `apiKey`, `cmsEmail`, `cmsPassword`, `testPagePath` default `/autotest`, `viewport` regex-validated + `.transform()` into `{width,height}`, `remoteBrowserWs?`, `browserTimeoutMs` default `240_000`, `connectTimeoutS`/`readTimeoutS` defaults, `fakerSeed?`, `globalSearchPath?` default `content/global-search`). Export `loadSettings(env = process.env)` (calls `dotenv.config()` once, then `schema.safeParse`, throws a readable aggregated error on failure) — **not** eagerly evaluated at import time, so importing the module never requires a configured environment (mirrors the Python `lru_cache get_settings()` laziness contract).
- Create `.env.example` mirroring the Python one, adapted to the generic-CMS domain (comment header explaining "copy to `.env`, never commit it").
- Commit: `feat: add zod-based settings with env validation`
- Done check: `pnpm build` and `pnpm lint` pass; `pnpm test` still passes (settings module isn't imported by anything yet, so nothing breaks from missing env vars).
- **[GREEN]**

**Step 5 — Fake data generators**
- Add dependency `@faker-js/faker`.
- Create `src/data/faker.ts`: seeded `faker` instance (`FAKER_LOCALE` read directly from `process.env`, not through `settings.ts` — same "models never need full config" contract as Python), `RUN_ID` (short random hex generated once per process), `runMarker()`, `uniqueName()`.
- Create `src/data/labels.ts` (UI text / dropdown label constants for the invented generic CMS domain — banners, headers, footers, etc.) and `src/data/files.ts` (`resourcePath()` resolving fixture files under a new `src/resources/` directory; add 2-3 placeholder binary fixtures: an SVG icon, a small image, a sample text file).
- Commit: `feat: add seeded fake-data generators and fixture resource helpers`
- Done check: `pnpm build`/`pnpm lint` pass.
- **[GREEN]**

### Phase 2 — HTTP Layer

**Step 6 — ApiClient + assertions**
- Create `src/http/apiClient.ts`: class wrapping a Playwright `APIRequestContext` (constructed by the caller via `request.newContext({ baseURL, extraHTTPHeaders })` or similar), exposing `get/post/patch/put/delete`, a `defaultHeaders` getter (api-key header), `withoutAuth()` (returns a client sharing the same context but with no key), and a `request()` core method that wraps the call in `test.step(...)` and — when `test.info()` is available — attaches a curl-repro string and the request body via `testInfo.attach()` (the direct, deliberately smaller replacement for Python's `Attachments` class — see improvement #3).
- Create `src/http/assertions.ts`: `assertStatus`, `assertSchema` (zod `.safeParse` over body or every item of an array body), `assertResponse` (status + optional schema + attaches response headers/body), `jsonValue`, `assertEcho` (every sent key must be present in the received object).
- Commit: `feat: add ApiClient wrapping Playwright APIRequestContext with assertion helpers`
- Done check: `pnpm build`/`pnpm lint` pass.
- **[GREEN]**

**Step 7 — CleanupStack + ReferenceData**
- Create `src/http/cleanupStack.ts`: `CleanupStack` class — `add(path)`, `pending`, async `run()` that deletes registered paths in reverse order via the bound `ApiClient`, swallowing exceptions/non-2xx-or-404 into a returned list of failures (never throws — teardown must not mask the original test failure), same as Python.
- Create `src/http/referenceData.ts`: `ReferenceData` class with `first(key)`/`value(key, field)`/`clear()`, backed by a fixed `DEFAULT_REFERENCE_PATHS` map (categories/labels/cities/footerSections/headerCategories/headerSubcategories). No module-level singleton here — deliberately deferred to Phase 7's worker-scoped fixture (improvement #5); this file only holds the class.
- Commit: `feat: add cleanup stack and reference-data cache`
- Done check: `pnpm build`/`pnpm lint` pass.
- **[GREEN]**

### Phase 3 — Domain Models

**Step 8 — Shared model building blocks**
- Create `src/models/enums.ts` (HttpStatus numeric enum/const-object + a few CMS string enums for the invented domain: ButtonStyle, ButtonAction, etc.).
- Create `src/models/common.ts`: `baseFields` zod object (`id`/`createdAt`/`updatedAt` optional, `name` with `.default(() => uniqueName())`), `buttonSchema`, `tooltipSchema`, and `buildPayload<T extends z.ZodTypeAny>(schema: T): z.infer<T>` = `schema.parse({})` (relies on every field having a `.default()`, exactly mirroring Python's `model().model_dump(...)` contract).
- Commit: `feat: add shared zod model building blocks (common fields, buildPayload)`
- Done check: `pnpm build`/`pnpm lint` pass.
- **[GREEN]**

**Step 9 — All 13 module schemas**
- Create one zod schema file per module, grouped exactly like the Python `models/` folders, for the invented generic-CMS domain: `models/webhooks/webhook.ts`, `models/blocks/statistic.ts`, `models/blocks/accordion.ts`, `models/banners/banner.ts`, `models/banners/promoBanner.ts`, `models/footer/footerSection.ts`, `models/footer/footer.ts`, `models/header/headerSubcategory.ts`, `models/header/headerCategory.ts`, `models/header/header.ts`, `models/regional/city.ts`, `models/sections/videoLessons.ts`, `models/handbooks/handbook.ts`, `models/pageConstructor/textBlock.ts`, `models/pageConstructor/galleryBlock.ts`, `models/pageConstructor/page.ts`. Each extends/merges `baseFields` and uses `.default(() => faker...)` per field, matching each Python model's field list and generator choices 1:1.
- Add a barrel `src/models/index.ts` re-exporting all schemas.
- Commit(s): can be one commit (`feat: add zod schemas for all 13 CMS modules`) or split across two sessions (e.g. banners/blocks/footer/header first, then handbooks/regional/sections/webhooks/pageConstructor) — either is fine since each file is independent and additive.
- Done check: `pnpm build`/`pnpm lint` pass.
- **[GREEN]**

### Phase 4 — Registry

**Step 10 — ModuleSpec type + the 13-entry registry**
- Create `src/registry/moduleSpec.ts`: the generic `ModuleSpec<TSchema extends z.ZodTypeAny>` interface (key, apiPath, schema, cmsPath?, CmsPageClass?, SitePageClass?, blockType?, standalone, `patchField: keyof z.infer<TSchema> & string`, cmsSkipReason?) plus a `defineModule<TSchema>(spec: ModuleSpec<TSchema>): ModuleSpec<TSchema>` identity helper purely for inference ergonomics at each call site (see improvement #2). `CmsPageClass`/`SitePageClass` reference the real POM base classes, but those don't exist until Phase 6 — for now type them loosely as `new (page: Page) => unknown` (a TODO comment marks this); tighten to the real generic bound once `CmsPage<T>` exists in Step 13. This keeps registry and POM decoupled and buildable independently — a deliberate ordering choice worth noting in review.
- Create `src/registry/modules.ts`: the 13 `defineModule(...)` entries, values ported directly from the Python `_SPECS` list (same keys, api paths, standalone flags, patch fields, cms skip reasons, block types).
- Create `src/registry/selectors.ts`: `apiModules()`, `writableModules()`, `cmsModules()` (each returns `{ module, skipReason? }` instead of pytest marks — Playwright has no direct "skip with reason" mark equivalent for parametrized loops, so this becomes a plain `test.skip(condition, reason)` call inside the loop body in Phase 7), `pageBlockModules()`.
- Commit: `feat: add generic ModuleSpec type and the 13-module registry`
- Done check: `pnpm build`/`pnpm lint` pass.
- **[GREEN]**

### Phase 5 — Framework Self-Tests ("unit" project, runs for real)

**Step 11 — Tests for config/data/http layers**
- Create `tests/unit/settings.spec.ts` (valid env parses; missing required var produces an aggregated `ZodError`; viewport regex + transform), `tests/unit/faker.spec.ts` (`runMarker()`/`uniqueName()` shape and uniqueness, seed reproducibility), `tests/unit/apiClient.spec.ts` (constructs a fake/mocked `APIRequestContext` — e.g. via a small manual stub object satisfying the subset of the interface used — asserts default headers, `withoutAuth()` clone, curl-attachment behavior), `tests/unit/cleanupStack.spec.ts` (LIFO order, swallows failures, returns failed paths), `tests/unit/assertions.spec.ts` (assertStatus/assertSchema/assertEcho pass/fail cases), `tests/unit/referenceData.spec.ts` (caches after first call, throws on unknown key, throws on empty collection).
- Delete `tests/unit/_smoke.spec.ts` from Step 3.
- Commit: `test: add framework self-tests for config, fake data, and HTTP layer`
- Done check: `pnpm test` (i.e. `playwright test --project=unit`) passes with all real assertions, zero live network/browser use.
- **[GREEN]**

**Step 12 — Tests for registry + models**
- Create `tests/unit/registry.spec.ts` (registry keys match `module.key`; every module has a schema; `cmsPath`/`CmsPageClass` presence agree; `blockType` only set for page-constructor modules; `cmsSkipReason` only set when a CMS page exists; selector helpers reflect the registry exactly — direct port of Python's `test_registry.py` assertions), `tests/unit/models.spec.ts` (every schema's `buildPayload` output re-validates against itself — a round-trip check pydantic gets for free via `model_dump` + `model_validate` that zod needs an explicit test for).
- Commit: `test: add registry consistency and model round-trip tests`
- Done check: `pnpm test` passes, still 0 browser/network dependency; `pnpm build`/`pnpm lint` pass.
- **[GREEN]** — this is the point where the TS project has full parity with Python's `tests/unit` suite.

### Phase 6 — CMS & Site Page Objects (POM)

**Step 13 — CmsPage base + shared components**
- Create `src/pages/cms/CmsPage.ts`: generic `CmsPage<TPayload = unknown>` base class with the fluent primitives (`fill`, `click`, `switch`, `check`, `upload`, `clickDashed`, `switchTab`, `fillName`, `save` — captures `createdId` from the 201 response the same way, via a `page.on('response', ...)` listener removed in `finally`), `cancel`, `checkItem`/`checkText`/`checkFile`, abstract `createElement(payload)` / `checkCreatedItem(payload, created)`, and `verifyCreated(client, apiPath, payload, checks?)` (re-reads via API, not UI — same "prefer id, fall back to name lookup" logic). Use `test.step()` in place of `allure.step()` for every primitive.
- Create `src/pages/cms/components/`: `DropDown.ts`, `TextEditor.ts`, `Buttons.ts`, `ColorPicker.ts`, `Indexing.ts`, `VideoLoader.ts` — thin component wrappers matching the Python ones' responsibilities.
- Go back and tighten `ModuleSpec.CmsPageClass` in `src/registry/moduleSpec.ts` to `new (page: Page) => CmsPage<z.infer<TSchema>>` (the payoff of improvement #2 — do it in this commit, not Step 10, so the generic bound only needs to exist once `CmsPage` is real).
- Commit: `feat: add base CmsPage POM and shared Ant Design components`
- Done check: `pnpm build`/`pnpm lint` pass.
- **[GREEN]**

**Step 14 — SitePage base + page-constructor site pages**
- Create `src/pages/site/SitePage.ts` (open/click/hover/expectText/expectVisible primitives).
- Create `src/pages/site/pageConstructor/`: `TextBlockPage.ts`, `GalleryBlockPage.ts`, `PageTemplatePage.ts`.
- Commit: `feat: add base SitePage POM and page-constructor site page objects`
- Done check: `pnpm build`/`pnpm lint` pass.
- **[GREEN]**

**Step 15 — Per-module CMS page objects, wired into the registry**
- Create the remaining CMS page-object files grouped like Python: `pages/cms/banners/Banner.ts`, `PromoBanner.ts`; `pages/cms/blocks/Statistic.ts`, `Accordion.ts`; `pages/cms/footer/FooterSection.ts`, `Footer.ts`; `pages/cms/header/HeaderSubcategory.ts`, `HeaderCategory.ts`, `Header.ts`; `pages/cms/regional/City.ts`; `pages/cms/sections/VideoLessons.ts`; `pages/cms/pageConstructor/TextBlock.ts`, `GalleryBlock.ts`, `PageTemplate.ts`; `pages/cms/webhooks/Webhook.ts`. Each implements `createElement`/`checkCreatedItem` against its own module's locators (invented generic CMS markup, documented as illustrative since there's no real admin panel to inspect — note this explicitly in a code comment, same posture as the Python template).
- Edit `src/registry/modules.ts` to reference the real `CmsPageClass`/`SitePageClass` for every module (removing any temporary loose typing from Step 10).
- Commit: `feat: add per-module CMS page objects and wire them into the registry`
- Done check: `pnpm build`/`pnpm lint` pass; `pnpm test` (unit) still passes — `registry.spec.ts` from Step 12 now exercises the fully wired registry.
- **[GREEN]**

### Phase 7 — E2E-style Test Suites (structurally correct, `--list`-verified only)

**Step 16 — E2E fixtures + helpers**
- Create `tests/e2e/fixtures.ts`: `test.extend()` building a custom `test` with fixtures `settings` (worker-scoped, lazy `loadSettings()`), `apiClient` (worker-scoped, constructs `APIRequestContext` + `ApiClient`), `anonClient` (`apiClient.withoutAuth()`), `referenceData` (worker-scoped `ReferenceData`, replacing Python's global singleton per improvement #5), `cleanup` (test-scoped `CleanupStack`, runs `.run()` in fixture teardown after `use()`), `cmsCookies` (worker-scoped: logs into the CMS auth endpoint once, returns cookie values), `cmsPage` (test-scoped `Page` with cookies injected), `sitePage` (test-scoped `Page`, `test.skip()`s when `siteUrl` is unset — Playwright's direct equivalent of `pytest.skip`), `pageWithBlock` (creates a block + an embedding page template, returns `{ module, payload, created }`), plus a worker-scoped teardown that deletes anything tagged with the run marker via the global-search endpoint at the end of the worker (decide between Playwright's `globalTeardown` or a worker-fixture-teardown, whichever reads more idiomatically, and note the choice in a code comment).
- Create `tests/e2e/helpers.ts`: `createEntity(client, cleanup, module, payload?)` — POST, register cleanup *before* asserting, `assertResponse`, return `{ payload, created }`.
- Commit: `feat: add e2e fixtures (test.extend) and shared test helpers`
- Done check: `pnpm build`/`pnpm lint` pass. `pnpm test:list` — this is the first step where the `api`/`cms`/`ui` projects have real support code but still zero `*.spec.ts` files, so listing reports 0 tests (expected, not a failure).
- **[GREEN]** for build/lint; e2e projects remain empty by design until the next steps.

**Step 17 — API suite**
- Create `tests/e2e/api/crud.spec.ts`: loops over `apiModules()`/`writableModules()` building `test()` calls for list/create/update/delete, mirroring `test_crud.py` (`GET` schema check, `POST` + `assertEcho`, `PATCH` + re-read, `DELETE` + 404 re-read).
- Create `tests/e2e/api/header.spec.ts`: the non-standalone `headers` module flow (create a header category first, then a header referencing it) — direct port of `test_header.py`.
- Create `tests/e2e/api/negative.spec.ts`: `anonClient` 401/403 checks across modules — direct port of `test_negative.py`.
- Commit: `feat: add API test suite (crud, header dependency, negative auth)`
- Done check: `pnpm build`/`pnpm lint` pass; `cp .env.example .env && pnpm exec playwright test --project=api --list` enumerates every expected test id without executing anything (no live stand needed — fixtures aren't instantiated during `--list`).
- **[GREEN]** as a structural/typecheck target; tests are never run live (by design, per constraint #2).

**Step 18 — CMS suite**
- Create `tests/e2e/cms/create.spec.ts`: loops over `cmsModules()`, `test.skip()`s per-module when a `cmsSkipReason` is set (visible in the HTML report, same spirit as Python's marked skip with a reason), otherwise fills the form via the module's `CmsPageClass`, saves, and `verifyCreated()`s through the API.
- Commit: `feat: add CMS admin-panel test suite`
- Done check: `cp .env.example .env && pnpm exec playwright test --project=cms --list` enumerates all expected test ids (including the skipped one, shown as skipped-with-reason at list time if Playwright surfaces it, otherwise noted in the spec via a comment).
- **[GREEN]** structurally; never run live.

**Step 19 — UI suite**
- Create `tests/e2e/ui/render.spec.ts`: loops over `pageBlockModules()` using the `pageWithBlock` fixture, opens the public site page via the block's `SitePageClass`, asserts rendered text/visibility — port of `test_render.py`.
- Commit: `feat: add public-site rendering test suite`
- Done check: `pnpm exec playwright test --project=ui --list` enumerates expected test ids; `pnpm build`/`pnpm lint` pass project-wide.
- **[GREEN]** structurally; never run live. This is the last "new test code" step — from here the project is feature-complete relative to the Python original.

### Phase 8 — CI

**Step 20 — `ci.yml` (quality gate, no live stand)**
- Create `.github/workflows/ci.yml`: one `quality` job — checkout, `pnpm/action-setup`, `actions/setup-node` with pnpm cache, `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm build` (tsc --noEmit), `pnpm test` (real unit run), then `cp .env.example .env && pnpm exec playwright test --project=api --project=cms --project=ui --list` (proves registry-driven parametrization resolves with no stand, no browsers installed — direct analog of the Python `--collect-only` job). A second `secrets` job running `gitleaks/gitleaks-action@v2`, unchanged in spirit from Python.
- Commit: `ci: add quality workflow (lint, typecheck, unit tests, e2e --list, secret scan)`
- Done check: push/PR triggers the workflow; verify locally first by running the exact same command sequence in a terminal.
- **[GREEN]**

**Step 21 — `e2e.yml` (manual dispatch, real run) + dependabot**
- Create `.github/workflows/e2e.yml`: `workflow_dispatch` with `suite` (api/cms/ui), `browser` (chromium/firefox/webkit), `viewport`, `faker_seed` inputs; env vars pulled from repo secrets matching `.env.example`'s required vars; installs Playwright browsers only when `suite != 'api'`; runs `pnpm exec playwright test --project=${{ inputs.suite }} --retries=2` (with `--browser=${{ inputs.browser }}` for cms/ui); uploads `playwright-report/` and `test-results/` via `actions/upload-artifact@v4` with `if: always()`.
- Create `.github/dependabot.yml`: monthly updates for the npm/pnpm ecosystem and `github-actions`.
- Commit: `ci: add manual e2e workflow and dependabot config`
- Done check: workflow file validates (GitHub's Actions tab syntax check, or `gh workflow view`); cannot be run for real without a stand — note this explicitly in the workflow's top comment, same posture as the Python original's `e2e.yml`.
- **[GREEN]** (file is correct and inert until secrets exist).

### Phase 9 — Polish

**Step 22 — README, docs, final metadata**
- Rewrite `README.md`: project purpose, architecture summary, an explicit **"this is a TypeScript learning port of [cms-autotests], rewritten under TS idioms"** statement linking back to the Python original (honest attribution, per user's preference), a "why this is a rewrite not a port" section referencing the improvements from §2.3, how to run `pnpm test` (real) vs `pnpm test:list` (dry run, explains the no-stand constraint plainly), how to add a new CMS module (one registry entry — the showpiece).
- Fill in `package.json` metadata (description, keywords, repository, author `mkubekov@gmail.com`).
- Optional stretch (call out as genuinely optional, not required for portfolio completeness): add `husky` + `lint-staged` for a pre-commit hook running `biome check --staged` and `tsc --noEmit`, as the closest analog to Python's `pre-commit` + local ruff/ty hooks; mention `Symbol.asyncDispose`/`await using` as a possible future enhancement to `CleanupStack` once Node's stable support is confirmed, without blocking this step on it.
- Commit: `docs: write README and finalize project metadata`
- Done check: `pnpm build && pnpm lint && pnpm test` all green; `pnpm test:list` enumerates the full suite; README renders cleanly.
- **[GREEN]** — end state.

---

## 4. Verification Section — Health Checks At Any Point

Run these from `D:\Projects\auto_tests_ts` (all should be run together at the end of each session, before considering a step "done"):

| Check | Command | What it proves |
|---|---|---|
| Install | `pnpm install --frozen-lockfile` | Lockfile is consistent, no drift |
| Type safety | `pnpm build` (→ `tsc --noEmit`) | Every `.ts` file compiles under `strict` |
| Lint/format | `pnpm lint` (→ `biome check .`) | Style + static-analysis rules pass |
| Framework self-tests | `pnpm test` (→ `playwright test --project=unit`) | Config/fake-data/HTTP/registry/model logic actually runs and passes, zero external deps |
| E2E structural check | `cp .env.example .env && pnpm exec playwright test --project=api --project=cms --project=ui --list` | Registry-driven parametrization resolves into the expected test ids without a live stand or browsers installed (direct analog of Python's `pytest --collect-only`) |
| Full local dry run (once Phase 7 exists) | Compare `--list` output's count/names against the registry's `apiModules()/cmsModules()/pageBlockModules()` output | Confirms no module silently fails to parametrize |
| CI parity | Re-run the exact command sequence from `.github/workflows/ci.yml` locally before pushing | Avoids "works on my machine" CI surprises |

At the very end of the plan (post Step 22), the project should satisfy **all** of the above simultaneously — that combined state is the definition of "done" for the rewrite.

---

## 5. How to use this plan going forward

- Each future session: open this file, find the next unfinished step, implement it, run its "done check", then commit with the suggested message (adjust wording as needed).
- If a step turns out too large for one sitting, it's fine to split it further — the plan's steps are a default granularity, not a hard contract.
- Update this file if reality diverges (e.g. a step gets reordered, a package choice changes) so it stays the accurate source of truth for the rewrite.
- Reference implementation for behavior/patterns: `D:\Projects\cms-autotests` (read-only, do not modify).

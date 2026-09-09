# CLAUDE.md

Instructions for Claude Code when working in this repository.

## What this project is

`auto_tests_ts` is a **TypeScript learning port** of `D:\Projects\cms-autotests` (a Python/pytest/Playwright test-automation project), built as a portfolio artifact for job applications. It is **not** a line-by-line translation — it rebuilds the same concepts (registry-driven parametrized testing, Page Object Model, fake-data-as-schema, cleanup stack, reference-data cache) using idiomatic TypeScript/Playwright-Test tooling, and deliberately improves on the original wherever the TS ecosystem allows it.

- **Source of truth for the plan**: `PLAN.md` in this directory. Always read it before starting work in a new session.
- **Reference implementation**: `D:\Projects\cms-autotests` — read-only. Never edit files there. Consult it to see the Python patterns being reimagined, not to copy verbatim.

## How to work in this repo

1. **Start of session**: read `PLAN.md`, find the next unfinished step (steps are numbered 1–22, grouped into phases). If unsure which step is next, check git log / current file tree against the plan's directory structure.
2. **Do one step per session** (occasionally two small ones), not more — the user explicitly wants to review and commit incrementally, 1-2 commits per session. Do not jump ahead to later phases even if it seems efficient.
3. **Each step ends with its "done check" passing** before committing — run the commands listed for that step in `PLAN.md` (typically some combination of `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm test:list`).
4. **Commit message**: use the suggested message from the plan for that step (conventional-commits style: `feat:`, `chore:`, `test:`, `ci:`, `docs:`), adjusted if the actual work diverged slightly. Only commit when the user asks you to (per standard Claude Code behavior) — don't auto-commit without confirmation unless the user has said to proceed autonomously for this session.
5. **If a step needs to be split further or reordered**, that's fine — the plan's granularity is a default, not a hard contract. Update `PLAN.md` to reflect any deviation so it stays accurate.
6. **Never touch `D:\Projects\cms-autotests`.**

## Key constraints (do not violate)

- **No live test stand exists.** Nobody can run the e2e/API/CMS/UI Playwright tests against a real backend. Two tiers of "passing" apply:
  - `tests/unit/**` (framework self-tests: config, fake data, HTTP client, cleanup stack, registry, models) must **actually run and pass** — zero external dependencies, real assertions.
  - `tests/e2e/**` (API/CMS/UI suites) only need to be **structurally and type-correct**, verified with `playwright test --list` (never executed for real). Do not claim these tests "pass" — they are only proven to type-check and parametrize correctly.
- The CMS domain being tested is a **self-invented generic content CMS** (banners, headers, footers, page-constructor blocks, etc.) — the same conceptual shape as the Python template, not tied to any real product.
- Every commit should leave the repo in the state described by its step in `PLAN.md` (GREEN or an explicitly-noted STEPPING STONE resolved by the very next step) — never leave `pnpm build` or `pnpm lint` broken across a commit boundary.

## Locked-in technology choices — do not swap without asking

| Concern | Choice |
|---|---|
| Test runner | Playwright Test (`@playwright/test`) — used idiomatically (projects, `test.extend()` fixtures), not a mechanical port of pytest |
| Schema/validation | zod |
| Fake data | `@faker-js/faker`, seeded |
| Reporting | Playwright's native HTML reporter + trace viewer (no Allure) |
| Lint/format | Biome (`biome check .`) + `tsc --noEmit` for type-checking |
| Package manager | pnpm |

## Conventions

- `"type": "module"`, Node >=20, `tsconfig.json` strict mode, `NodeNext` module resolution.
- Directory layout follows `PLAN.md` §2.1 exactly (`src/config`, `src/data`, `src/models`, `src/http`, `src/registry`, `src/pages/cms`, `src/pages/site`, `tests/unit`, `tests/e2e`).
- File-per-module grouping in `models/` and `pages/cms/` mirrors the Python project's folder grouping (banners/, blocks/, footer/, handbooks/, header/, pageConstructor/, regional/, sections/, webhooks/) — see the Python→TS file mapping table in `PLAN.md` §2.2.
- When a design choice deliberately improves on the Python original, note it briefly in a code comment and cross-reference `PLAN.md` §2.3 if it's one of the 9 documented improvements.
- No comments explaining *what* code does — only *why*, when non-obvious (mirrors the general engineering conventions already in effect for this session).

## Commands (once scaffolding exists — Step 1+)

- `pnpm install` — install deps
- `pnpm build` — `tsc --noEmit`, type-check everything
- `pnpm lint` — `biome check .`
- `pnpm format` — `biome format --write .`
- `pnpm test` — real run of `tests/unit` only (`playwright test --project=unit`)
- `pnpm test:list` — dry-run/list `api`, `cms`, `ui` projects without executing (structural check, needs `.env` copied from `.env.example` first: `cp .env.example .env`)

# Improvement Plan

## Overview

This document tracks concrete improvements that still look worthwhile after comparing earlier review notes with the current repository state.

It is intentionally not a dump of every possible cleanup.
The goal is to keep one realistic backlog that reflects:

- the current parser and generator surface area
- the JSON Schema generator work
- the TypeScript parser preprocess boundary
- the places where behavior risk is still higher than confidence

Items are ordered by practical value for the current phase, not only by code smell.

## Refactoring Checklist

Use this as the working sequence for the next cleanup passes.
Each item is intentionally scoped so it can become one focused PR or one tightly-related patch set.

### Checklist 1: Fix the SDK aggregation surface (Completed)

- add `export * from "@aio/parser-typescript"` in [packages/sdk/src/index.ts](../../packages/sdk/src/index.ts)
- add `@aio/parser-typescript` to [packages/sdk/package.json](../../packages/sdk/package.json)
- add the matching `@aio/parser-typescript` alias in [vitest.config.ts](../../vitest.config.ts)
- add or update one SDK-level test that proves TypeScript parser exports are reachable through `@aio/sdk`
- verify `pnpm test` and `pnpm typecheck`

### Checklist 2: Make JSON merge behavior explicit and testable (Completed)

- document the chosen merge contract in code comments or nearby docs
- expand [tests/parsers/json/merge.test.ts](../../tests/parsers/json/merge.test.ts) to cover the main merge paths
- keep `merge.ts` on the pure-return path so callers are not exposed to hidden input mutation
- keep the current documented left-biased `unknown` reason retention until the unknown-node model changes
- verify `pnpm test`

### Checklist 3: Remove dead or weak safety-net code (Completed)

- delete [packages/generators/typescript/src/render.ts](../../packages/generators/typescript/src/render.ts)
- replace tautological success assertions in the integration tests with explicit success guards and output assertions
- remove or replace [tests/core/ir-v0-cases.test.ts](../../tests/core/ir-v0-cases.test.ts) with a behavior-based test
- verify `pnpm test`

### Checklist 4: Strengthen reusable-definition JSON Schema coverage (Completed)

- keep [tests/integration/json-to-json-schema.test.ts](../../tests/integration/json-to-json-schema.test.ts) focused on the current JSON parser surface, which still emits `definitions: []`
- add integration cases in [tests/integration/typescript-to-json-schema.test.ts](../../tests/integration/typescript-to-json-schema.test.ts) for parser-to-generator flows that produce `$defs`
- add integration cases for root-level `$ref` output, not only nested references
- assert that reusable definitions produced by the TypeScript parser survive generator rendering unchanged
- verify `pnpm test`

### Checklist 5: Split the JSON inference implementation into smaller modules (Completed)

- keep the extracted [infer-array.ts](../../packages/parsers/json/src/infer-array.ts) and [infer-object.ts](../../packages/parsers/json/src/infer-object.ts) boundaries stable
- keep the extracted [infer-shared.ts](../../packages/parsers/json/src/infer-shared.ts) boundary stable
- treat [infer.ts](../../packages/parsers/json/src/infer.ts) as the orchestration layer; it is now down to about 300 lines from the earlier 831-line single-file implementation
- verify `pnpm test` and `pnpm typecheck`

### Checklist 6: Tighten shared type contracts (Completed)

- introduce a closed `SchemaNodeKind` union in [packages/core/src/schema/types.ts](../../packages/core/src/schema/types.ts)
- update downstream node consumers to rely on the stronger kind typing
- remove avoidable casts in [packages/generators/json-schema/src/validate.ts](../../packages/generators/json-schema/src/validate.ts)
- verify `pnpm typecheck` and `pnpm test`

### Checklist 7: Clean up TypeScript parser duplication (Completed)

- extract the repeated reachable-definition conversion pattern in [packages/parsers/typescript/src/convert-node.ts](../../packages/parsers/typescript/src/convert-node.ts)
- keep behavior identical while reducing branching noise
- add or preserve tests that cover aliases, enums, and interfaces through the shared helper
- verify `pnpm test`

## Priority: Critical

No currently open critical refactoring items.

## Priority: High

No currently open high-priority refactoring items.

## Priority: Medium

No currently open medium-priority refactoring items.

## Priority: Low

### Add malformed TypeScript input tests

- **Location:** [tests/parsers/typescript/](../../tests/parsers/typescript/)
- **Status:** completed in [tests/parsers/typescript/failure-matrix.test.ts](../../tests/parsers/typescript/failure-matrix.test.ts), with parser support now returning an explicit `unsupported-typescript-syntax` failure for malformed source text.

### Deduplicate TypeScript generator paren wrappers

- **Location:** [packages/generators/typescript/src/emit.ts:306-340](../../packages/generators/typescript/src/emit.ts)
- **Status:** completed. The emitter now uses one shared `wrapForParens(renderedType: string): string` helper.

### Document string-based TypeScript generation as an explicit v0 limitation

- **Location:** [packages/generators/typescript/src/emit.ts](../../packages/generators/typescript/src/emit.ts)
- **Status:** completed in [packages/generators/typescript/README.md](../../packages/generators/typescript/README.md).

### Add JSDoc/TSDoc to public API functions

- **Location:** across all packages
- **Status:** completed for the key public parser/generator entry points in [packages/parsers/json/src/schema/parse.ts](../../packages/parsers/json/src/schema/parse.ts), [packages/parsers/typescript/src/parse.ts](../../packages/parsers/typescript/src/parse.ts), [packages/generators/typescript/src/api.ts](../../packages/generators/typescript/src/api.ts), and [packages/generators/json-schema/src/api.ts](../../packages/generators/json-schema/src/api.ts).

### Add targeted edge-case tests

- **Location:** across the test suite
- **Good candidates:**
  - Unicode field names and identifiers
  - recursive or self-referencing type references
  - deeply nested anonymous types (5+ levels)
  - concurrent parser or generator usage
  - single-element unions
  - empty document names
  - large payloads (>1KB)
- **Action:** add these opportunistically alongside nearby feature work rather than treating them as one giant test-only sprint.

## Notes On Items That Changed Since Earlier Reviews

Some earlier improvement suggestions were directionally correct but now need to be interpreted in the current architecture:

- TypeScript parser entry and module-boundary work should now be evaluated through the preprocess model in [typescript-parser-preprocess.md](./typescript-parser-preprocess.md), not only by looking at `convert-node.ts`.
- JSON Schema generator testing is no longer globally "thin"; the biggest remaining integration gap is now `$defs` / `$ref` end-to-end coverage rather than tuple/record/union basics.
- Some cleanup tasks in the TypeScript parser are still useful, but they now belong in an ongoing preprocess-alignment track rather than a one-off patch.
- Coverage reporting is already in place through Vitest, `test:coverage`, and CI, so it should not stay in the active improvement backlog.
- `unknownStrategy` is intentionally constrained to a single supported value and documented as a forward-compatibility placeholder. This is now a settled API choice, not an active improvement item.

## Tracking

| Status | Count |
|--------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 2 |
| **Total** | **2** |

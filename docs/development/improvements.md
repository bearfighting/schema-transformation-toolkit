# Improvement Plan

## Overview

This document tracks concrete improvements that still look worthwhile after comparing earlier review notes with the current repository state.

It is intentionally not a dump of every possible cleanup.
The goal is to keep one realistic backlog that reflects:

- the current parser and generator surface area
- the new JSON Schema generator work
- the new TypeScript parser preprocess boundary
- the places where behavior risk is still higher than confidence

Items are ordered by practical value for the current phase, not only by code smell.

## Priority: Critical

### Fix dead code in JSON Schema generator unknown rendering

- **Location:** [packages/generators/json-schema/src/emit.ts](../../packages/generators/json-schema/src/emit.ts:72)
- **Issue:** `unknown` rendering still uses `options.unknownStrategy === "true" ? true : true`, so the option has no effect.
- **Why it matters now:** this is not only untidy; it means one public generator option is currently misleading.
- **Action:** decide the real v0 behavior for `"true"` vs `"false"` unknown strategy, then implement and test it explicitly.

### Fix unreachable branch in JSON parser merge

- **Location:** [packages/parsers/json/src/merge.ts](../../packages/parsers/json/src/merge.ts:189)
- **Issue:** `mergeUnknownTypeNodes` checks `left.reason === undefined`, but `SchemaUnknownNode.reason` is currently a required string union.
- **Why it matters now:** the branch is dead, which means either the type contract or the merge behavior is wrong.
- **Action:** either remove the branch and document left-biased reason retention, or widen the model intentionally and cover the intended merge semantics with tests.

## Priority: High

### Expand `json -> json-schema` integration coverage

- **Location:** [tests/integration/json-to-json-schema.test.ts](../../tests/integration/json-to-json-schema.test.ts:1)
- **Current state:** this file is still much smaller than [tests/integration/json-to-typescript.test.ts](../../tests/integration/json-to-typescript.test.ts:1), even after the JSON Schema generator became a first-class target.
- **Main gaps:**
  - tuple fields and tuple-root documents
  - record fields
  - union fields and discriminated unions
  - reusable definitions and `$ref`
  - unknown-root rendering
  - parser failure propagation
  - generator option coverage such as union composition and object closure
- **Action:** build this file into the JSON Schema equivalent of the stronger `json -> typescript` integration suite.

### Add coverage reporting

- **Location:** [vitest.config.ts](../../vitest.config.ts:1), `.github/workflows/ci.yml`
- **Issue:** the workspace now has a meaningful amount of parser/generator logic, but no coverage configuration or trend visibility.
- **Action:**
  - add Vitest coverage config with `v8`
  - add `test:coverage`
  - optionally surface coverage in CI once the local config is stable

### Replace tautological integration assertions

- **Location:** [tests/integration/json-to-typescript.test.ts](../../tests/integration/json-to-typescript.test.ts:35), [tests/integration/typescript-to-typescript.test.ts](../../tests/integration/typescript-to-typescript.test.ts:22)
- **Issue:** some integration assertions still use the pattern `document: parsed.ok ? parsed.document : undefined`, which does not assert meaningful behavior.
- **Why it matters now:** these tests should be our strongest end-to-end safety net.
- **Action:** replace them with explicit success guards and real assertions on the parsed document and generated output.

### Replace or remove the dead IR inventory test

- **Location:** [tests/core/ir-v0-cases.test.ts](../../tests/core/ir-v0-cases.test.ts:1)
- **Issue:** the test currently asserts that an array has length 13 and does not validate real runtime behavior.
- **Action:** either remove it or replace it with actual case validation tied to the IR working cases.

## Priority: Medium

### Split JSON parser inference into focused modules

- **Location:** [packages/parsers/json/src/infer.ts](../../packages/parsers/json/src/infer.ts:1)
- **Current state:** the file is still 800+ lines and mixes array inference, object merging, tuple inference, record inference, union inference, field inference, and diagnostic emission.
- **Why it matters now:** the JSON parser is already stable enough that maintainability is now the main risk.
- **Action:** split by responsibility and keep `infer.ts` as the orchestration layer.

### Extract duplicated fallback logic in JSON inference

- **Location:** [packages/parsers/json/src/infer.ts](../../packages/parsers/json/src/infer.ts:1)
- **Issue:** the "shared inference -> fallback to tuple or rethrow" pattern still appears in multiple places.
- **Action:** extract a helper once `infer.ts` starts being split, rather than duplicating the refactor twice.

### Decide and document `merge.ts` mutation semantics

- **Location:** [packages/parsers/json/src/merge.ts](../../packages/parsers/json/src/merge.ts:1)
- **Issue:** the merge layer still mutates `left` in place in multiple functions.
- **Why it matters now:** this is one of the few places where the codebase is still notably impure.
- **Action:** choose one direction:
  - refactor to pure returns, or
  - explicitly document in-place mutation and add tests that make the contract visible

### Tighten `SchemaBaseNode.kind` typing

- **Location:** [packages/core/src/schema/types.ts](../../packages/core/src/schema/types.ts:33)
- **Issue:** `SchemaBaseNode.kind` is still `string`, not a closed union.
- **Why it matters now:** the project now has more node consumers across multiple packages, so stronger exhaustiveness checking is more valuable than before.
- **Action:** introduce `SchemaNodeKind` and type the base node accordingly.

### Add SDK re-export coverage

- **Location:** [packages/sdk/src/index.ts](../../packages/sdk/src/index.ts:1)
- **Issue:** the SDK package re-exports multiple packages but still has no direct contract test.
- **Action:** add a simple test that imports key symbols from `@aio/sdk` and verifies they resolve.

### Keep improving TypeScript parser internals around preprocess

- **Location:** [packages/parsers/typescript/src/preprocess.ts](../../packages/parsers/typescript/src/preprocess.ts:1), [packages/parsers/typescript/src/convert-node.ts](../../packages/parsers/typescript/src/convert-node.ts:1)
- **Current state:** we now have a real preprocess step, declaration-shape helpers, and reachability scanning, which is good progress.
- **Remaining improvement area:**
  - continue moving clearly preprocess-boundary blockers out of conversion where reasonable
  - reduce remaining repeated reachable-definition conversion logic
  - keep module-boundary diagnostics aligned with the preprocess architecture
- **Action:** treat this as an ongoing structural cleanup track, not as one isolated refactor.

### Add better structure to large test files

- **Location:** [tests/parsers/json/inference.test.ts](../../tests/parsers/json/inference.test.ts:1), [tests/parsers/typescript/parse.test.ts](../../tests/parsers/typescript/parse.test.ts:1)
- **Issue:** both files are still broad and flat enough that navigation is slower than it should be.
- **Action:** group by concern with nested `describe` blocks when touching these files next, rather than doing a giant pure-movement refactor immediately.

## Priority: Low

### Deduplicate TypeScript generator paren wrappers

- **Location:** [packages/generators/typescript/src/emit.ts](../../packages/generators/typescript/src/emit.ts:306)
- **Issue:** `wrapForArray`, `wrapForUnion`, and `wrapForOptionalTupleElement` still share the same implementation.
- **Action:** collapse them into one helper when touching the emitter next.

### Standardize generator control-flow style

- **Location:** [packages/generators/typescript/src/emit.ts](../../packages/generators/typescript/src/emit.ts:1), [packages/generators/json-schema/src/emit.ts](../../packages/generators/json-schema/src/emit.ts:1)
- **Issue:** one generator uses `if` chains and the other uses `switch`.
- **Action:** align them only when it provides a real readability or exhaustiveness benefit; this is not urgent by itself.

### Document string-based TypeScript generation as an explicit v0 limitation

- **Location:** [packages/generators/typescript/src/emit.ts](../../packages/generators/typescript/src/emit.ts:1)
- **Issue:** string-based generation is still workable, but the tradeoff should stay visible as the output surface grows.
- **Action:** keep this documented in the generator README and revisit AST-based generation only if complexity materially increases.

### Add targeted edge-case tests

- **Location:** across the test suite
- **Good candidates:**
  - Unicode field names and identifiers
  - recursive or self-referencing type references
  - deeply nested anonymous types
  - concurrent parser or generator usage
  - single-element unions
  - empty document names
- **Action:** add these opportunistically alongside nearby feature work rather than treating them as one giant test-only sprint.

## Notes On Items That Changed Since Earlier Reviews

Some earlier improvement suggestions were directionally correct but now need to be interpreted in the current architecture:

- TypeScript parser entry and module-boundary work should now be evaluated through the preprocess model in [typescript-parser-preprocess.md](./typescript-parser-preprocess.md), not only by looking at `convert-node.ts`.
- JSON Schema generator testing is no longer globally "thin"; the bigger remaining gap is specifically `json -> json-schema` breadth relative to the older `json -> typescript` path.
- Some cleanup tasks in the TypeScript parser are still useful, but they now belong in an ongoing preprocess-alignment track rather than a one-off patch.

## Tracking

| Status | Count |
|--------|-------|
| Critical | 2 |
| High | 4 |
| Medium | 7 |
| Low | 4 |
| **Total** | **17** |

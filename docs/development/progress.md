# Current Status

This file is the repository-level status page.
It should stay short and answer four questions:

- what the project can do today
- what is worth pushing next
- what is intentionally deferred
- when the current state was last verified

Detailed execution tracking for TypeScript parser work lives in [typescript-parser-checklist.md](typescript-parser-checklist.md).

## Current State

The repository is past the architecture-validation stage.
It now has:

- a real multi-IR core with `Value IR`, `Shape IR`, `Constraint IR`, and `IrModel`
- parser and generator package surfaces for JSON, JSON Schema, and TypeScript
- structured diagnostics, semantic notes, capability declarations, and semantic-loss reporting
- an SDK planner that derives routes and capability summaries from parser and generator registries

The current center of gravity is to keep those contracts truthful and stable while extracting shared IR traversal mechanics carefully.

The repository now also has a shared test-architecture layer for semantic fixtures, cross-parser equivalence smoke, generator validity checks, capability coverage automation, and an expanded real-world corpus.

## Supported Routes

Validated end-to-end routes today:

- `json -> value -> shape -> typescript`
- `json -> value -> shape -> json-schema`
- `json-schema -> shape -> typescript`
- `json-schema -> shape + constraint -> json-schema`
- `typescript -> shape -> typescript`
- `typescript -> shape -> json-schema`

Shared shape semantics currently cover:

- scalar
- literal
- object
- array
- tuple
- record or map
- union
- document-local references and reusable definitions
- `null`
- optional presence
- `unknown`

Shared constraint semantics currently cover:

- string constraints: `pattern`, `minLength`, `maxLength`, `format`
- numeric constraints: `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`
- collection constraints: `minItems`, `maxItems`, `uniqueItems`
- object constraints: `closed-object`, `minProperties`, `maxProperties`
- portable annotations: `default`, `description`, `examples`, `readOnly`, `writeOnly`

## Current Priorities

Recommended order for near-term work:

1. extract a lightweight shared IR traversal layer for diagnostics, validation, and future generators without changing current semantics
2. keep parser and generator capability, diagnostic, semantic-note, and semantic-loss reporting aligned with actual behavior
3. keep the newer fixture-driven and corpus-driven test layers stable while only trimming low-value route snapshots
4. keep shared-IR expansion gated on repeated pressure across multiple sources or targets rather than one format alone
5. resume broader format or parser-surface growth only after traversal extraction stops being the sharper duplication risk

That means current implementation energy should favor:

- shared traversal helpers for analysis-style IR consumers over heavy visitor-pattern machinery
- generator safety checks and truthfulness over target-local option growth
- extending the shared semantic fixture matrix and corpus over adding many more isolated route tests
- preprocess and entry-boundary clarity over broader type-system ambition
- more real-world corpus pressure over speculative route explosion
- explicit unsupported-case reporting over silent widening
- stable shared contracts over format-local option churn

TypeScript-parser-specific task tracking should stay in [typescript-parser-checklist.md](typescript-parser-checklist.md), not here.

## Latest Work Snapshot

Latest testing-architecture progress completed on July 21, 2026:

- introduced a shared `tests/fixtures/semantics` layer with reusable fixture types, selectors, and canonical semantic-case definitions
- introduced shared test helpers for schema equivalence, diagnostics, generator contracts, capability coverage, constraint assertions, syntax validation, and minimal corpus execution
- added shared semantic smoke coverage for primitive, presence, collection, union, reference, constraint, and annotation cases
- added a first `typescript <-> json-schema` cross-parser equivalence smoke suite driven by shared fixtures
- added TypeScript syntax validation and JSON Schema structural validation as generator-level checks instead of relying only on string assertions
- added generator contract smoke suites for both TypeScript and JSON Schema targets
- added capability coverage automation to ensure declared supported capabilities map to shared fixture coverage
- added an initial real-world corpus spanning JSON, TypeScript, and JSON Schema inputs
- tightened schema-equivalence normalization so recursive root references remain stable instead of being collapsed away incorrectly

Additional test-structure cleanup completed on July 21, 2026:

- extracted shared result assertions so integration and parser suites no longer repeat the same `ok`-branch boilerplate
- extracted shared TypeScript generator event builders for integer widening, unknown widening, and unknown-union widening assertions
- extracted shared JSON Schema generator event builders for wide-unknown, overlapping-union, and closed-object policy assertions
- extracted shared schema-document helper utilities for definition-name assertions used across integration and parser suites
- reduced duplicated route-local assertion scaffolding across JSON, JSON Schema, and TypeScript integration tests without removing their route-specific behavior checks
- aligned selected parser tests with the same shared helper style so future fixture migrations can keep shrinking one-off assertion code

Latest parser-focused progress completed on July 19, 2026:

- expanded conservative automatic root discovery for single-file TypeScript inputs without crossing into multi-file resolution
- added clearer preprocess-boundary diagnostics and ambiguity evidence for implicit entry selection
- introduced a small internal decision taxonomy for implicit entry selection and ambiguity reporting
- exposed parser policy decisions through higher-level SDK report semantics, including entry-selection summaries
- aligned parser docs, cases, checklist notes, public API snapshots, and tests with the current behavior

The latest commits for this slice are:

- `bf19425` `feat(parser-typescript): deepen implicit entry analysis`
- `b5f3784` `feat(sdk): surface entry selection in reports`

Additional parser-contract follow-up completed on July 20, 2026:

- expanded single-file implicit-entry tests around exported-cycle fallback into local-root selection
- locked document-name tie-breaking behavior for both successful exported-root disambiguation and failure-side ambiguity preservation
- clarified that re-export and export-all forwarding remain preprocess noise when they do not actually determine a uniquely explainable local entry
- moved the new ambiguity-preservation cases into the parser failure matrix so success-path and failure-path test roles stay clearer

Additional generator hardening completed on July 20, 2026:

- the TypeScript generator now rejects rendered type-name collisions explicitly instead of emitting duplicate declarations silently
- the TypeScript generator now also rejects rendered field-name collisions inside one object scope, including nested inline objects
- generator tests now lock collisions across reusable definitions and root-versus-definition naming
- generator tests now also lock collisions across sibling fields that normalize to the same rendered property name
- generator validation now also treats quoted and identifier property forms as the same rendered property when they would collide in emitted TypeScript
- generator docs now describe the new naming-collision failure boundary

Additional generator semantic-reporting follow-up completed on July 20, 2026:

- the TypeScript generator now returns success-with-diagnostics when shared `integer` scalars widen to TypeScript `number`
- widening results now also include matching semantic notes so SDK and report layers can explain the target-level caveat consistently
- integration tests now lock the widening warning across JSON and JSON Schema pipelines, plus configured generator variants
- generator docs now describe integer widening as the first intentional TypeScript success-with-diagnostics path

Additional generator boundary-hardening follow-up completed on July 20, 2026:

- the TypeScript generator now rejects runtime `record` nodes whose keys fall outside the current shared `Record<string, T>` contract
- generator tests now lock the non-string record-key failure path explicitly instead of relying on core factory guards alone
- generator docs now describe non-string record keys as an explicit runtime failure boundary

Additional SDK reporting follow-up completed on July 20, 2026:

- higher-level conversion reports now summarize target-layer semantic caveats separately from raw semantic note arrays
- generator-side widening notes such as `integer-widened-to-number` now surface as one-step report summaries instead of being discoverable only through staged note inspection
- SDK tests now lock both the low-level report helper behavior and the end-to-end conversion report shape for target-layer semantic caveats

Additional generator unknown-semantics follow-up completed on July 20, 2026:

- the TypeScript generator now returns success-with-diagnostics when shared `unknown` nodes widen into TypeScript `unknown`
- generator and integration tests now lock unknown widening across direct generator use, JSON pipelines, and JSON Schema pipelines
- generator docs now describe `unknown` rendering as another intentional TypeScript success-with-diagnostics path

Additional generator union-truthfulness follow-up completed on July 20, 2026:

- the TypeScript generator now reports a target-layer widening caveat when `unknown` members absorb narrower union branches
- the same caveat now also covers local references that resolve to `unknown` definitions, not only direct union members
- generator, integration, and SDK tests now lock both direct and reference-resolved unknown-union widening behavior

Additional documentation planning follow-up completed on July 20, 2026:

- test planning docs now reflect the real repository state instead of assuming the project is still only building early Parser → IR infrastructure
- a dedicated design note now records the planned lightweight `Shape IR` traversal layer for diagnostics and validation consumers
- the current next-step focus is now documented as two parallel workstreams: shared traversal extraction and reusable semantic fixture/equivalence coverage

Additional second-stage test consolidation completed on July 21, 2026:

- generator truthfulness expectations now live in shared semantic fixtures for wide unknown and unknown-union cases instead of only route-local contract tests
- SDK semantic caveat and semantic loss checks now consume the same fixture-level route expectations used by lower-level truthfulness tests
- selected `json -> typescript`, `json-schema -> typescript`, `json -> json-schema`, and `json-schema -> json-schema` integration tests now prefer output-shape plus code-level assertions over full duplicated generator event payload snapshots
- selected `typescript -> typescript` and `typescript -> json-schema` integration tests now also start from the same route-specific-smoke model for basic object, tuple, literal, enum, readonly, and nested composition cases

Additional real-world corpus expansion completed on July 21, 2026:

- the corpus now includes ten cases instead of the earlier minimal six, adding widening-heavy JSON Schema bundles, an OpenAPI-components-style schema bundle, a richer TypeScript dashboard configuration shape, and a nested workspace-style JSON config sample
- corpus tests now include targeted assertions for constraint-heavy OpenAPI-style schemas, widening-heavy loose bundles, OpenAPI response envelopes, TypeScript tuple or record or union normalization, and nested workspace-style JSON config regeneration

Additional transition-planning progress completed on July 21, 2026:

- the current test-refactoring slice no longer appears blocked on a parser, IR, or generator correctness defect discovered during consolidation
- the main remaining structural duplication risk now sits in repeated ad-hoc `Shape IR` traversal inside diagnostics and validation-style consumers
- the repository is therefore ready to treat shared IR traversal extraction as the next primary refactor, with the current fixture, SDK, integration, and corpus layers acting as regression guardrails

## Next Planned Push

When work resumes, the most valuable next step is to extract shared IR traversal mechanics without regressing into semantic drift.

That currently means:

- extract a lightweight shared traversal layer for `Shape IR` analysis-style consumers before more generators repeat the same recursive mechanics
- keep the newer shared fixture, SDK truthfulness, integration, and corpus layers as the primary safety net during that extraction
- trim or repurpose only the remaining low-value route snapshots after traversal work lands, not during the first mechanical extraction steps
- expand the corpus only where it adds new traversal pressure or boundary coverage
- keep moving truthfulness-sensitive generator and parser assertions toward shared helpers instead of repeating them in isolated suites
- keep rendered-name validation ahead of string emission whenever custom naming strategies can collapse distinct schema declarations
- keep rendered-field validation ahead of string emission whenever custom naming strategies can collapse sibling fields inside one object scope
- keep widening diagnostics explicit whenever shared semantics truthfully degrade at the TypeScript target layer
- resume parser root-discovery expansion only after the current generator hardening and test-structure gaps are no longer the sharper correctness risk

The current highest-leverage next step inside that slice is now:

- extract the first shared traversal helpers for diagnostics and validation-style consumers while preserving current emitted diagnostics, semantic notes, and failure boundaries
- use the now-expanded fixture, SDK, integration, and corpus suite as the acceptance harness for that extraction rather than broadening semantics concurrently

Recent contract clarifications within that slice:

- document-name tie-breaking is intentionally narrow and should not weaken ambiguity reporting when no candidate actually matches
- export forwarding noise should stay ignorable when local entry selection is already complete
- the same forwarding forms should not become hidden tie-breakers when local or exported ambiguity still remains
- rendered type-name collisions should fail explicitly instead of producing duplicate TypeScript declarations
- rendered field-name collisions should fail explicitly instead of producing duplicate object properties
- quoted and identifier property forms should collide when they describe the same emitted TypeScript property name
- integer shared scalars should report widening when they render as TypeScript `number`
- runtime record nodes should fail explicitly when their keys do not match the current string-key shared boundary
- higher-level SDK reporting should summarize target-layer caveats without turning parse-side normalization notes into report noise
- shared unknown nodes should report widening when they render as TypeScript `unknown`
- unions should report widening when direct or reference-resolved unknown branches effectively absorb narrower TypeScript member semantics
- shared IR traversal should be centralized first for diagnostics and validation, not forced into emitter code prematurely

The current unsupported parser surface should also be read in two buckets:

- not yet supported but still plausible near-term work: import-aware entry handling, selected utility-type expansion beyond `Record`, interface heritage, and carefully chosen broader type-system forms only when they still fit the shared schema subset cleanly
- intentionally outside the current project boundary unless shared IR goals change materially: classes as schema entries, value-level module statements, method-like object members, computed property names, and other syntax that does not describe portable data-shape semantics directly

## Deferred

Intentionally deferred for now:

- external or multi-file reference resolution
- multi-document or bundled JSON Schema output
- broader module-aware TypeScript resolution
- source-span metadata in the shared IR itself
- value-format expansion for YAML, TOML, and similar non-JSON sources

## Guardrails

- keep parser, IR, generator, and orchestration boundaries explicit
- keep shared semantics centralized so parser and generator packages do not drift
- keep JSON Schema target behavior aligned with actual shared semantics rather than ad hoc target-local rules
- keep capability declarations and runtime route behavior aligned
- avoid expanding shared IR just to make one source format more faithful on its own

When new pressure appears, classify it as one of:

- likely shared-IR gap
- likely format-specific concern
- undecided gray area that needs more cross-surface evidence

## Read Next

- read [architecture-layering.md](architecture-layering.md) for the long-term layering and capability model
- read [ir-boundaries.md](ir-boundaries.md) for the semantic split between Value IR, Shape IR, and Constraint IR
- read [capabilities-and-loss.md](capabilities-and-loss.md) for the conversion-result truthfulness rules
- read [typescript-parser-checklist.md](typescript-parser-checklist.md) and [typescript-parser-preprocess.md](typescript-parser-preprocess.md) for active parser work

## Latest Verification Notes

The latest local verification pass completed on July 21, 2026 and included:

- `pnpm vitest run tests/generators/typescript/render.test.ts tests/integration/json-to-typescript.test.ts tests/integration/json-schema-to-typescript.test.ts tests/integration/json-to-json-schema.test.ts`
- `pnpm vitest run tests/integration/json-schema-to-json-schema.test.ts tests/integration/json-to-json-schema.test.ts`
- `pnpm vitest run tests/generators/json-schema/render.test.ts tests/generators/json-schema/contract.test.ts tests/generators/json-schema/structure.test.ts`
- `pnpm vitest run tests/integration/typescript-to-typescript.test.ts tests/integration/typescript-to-json-schema.test.ts`
- `pnpm vitest run tests/integration/json-schema-to-typescript.test.ts tests/integration/json-schema-to-json-schema.test.ts`
- `pnpm vitest run tests/parsers/json-schema/parse.test.ts`
- `pnpm test`
- `pnpm vitest run tests/fixtures/semantic-fixtures-smoke.test.ts`
- `pnpm vitest run tests/fixtures/semantic-constraint-fixtures-smoke.test.ts`
- `pnpm vitest run tests/equivalence/typescript-json-schema.test.ts`
- `pnpm vitest run tests/generators/typescript/syntax.test.ts`
- `pnpm vitest run tests/generators/json-schema/structure.test.ts`
- `pnpm vitest run tests/generators/typescript/contract.test.ts tests/generators/json-schema/contract.test.ts`
- `pnpm vitest run tests/sdk/capability-coverage.test.ts`
- `pnpm vitest run tests/real-world/minimal-corpus.test.ts`
- `pnpm exec tsc --noEmit`
- `pnpm test`

That pass finished green with `38` test files and `513` tests passing.

The previous local verification pass completed on July 20, 2026 and included:

- `pnpm vitest run tests/parsers/typescript/implicit-entry.test.ts tests/parsers/typescript/parse.test.ts`
- `pnpm vitest run tests/parsers/typescript/parse.test.ts`
- `pnpm vitest run tests/parsers/typescript/parse.test.ts tests/parsers/typescript/failure-matrix.test.ts`
- `pnpm vitest run tests/generators/typescript/render.test.ts`
- `pnpm vitest run tests/generators/typescript/render.test.ts tests/integration/json-to-typescript.test.ts tests/integration/json-schema-to-typescript.test.ts`

Those targeted verification passes finished green, including `75` focused parser tests in the latest combined parser run, `39` TypeScript generator render tests before the widening follow-up, and `54` generator-plus-integration tests in the latest widening verification pass.

The latest broader local verification pass completed on July 19, 2026 and included:

- `pnpm test`
- `pnpm typecheck`

That pass finished green with `27` test files and `289` tests passing.

The latest broader verification pass completed on July 18, 2026 and included:

- `pnpm vitest run`
- `pnpm typecheck`
- `pnpm eslint tests packages/sdk/src packages/parsers/json/src packages/parsers/json-schema/src packages/parsers/typescript/src packages/generators/json-schema/src packages/generators/typescript/src`

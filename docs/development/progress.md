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

The current center of gravity is to keep those contracts truthful and stable while expanding supported schema semantics carefully.

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

1. keep the current TypeScript parser slice stable now that its single-file entry and preprocess contract is in good shape
2. treat TypeScript generator hardening as the next follow-on work where parser expansion already exposed target-validation gaps
3. keep parser and generator capability, diagnostic, semantic-note, and semantic-loss reporting aligned with actual behavior
4. keep shared-IR expansion gated on repeated pressure across multiple sources or targets rather than one format alone

That means current implementation energy should favor:

- generator safety checks and truthfulness over target-local option growth
- preprocess and entry-boundary clarity over broader type-system ambition
- more real-world single-file support over early multi-file resolution when parser work resumes
- explicit unsupported-case reporting over silent widening
- stable shared contracts over format-local option churn

TypeScript-parser-specific task tracking should stay in [typescript-parser-checklist.md](typescript-parser-checklist.md), not here.

## Latest Work Snapshot

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

## Next Planned Push

When work resumes, the most valuable next step is to harden the TypeScript generator where current IR semantics can still render invalid target output under custom naming strategies.

That currently means:

- keep rendered-name validation ahead of string emission whenever custom naming strategies can collapse distinct schema declarations
- keep rendered-field validation ahead of string emission whenever custom naming strategies can collapse sibling fields inside one object scope
- keep widening diagnostics explicit whenever shared semantics truthfully degrade at the TypeScript target layer
- continue documenting generator-side failure versus success-with-diagnostics boundaries
- resume parser root-discovery expansion only after the current generator hardening gaps are no longer the sharper correctness risk

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

The latest local verification pass completed on July 20, 2026 and included:

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

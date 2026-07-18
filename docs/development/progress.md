# Current Status

## Summary

The repository has moved beyond the earlier architecture-validation phase.
It now has a real multi-IR core, multiple parser and generator surfaces, structured diagnostics, explicit semantic-loss reporting, and a capability-aware SDK planner.

The project's current center of gravity is to keep the shared IR contracts stable, keep orchestration truthful and inspectable, and expand supported schema semantics carefully without drifting toward format-specific AST modeling.

## Completed Milestones

### Core And IR

- `@aio/core` is established as the shared semantic contract layer
- `Shape IR`, `Constraint IR`, `Value IR`, and combined `IrModel` entry points exist in code
- shared diagnostics, semantic-note, and conversion-report contracts exist
- core internals are split into focused modules instead of one large semantic file
- references, reusable definitions, tuples, records, unions, unknown semantics, and `null` are implemented in the shared shape contract

### Parsers

- JSON parsing supports direct shape inference for the current shared subset
- JSON now has explicit `JSON -> ValueDocument` and `ValueDocument -> ShapeDocument` entry points
- JSON Schema parsing produces `Shape IR` plus `Constraint IR`
- TypeScript parsing supports a meaningful schema-oriented single-file subset with explicit unsupported-case diagnostics
- TypeScript preprocess handling exists as a distinct architectural boundary for future module-aware work

### Generators

- TypeScript generation supports the current shared shape subset
- JSON Schema Draft 2020-12 generation supports the current shared shape subset
- JSON Schema generation consumes `Constraint IR` for portable validation and annotation keywords

### Orchestration

- the SDK can carry `value`, `shape`, and `constraints` artifacts at runtime
- conversion success results expose `report`, `losses`, `preservedCapabilities`, and staged diagnostics or semantic notes
- parser and generator capability declarations now exist in code
- route planning and route capability summaries now derive from parser and generator registries instead of a purely hand-maintained route table
- semantic-loss planning now reuses planner capability information
- the SDK orchestration internals are now split into focused modules instead of one large `convert.ts`
- SDK internals now have dedicated boundary tests for route planning, source parsing, semantic-loss planning, and report assembly

### Package Structure

- parser packages now follow the same entry-point pattern as generator packages: `index.ts` as the public export surface and `api.ts` as the runtime entry layer
- legacy parser `parse.ts` files remain as compatibility re-export layers rather than new semantic entry points
- package structure is now more explicit about the difference between public exports, runtime entry behavior, option handling, and internal helpers

## Current Supported Surface

### Shared Shape Semantics

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

### Shared Constraint Semantics

- string constraints: `pattern`, `minLength`, `maxLength`, `format`
- numeric constraints: `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`
- collection constraints: `minItems`, `maxItems`, `uniqueItems`
- object constraints: `closed-object`, `minProperties`, `maxProperties`
- portable annotations: `default`, `description`, `examples`, `readOnly`, `writeOnly`

### Current End-To-End Routes

- `json -> value -> shape -> typescript`
- `json -> value -> shape -> json-schema`
- `json-schema -> shape -> typescript`
- `json-schema -> shape + constraint -> json-schema`
- `typescript -> shape -> typescript`
- `typescript -> shape -> json-schema`

## Current Near-Term Work

- keep parser, IR, generator, and orchestration boundaries explicit
- keep conversion reporting and capability reporting aligned with actual behavior
- keep shared semantics centralized so parser and generator packages do not drift
- continue small, data-shape-preserving TypeScript parser expansion
- decide whether the next parser work should favor more supported syntax or richer diagnostics coverage
- keep JSON Schema target behavior aligned with actual shared semantics rather than ad hoc target-local rules
- keep future IR expansion driven by repeated pressure across multiple sources or targets, not by one format alone
- keep new internal module boundaries stable so future feature work does not collapse back into large entry files

## Deferred

- external or multi-file reference resolution
- multi-document or bundled JSON Schema output
- broader module-aware TypeScript resolution
- source-span metadata in the shared IR itself
- value-format expansion for YAML, TOML, and similar non-JSON sources

## Guardrails

- record and object inference boundaries must stay conservative and explicit
- references and reuse may become increasingly important as generated output grows
- parser and generator options can become hard to reason about if defaults and capability boundaries are not kept clear
- core and SDK internal helpers could still drift again if new semantics are added without being placed in the right internal module
- capability declarations and runtime route behavior must stay aligned

## Current IR-Expansion Guardrail

The current stance is to avoid expanding the shared IR just to make an early JSON Schema parser more source-faithful.

Until more parser and generator surfaces are implemented, new pressure should be classified in one of three buckets:

- likely shared-IR gap: semantics that plausibly matter across multiple schema ecosystems
- likely JSON Schema-specific concern: semantics tied mostly to JSON Schema drafts, refs, or validation keywords
- undecided gray area: semantics that may become shared later, but do not yet have enough cross-surface evidence

This is meant to keep the project honest about where its next abstraction pressure is really coming from.

## Read Next

- read [architecture-layering.md](architecture-layering.md) for the long-term layering and capability model
- read [ir-boundaries.md](ir-boundaries.md) for the semantic split between Value IR, Shape IR, and Constraint IR
- read [capabilities-and-loss.md](capabilities-and-loss.md) for the conversion-result truthfulness rules
- read [typescript-parser-checklist.md](typescript-parser-checklist.md) and [typescript-parser-preprocess.md](typescript-parser-preprocess.md) for the active parser-specific guidance

## Last Broad Verification

The latest broad verification pass completed on July 18, 2026 and included:

- `pnpm vitest run`
- `pnpm typecheck`
- `pnpm eslint tests packages/sdk/src packages/parsers/json/src packages/parsers/json-schema/src packages/parsers/typescript/src packages/generators/json-schema/src packages/generators/typescript/src`

That pass finished green with `27` test files and `291` tests passing.

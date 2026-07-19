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

1. continue small, data-shape-preserving TypeScript parser expansion
2. keep parser capability, diagnostic, semantic-note, and semantic-loss reporting aligned with actual behavior
3. treat generator changes as follow-on work when parser expansion proves a real target gap
4. keep shared-IR expansion gated on repeated pressure across multiple sources or targets rather than one format alone

That means current implementation energy should favor:

- preprocess and entry-boundary clarity over broader type-system ambition
- more real-world single-file support over early multi-file resolution
- explicit unsupported-case reporting over silent widening
- stable shared contracts over target-local option growth

TypeScript-parser-specific task tracking should stay in [typescript-parser-checklist.md](typescript-parser-checklist.md), not here.

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

The latest local verification pass completed on July 19, 2026 and included:

- `pnpm test`
- `pnpm typecheck`

That pass finished green with `27` test files and `289` tests passing.

The latest broader verification pass completed on July 18, 2026 and included:

- `pnpm vitest run`
- `pnpm typecheck`
- `pnpm eslint tests packages/sdk/src packages/parsers/json/src packages/parsers/json-schema/src packages/parsers/typescript/src packages/generators/json-schema/src packages/generators/typescript/src`

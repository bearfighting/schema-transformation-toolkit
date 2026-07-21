# Current Status

This is the only repository-level status page.
It should stay short and answer:

- what the project can do today
- what is the next highest-leverage work
- what is intentionally deferred
- when the current state was last verified

## Current State

The repository is past architecture validation and has a stable-enough conversion kernel:

- multi-layer IR with `Value IR`, `Shape IR`, `Constraint IR`, and `IrModel`
- parser and generator packages for JSON, JSON Schema, and TypeScript
- structured diagnostics, semantic notes, capability declarations, and semantic-loss reporting
- an SDK planner that derives routes and route summaries from registries
- shared semantic fixtures, generator contract helpers, cross-parser equivalence smoke, and a real-world corpus

The main structural risk is no longer missing tests or an obvious parser/generator correctness bug.
It is duplicated `Shape IR` traversal logic spread across diagnostics, validation, and other analysis-style consumers.

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
- local references and reusable definitions
- `null`
- optional presence
- `unknown`

Shared constraint and annotation coverage currently includes:

- string constraints: `pattern`, `minLength`, `maxLength`, `format`
- numeric constraints: `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`
- collection constraints: `minItems`, `maxItems`, `uniqueItems`
- object constraints: `closed-object`, `minProperties`, `maxProperties`
- portable annotations: `default`, `description`, `examples`, `readOnly`, `writeOnly`

## Current Priorities

Recommended order for near-term work:

1. extract a lightweight shared `Shape IR` traversal layer for diagnostics, validation, and future generators
2. keep capability, diagnostic, semantic-note, and semantic-loss reporting truthful while that refactor lands
3. keep the shared fixture, equivalence, integration, and corpus layers as regression guardrails instead of adding many more route-local tests
4. expand shared IR only when pressure appears across multiple formats, not because one source format wants a local convenience
5. defer broader parser or generator expansion until traversal duplication is no longer the sharper risk

## What Is Deferred

The repository should not prioritize these yet:

- broad new parser families
- many new generators in parallel
- property-based expansion before the current shared traversal layer exists
- TypeScript type-system ambition beyond the current schema-oriented subset
- format-local options that weaken the shared semantic contract

The next new format slice, once the core refactor settles, should still be a generator rather than another parser family.

## Recent Completed Work

As of July 21, 2026, the latest completed slice includes:

- shared semantic fixtures and helpers for diagnostics, generator contracts, capability coverage, and corpus execution
- first `typescript <-> json-schema` cross-parser equivalence smoke
- TypeScript syntax validation and JSON Schema structural validation in generator contract tests
- generator truthfulness assertions for `integer`, `unknown`, and `unknown`-absorbing unions
- route-local integration shrinkage away from duplicate full payload snapshots
- real-world corpus expansion from 6 to 10 cases

This consolidation did not expose a blocking parser, IR, or generator correctness defect.
It did expose shared traversal extraction as the next highest-leverage refactor.

## Verification

The latest local verification pass completed on July 21, 2026 and included:

- `pnpm exec tsc --noEmit`
- `pnpm test`

That pass was green with `38` test files and `513` passing tests.

## Reading Order

For active implementation work:

- read [test_plan.md](test_plan.md) for the current testing strategy
- read [schema-traversal.md](schema-traversal.md) before changing shared IR traversal behavior
- read [typescript-parser-cases.md](typescript-parser-cases.md) and [typescript-parser-preprocess.md](typescript-parser-preprocess.md) only when touching the TypeScript parser boundary

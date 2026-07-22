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
- a shared `Shape IR` traversal helper in `@aio/core` that now backs core schema validation plus generator diagnostics and validation passes
- a shared immutable `Shape IR` transform layer in `@aio/core`
- a dedicated shape-normalization exit in `@aio/core` built on top of the shared transform layer

Shared normalization coverage currently includes:

- union flattening and deduplication
- single-member union collapse
- unknown-evidence canonicalization
- `IdentifierName.words` metadata canonicalization for documents, definitions, and fields

The main structural risk is no longer missing tests, obvious parser or generator correctness bugs, or duplicated first-pass `Shape IR` traversal mechanics.
The sharper next risks are:

- keeping the new traversal contract stable while the IR evolves
- keeping transform and normalization semantics just as disciplined as traversal semantics
- deciding which future shared shape rewrites belong in normalization rather than in parsers or generators
- continuing to expand shared semantics only when pressure is truly cross-format

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

1. keep the new shared `Shape IR` traversal contract stable while consumer usage and tests harden around it
2. keep the new shared transform and normalization exits narrow, truthful, and clearly separate from generator output policy
3. keep capability, diagnostic, semantic-note, and semantic-loss reporting truthful as more consumers rely on the shared walker
4. keep the shared fixture, equivalence, integration, and corpus layers as regression guardrails instead of adding many more route-local tests
5. expand shared IR only when pressure appears across multiple formats, not because one source format wants a local convenience

## What Is Deferred

The repository should not prioritize these yet:

- broad new parser families
- many new generators in parallel
- property-based expansion before the current shared traversal layer has settled
- TypeScript type-system ambition beyond the current schema-oriented subset
- format-local options that weaken the shared semantic contract

The next new format slice, once the core refactor settles, should still be a generator rather than another parser family.

## Recent Completed Work

As of July 22, 2026, the latest completed slice includes:

- shared semantic fixtures and helpers for diagnostics, generator contracts, capability coverage, and corpus execution
- first `typescript <-> json-schema` cross-parser equivalence smoke
- TypeScript syntax validation and JSON Schema structural validation in generator contract tests
- generator truthfulness assertions for `integer`, `unknown`, and `unknown`-absorbing unions
- route-local integration shrinkage away from duplicate full payload snapshots
- real-world corpus expansion from 6 to 10 cases
- first shared `Shape IR` traversal extraction in `@aio/core`
- migration of core schema validation and both generator diagnostics and validation passes onto the shared walker
- focused traversal contract tests for path rules, reference-follow behavior, cycle guards, and traversal context metadata
- public API snapshot updates for the new traversal exports
- first shared immutable `Shape IR` transform extraction in `@aio/core`
- explicit transform entry semantics aligned with traversal across structure, root, and definitions modes
- explicit transform reference policy for root-reachable definition rewriting
- first dedicated `normalizeSchema...` exit built on top of transform, currently covering union flattening, union deduplication, single-member union collapse, unknown-evidence canonicalization, and identifier-word metadata canonicalization
- focused normalization tests covering structure-wide, root-reachable, and definitions-only normalization behavior

The resulting maturity is now:

- traversal: stable enough for current shared analysis consumers
- transform: usable but intentionally narrow
- normalization: real and already reused by test equivalence helpers, but still early enough that new rules should be added selectively

This slice did not expose a blocking parser, IR, generator, or public-surface regression.
It moved shared traversal extraction from the next refactor into implemented repository infrastructure.

## Verification

The latest local verification pass completed on July 22, 2026 and included:

- `pnpm check:api`
- `pnpm typecheck`
- `pnpm test`

That pass was green with `39` test files and `520` passing tests.

## Reading Order

For active implementation work:

- read [test_plan.md](test_plan.md) for the current testing strategy
- read [schema-traversal.md](schema-traversal.md) before changing shared IR traversal, transform, or normalization behavior
- read [typescript-parser-cases.md](typescript-parser-cases.md) and [typescript-parser-preprocess.md](typescript-parser-preprocess.md) only when touching the TypeScript parser boundary

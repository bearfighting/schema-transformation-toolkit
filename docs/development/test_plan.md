# Universal Data Model Converter Test Plan

This file is the active testing strategy page.
It should describe the current test architecture, the next worthwhile testing work, and the rules for using tests to guard refactors.

It should not become a second repository diary.
Repository-wide prioritization belongs in [progress.md](progress.md).

## Purpose

The project uses a `Parser -> IR -> Generator` architecture.
The test system therefore needs to verify more than rendered output strings.

The core testing goals are:

1. parser inputs are accepted or rejected truthfully
2. parsers produce the intended normalized IR semantics
3. generators preserve or explicitly report semantic widening or loss
4. route composition works across packages
5. diagnostics, semantic notes, capability reporting, and semantic-loss reporting stay aligned with real behavior
6. IR invariants and normalization remain stable during refactors

## Current State

As of July 21, 2026, the repository already has:

- core tests for IR validation and normalization
- parser tests for JSON, JSON Schema, and TypeScript boundaries
- generator tests for TypeScript and JSON Schema targets
- selected integration and round-trip smoke for all currently supported routes
- shared semantic fixtures in `tests/fixtures/semantics`
- shared helpers for diagnostics, generator contracts, capability coverage, equivalence, schema validation, and corpus execution
- a minimal cross-parser equivalence layer for `typescript <-> json-schema`
- generator legality checks:
  - TypeScript syntax validation
  - JSON Schema structural and `$ref` integrity validation
- a real-world corpus with 10 cases across JSON, JSON Schema, and TypeScript

This means the repository is no longer missing basic test coverage.
The current opportunity is to use the test suite as a refactor harness instead of continuing to grow many route-local assertions.

## Testing Layers

### Core

Core tests should verify:

- IR node validity
- normalization behavior
- invariants and guards
- shared helper behavior that is not source-format-specific

### Parser

Parser tests should verify:

- source-to-IR success cases
- explicit unsupported cases
- parser diagnostics and evidence
- parser-side normalization that remains truthful

Parser tests should not re-prove generator behavior.

### Generator

Generator tests should verify:

- IR-to-target rendering
- target-side semantic caveats or widening
- structured failure boundaries
- determinism where practical
- target validity checks

Generator tests should be the main place where target truthfulness is locked.

### Equivalence

Cross-parser equivalence tests should verify that semantically equivalent inputs normalize to equivalent shared IR.

For the current repository, this means:

- keep the existing `typescript <-> json-schema` smoke coverage
- expand via shared semantic fixtures instead of inventing a second assertion style

### Integration

Integration tests should verify route-specific composition risks:

- parser and generator actually connect
- route options behave correctly
- route-specific failure surfaces remain stable
- route-specific output shape remains usable

Integration tests should not duplicate every generator event payload or every semantic fixture case.

### Corpus

Corpus tests should verify combined real-world pressure that small fixtures cannot provide.

Current corpus pressure should stay focused on:

- reusable-definition graphs
- widening-heavy JSON Schema bundles
- OpenAPI-like response envelopes
- nested JSON config documents
- tuple, record, union, and readonly composition in TypeScript sources

## Shared Fixture Rules

Shared semantic fixtures are now the default place for reusable semantic cases.

Use them for:

- primitive and literal semantics
- presence versus nullability
- arrays, tuples, records, and nested objects
- references and reusable definitions
- constraints and portable annotations
- generator truthfulness expectations
- SDK semantic caveat and loss expectations when the case is shared rather than route-specific

Avoid reintroducing route-local copies of the same semantic scenario unless a route adds unique behavior on top.

## Current Priorities

Recommended order for the next testing work:

1. keep the current fixture, contract, equivalence, integration, and corpus suite green as the shared traversal contract settles
2. continue migrating repeated parser, generator, and SDK truthfulness assertions into shared fixtures and helpers
3. keep trimming only the integration cases that merely restate shared semantic behavior
4. expand the corpus only when it adds new traversal pressure, definition-graph pressure, or target truthfulness pressure

## What To Avoid

The test suite should avoid:

- rebuilding huge integration snapshots as the main source of confidence
- proving the same widening or loss case separately in parser, generator, SDK, and route tests when one shared fixture can drive them
- using exact string equality where semantic or structural equivalence is the real contract
- adding new parser or generator families before the current suite has fully absorbed the shared traversal contract
- letting corpus tests replace focused semantic fixtures

## Refactor Acceptance

For structural refactors such as shared traversal extraction, the test suite should answer:

1. did diagnostics stay stable enough to remain truthful
2. did semantic notes and loss reporting stay aligned
3. did supported routes preserve the same success or failure boundaries
4. did generator legality checks remain green
5. did corpus pressure still pass without hidden semantic drift

The current suite is already strong enough to serve as that acceptance harness.

## Current Highest-Value Next Step

The most valuable next testing use is to keep protecting the lightweight shared `Shape IR` traversal contract now that extraction has landed.

That means:

- do not broaden semantics casually while traversal consumers accumulate
- keep fixture-driven truthfulness checks as the first line of defense
- keep integration tests focused on route-specific behavior only
- use corpus additions sparingly and only when they add real traversal or composition pressure
- keep a focused walker test file covering path rules, reference modes, cycle guards, and traversal context metadata

## Verification Baseline

The default repository validation pass remains:

```bash
pnpm test
pnpm typecheck
```

For public-surface or boundary-sensitive changes, use:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm check:public-api
```

The latest full regression pass on July 22, 2026 was green with:

- `pnpm check:api`
- `pnpm typecheck`
- `pnpm test`
- `39` test files
- `520` passing tests

# Architecture Layering

## Purpose

This document defines the intended long-term architecture boundary for supported sources, supported targets, IR layering, and typed capability registration.

It exists to answer four questions before the project grows further:

- what kinds of formats and languages are in scope as sources and targets
- which IR layer should each source or target map to
- which semantics belong in shared shape modeling versus value or validation modeling
- how parser, transformer, and generator capabilities should be registered and routed in code

Use [ir-boundaries.md](ir-boundaries.md) for the semantic meaning of `Value IR`, `Shape IR`, and `Constraint IR`.
This document should stay focused on architecture shape, routing, and registry design.

## Source And Target Families

The project should treat supported inputs and outputs as belonging to one of three families.

### 1. Value Formats

These are concrete serialized value formats.

Examples:

- JSON
- YAML
- TOML

These formats primarily describe values, not reusable schema definitions.

### 2. Schema And Validator Definitions

These formats describe reusable schema meaning, validation behavior, or both.

Examples:

- JSON Schema
- Protocol Buffers message schemas
- validator libraries such as Zod or similar ecosystems

These formats often mix shared shape semantics with additional constraints, metadata, or runtime-validation behavior.

### 3. Serializable Programming-Language Type Definitions

These are language-native definitions that describe serializable data structures.

Examples:

- TypeScript schema-oriented types
- Go structs used as serialized DTOs
- Rust serde-oriented types
- other language-level serializable type declarations

These should be treated differently from full language front-ends.
The project is concerned only with their serializable data-shape subset.

## Layering Rule

The architecture assumes three IR layers:

- `Value IR` for serialized values
- `Shape IR` for reusable serializable structure
- `Constraint IR` for validation and portable annotation semantics layered on top of shape

The architectural rule is:

- `Value IR` stands on its own
- `Shape IR` stands on its own
- `Constraint IR` depends on `Shape IR`

The semantic details and decision rules for those layers live in [ir-boundaries.md](ir-boundaries.md).

## Current Package Boundary Pattern

The repository should keep converging on one consistent package-entry pattern across parsers, generators, and the SDK.

The current preferred structure is:

- `index.ts`: public package export surface only
- `api.ts`: package-level runtime entry points and configured default instances
- `options.ts`: option resolution, validation, and configured factory helpers
- focused internal modules: implementation details such as `convert.ts`, `emit.ts`, `value.ts`, `report.ts`, `losses.ts`, or similar

This pattern matters because it keeps three different concerns separate:

- public package shape
- runtime orchestration or entry behavior
- internal implementation details

The goal is not file-count uniformity for its own sake.
The goal is to make it obvious where to extend behavior, where to preserve compatibility, and where internal helpers can evolve without silently changing package contracts.

## Current SDK Boundary Pattern

The SDK should remain a thin orchestration layer over parser and generator packages rather than becoming a new semantic home for format-specific logic.

The current preferred internal split is:

- `types.ts`: public SDK result and option contracts
- `registry.ts`: capability registries, route planning, and route summaries
- `source.ts`: source parsing and artifact production
- `generate.ts`: target generation dispatch
- `losses.ts`: semantic-loss planning
- `report.ts`: report assembly and preserved-capability collection
- `convert.ts`: end-to-end orchestration only

Future work should preserve this rule: if logic can live in a narrower module than `convert.ts`, it should.

The key rule is:

- constraints should target shape nodes
- constraints should not restate the whole shape subtree they decorate

## Routing Implication

This relationship clarifies source and target routing:

- value formats primarily target `Value IR`
- serializable language type definitions primarily target `Shape IR`
- schema and validator definitions may target `Shape IR + Constraint IR`

Likewise for generation:

- language-type generators can often consume only `Shape IR`
- richer schema and validator generators may need `Shape IR + Constraint IR`
- value-format generators should stay in the `Value IR` lane unless a separate inference or lowering step is involved

Allowed conceptual flows:

- `Value IR -> Shape IR` for inference or schema extraction
- `Shape IR -> Constraint IR` for constraint enrichment
- `Constraint IR -> target` when a target can preserve both shape and constraints

Avoid:

- forcing value-format concerns into `Shape IR`
- forcing validator-specific semantics directly into `Shape IR`
- treating `Constraint IR` as a replacement for `Shape IR`

## Routing Expectations By Family

The intended default routing should be:

### Value Formats

- parsers produce `Value IR`
- value-format generators consume `Value IR`
- inference layers may convert `Value IR -> Shape IR`

### Serializable Type Definitions

- parsers produce `Shape IR`
- generators consume `Shape IR`

### Schema And Validator Definitions

- shape-oriented subsets may produce `Shape IR`
- richer validator-aware surfaces may produce `Shape IR + Constraint IR`
- generators may consume only `Shape IR` when target support is shape-only
- generators may consume `Shape IR + Constraint IR` when target support includes richer validation semantics

## Why One IR Is Not Enough

One shared IR is not a good fit for the full long-term scope.

If the project keeps only one IR:

- value-format details can distort shape modeling
- validator-specific semantics can bloat the shared type-shape model
- parser and generator capability boundaries become harder to reason about

Multiple layers give a clearer rule:

- use `Value IR` for values
- use `Shape IR` for serializable structure
- use `Constraint IR` for extra schema or validator semantics

## Typed Capability Registry

The project should also grow from the current static route table into a typed runtime registry that knows which capabilities connect to which IR layer.

This registry should be the code-level source of truth for:

- which parser handles which input format
- which IR layer a parser produces
- which generator handles which target format
- which IR layer a generator consumes
- which intermediate transformers exist between IR layers
- which capabilities are required versus optional
- which semantic loss boundaries apply to a chosen route

## Current Repository Status

The repository already has a first orchestration layer in `packages/sdk/src/convert.ts`.

Today it provides:

- `planConversion`
- `listConversionRoutes`
- `convert`
- registry-backed `ConversionRoute` metadata with `irSequence` and `stages`
- parser and generator capability declarations in code
- route capability summaries derived from those declarations

The current planner is no longer only a hand-maintained static route table.
It already derives route and capability information from parser and generator registries.

The next step is to keep pushing that direction:

- preserve the registry as the source of truth
- add richer matching only when repeated use cases require it
- avoid rebuilding a second planning system in docs or tests

## Registry Responsibilities

The registry should stay intentionally small and do four jobs well:

- declare what each parser, generator, and future transformer consumes or produces
- prevent invalid chains such as wiring a `Shape IR` generator directly to a `Value IR` parser output
- resolve a truthful route from source format to target format
- provide one integration surface for SDK, CLI, and future service layers

The important modeling rule is not the exact type shape.
It is:

- separate parser, generator, and transformer roles explicitly
- keep IR-layer dependencies explicit
- distinguish required IR from optional preserved IR
- let the planner reason from declared capabilities rather than only hard-coded format pairs

## Runtime Planning Rule

For any requested conversion, the planner should answer:

1. can parser output satisfy generator input truthfully
2. if yes, what route preserves the most useful semantics with the least extra machinery

At minimum, that means tracking:

- parser stage
- zero or more transformer stages
- generator stage
- materialized IR layers carried between stages
- capability and semantic-loss metadata for the resulting route

## Planned Repository Transition

The intended evolution path should be:

1. keep the current registry-backed planner as the executable baseline
2. continue enriching parser and generator capability declarations
3. add richer matching only when new IR families or real transformer steps require it
4. keep hard-coded route assumptions out of new package-local logic

This keeps the current SDK working while moving orchestration toward the long-term architecture described here without reintroducing duplicated planning logic.

## Recommended First-Phase Rule

Keep the registry simple:

- explicit registration
- basic lookup by source or target
- simple compatibility checks

Do not turn it into a general optimizer unless the repository actually needs that complexity.

## Practical Consequences For Current Work

Under this model:

- the current `@aio/core` schema package remains the `Shape IR`
- the current JSON parser remains a `Value IR` plus inferred `Shape IR` producer
- the current TypeScript parser remains a `Shape IR` producer
- the current JSON Schema parser remains a `Shape IR + Constraint IR` producer for its supported subset
- future value-format-first parsers such as YAML or TOML should be evaluated carefully against `Value IR`
- future validator-focused work such as Zod should be evaluated carefully against `Constraint IR`

## Current Architectural Rule

Until the additional IR layers are implemented, new parser and generator work should still ask:

- is this capability primarily about values
- is it primarily about serializable shape
- is it primarily about extra constraints or validator semantics

That classification should guide whether the work belongs in the current `Shape IR`, should be deferred, or should be treated as a future `Value IR` or `Constraint IR` concern.

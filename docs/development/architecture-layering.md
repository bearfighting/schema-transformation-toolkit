# Architecture Layering

## Purpose

This document defines the intended long-term architecture boundary for supported sources, supported targets, IR layering, and typed capability registration.

It exists to answer four questions before the project grows further:

- what kinds of formats and languages are in scope as sources and targets
- which IR layer should each source or target map to
- which semantics belong in shared shape modeling versus value or validation modeling
- how parser, transformer, and generator capabilities should be registered and routed in code

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

## Recommended IR Layers

The project should evolve toward three IR layers rather than forcing every capability into one shared model.

### Value IR

Purpose:

- represent actual serialized values and their format-facing structure

Good fit for:

- JSON
- YAML
- TOML

Responsibilities:

- scalar values
- arrays
- objects or maps
- null and format-native primitive distinctions

Non-goals:

- reusable schema definitions
- validation constraints
- language-type semantics

### Shape IR

Purpose:

- represent stable serializable structure independent of one concrete schema ecosystem

This is the current project core.

Good fit for:

- TypeScript serializable type subsets
- JSON Schema shape subsets
- Protocol Buffers message-shape subsets
- schema inference from sample values

Responsibilities:

- object
- record or map
- array
- tuple
- optional presence
- nullable value semantics
- literal values
- unions
- references and reusable definitions

Non-goals:

- format-level parsing trivia
- full validation semantics
- arbitrary language or library runtime behavior

### Constraint IR

Purpose:

- represent validation, annotation, or schema-system semantics that build on top of shape

Good fit for:

- JSON Schema constraints
- validator-library constraints and metadata
- schema annotations that materially affect validation or generation behavior

Likely responsibilities:

- string constraints
- numeric constraints
- collection constraints
- object-closure semantics
- defaults, descriptions, examples, or other portable annotations
- perhaps an eventual impossible-schema concept if it proves shared

Non-goals:

- arbitrary runtime transformations
- user code callbacks
- library-specific execution hooks that cannot be shared meaningfully

## Constraint IR Relationship To Shape IR

`Constraint IR` should be layered on top of `Shape IR`, but it should not be merged into the same node model.

That means:

- `Constraint IR` depends on `Shape IR`
- `Constraint IR` should reuse `Shape IR` as the source of structural truth
- `Constraint IR` should remain structurally separate so validation and annotation semantics do not bloat `Shape IR`

This avoids two opposite problems:

- a fully separate model that redundantly re-describes shape
- a merged model where every validator-specific concern starts inflating the shared shape layer

## Recommended Modeling Rule

The preferred model is:

- one shape document that describes structure
- one constraint document or constraint layer that points into that shape document

Conceptually:

```ts
interface ShapeDocument {
  root: ShapeNode;
  definitions: ShapeDefinition[];
}

interface ConstraintDocument {
  shape: ShapeDocument;
  constraints: ConstraintEntry[];
}
```

The exact runtime shape can change later.
The important rule is that shape stays authoritative for structure, while constraints are attached separately.

## Avoiding Semantic And Code Duplication

The main anti-duplication rule should be:

- `Shape IR` answers: "what is this serialized structure?"
- `Constraint IR` answers: "what extra rules or annotations also apply to it?"

If removing a piece of information still leaves a meaningful, though broader, structural type, it is usually a `Constraint IR` concern.

Examples that usually belong in `Constraint IR`:

- `minimum`
- `maximum`
- `pattern`
- `format`
- `description`
- `default`
- object closure or similar validation-oriented constraints

If removing a piece of information changes the core serializable structure itself, it is usually a `Shape IR` concern.

Examples that usually belong in `Shape IR`:

- optional presence
- nullable value semantics
- tuple structure
- object versus record
- unions
- references and reusable definitions

## Recommended Attachment Strategy

Constraint entries should point to shape-level structure rather than re-encode it.

The preferred long-term target is a stable identifier or node reference model.
If that does not exist yet, a path-based attachment model can be acceptable as an intermediate step.

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

## Layering Rule

The intended dependency direction should be:

- `Constraint IR` builds on `Shape IR`
- `Shape IR` stands on its own
- `Value IR` stands on its own

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
- static `ConversionRoute` metadata with `irSequence` and `stages`

Current route metadata is still hand-authored and format-pair-specific.

That is useful as a first implementation, but it is now behind the actual parser and generator contracts because:

- JSON Schema parsing can produce `Shape IR + Constraint IR`
- JSON Schema generation can consume `Constraint IR`
- route metadata still labels JSON Schema routes only as `shape` routes

So the next step is not inventing orchestration from scratch.
It is evolving the existing SDK planner from static route selection into runtime capability matching.

## Registry Responsibilities

At minimum, the registry should support four responsibilities.

### 1. Capability Declaration

Each parser, transformer, and generator should declare:

- its stable identifier
- its input surface
- its output surface
- the IR layer it consumes or produces

### 2. Legality Checking

The registry should make it hard to wire invalid chains together.

Examples:

- a generator that requires `Shape IR` should not be treated as a `Value IR` generator
- a constraint-aware generator should be distinguishable from a shape-only generator

### 3. Routing

Given a source and target, the registry should support path resolution such as:

- `json-schema -> typescript`
- `json -> json-schema`
- `yaml -> typescript`

That path may involve:

- parser
- zero or more IR transformers
- generator

### 4. Application Interface

The registry should provide a stable integration point for:

- CLI commands
- SDK entry points
- future service APIs
- future UI or workflow orchestration

## Recommended Capability Kinds

The registry should distinguish at least three capability kinds.

### Parser

- converts a source format into an IR layer

### Generator

- converts an IR layer into a target format

### Transformer

- converts one IR layer into another IR layer

This matters because a multi-layer architecture cannot be expressed clearly with parser and generator kinds alone.

## Recommended Minimal Type Shape

The next registry version should stay intentionally small, but it should be richer than the current static route table.

```ts
type IrKind = "value" | "shape" | "constraint";

interface ParserCapability {
  kind: "parser";
  id: string;
  sourceFormat: string;
  produces: IrKind[];
  optionalProduces?: IrKind[];
  semanticCapabilities?: string[];
}

interface GeneratorCapability {
  kind: "generator";
  id: string;
  targetFormat: string;
  requires: IrKind[];
  optionalConsumes?: IrKind[];
  semanticCapabilities?: string[];
}

interface TransformerCapability {
  kind: "transformer";
  id: string;
  from: IrKind;
  to: IrKind;
  semanticCapabilities?: string[];
}
```

The exact names can change later.
What matters now is:

- typed separation of parser, transformer, and generator roles
- explicit IR-layer boundaries
- explicit required-versus-optional IR dependencies
- a route planner that can operate from capabilities rather than only hard-coded format pairs

## Runtime Planning Rule

The runtime planner should answer two questions for every requested conversion.

### 1. Can This Parser And Generator Be Matched Truthfully

That requires checking:

- whether the parser can produce the IRs the generator requires
- whether missing IRs can be synthesized through declared transformers
- whether the resulting route stays within allowed semantic-loss boundaries

### 2. If They Can Be Matched, What Is The Best Route

That route should include:

- parser stage
- zero or more transformer stages
- generator stage
- the materialized IR set carried between stages
- capability and semantic-loss metadata for the final result

## Planned Repository Transition

The intended evolution path should be:

1. keep the current static route table as the executable baseline
2. add explicit parser and generator capability declarations next to route planning
3. teach the planner to derive routes from capability declarations
4. downgrade the hand-written route table into tests or fallback fixtures

This keeps the current SDK working while moving orchestration toward the long-term architecture described in this document.

## Recommended First-Phase Rule

The first implementation of the registry should stay simple.

It should:

- support explicit static registration
- support basic lookup by source or target
- validate simple chain compatibility

It should not yet try to become:

- a full optimizer
- a weighted graph planner
- an automatic best-path chooser for every future conversion scenario

Those can come later if the project actually needs them.

## Practical Consequences For Current Work

Under this model:

- the current `@aio/core` schema package remains the `Shape IR`
- the current JSON and TypeScript schema parsers remain `Shape IR` producers
- the current JSON Schema parser remains a `Shape IR` producer for its current supported subset
- future value-format-first parsers such as YAML or TOML should be evaluated carefully against `Value IR`
- future validator-focused work such as Zod should be evaluated carefully against `Constraint IR`

## Current Architectural Rule

Until the additional IR layers are implemented, new parser and generator work should still ask:

- is this capability primarily about values
- is it primarily about serializable shape
- is it primarily about extra constraints or validator semantics

That classification should guide whether the work belongs in the current `Shape IR`, should be deferred, or should be treated as a future `Value IR` or `Constraint IR` concern.

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

The project should also grow a typed registry that knows which capabilities connect to which IR layer.

This registry should be the code-level source of truth for:

- which parser handles which input format
- which IR layer a parser produces
- which generator handles which target format
- which IR layer a generator consumes
- which intermediate transformers exist between IR layers

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

The first registry version can stay intentionally small.

```ts
type IrKind = "value" | "shape" | "constraint";

type CapabilityKind = "parser" | "generator" | "transformer";

interface ParserRegistration {
  kind: "parser";
  id: string;
  inputFormat: string;
  outputIr: IrKind;
}

interface GeneratorRegistration {
  kind: "generator";
  id: string;
  inputIr: IrKind;
  outputFormat: string;
}

interface TransformerRegistration {
  kind: "transformer";
  id: string;
  inputIr: IrKind;
  outputIr: IrKind;
}
```

The exact names can change later.
What matters now is the typed separation of parser, transformer, and generator roles, plus explicit IR-layer boundaries.

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

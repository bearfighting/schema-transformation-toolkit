# IR Boundaries

## Purpose

This document defines the intended semantic boundary between `Value IR`, `Shape IR`, and `Constraint IR`.

It exists to answer three questions before more parser or generator work lands:

- what each IR layer is responsible for
- how to decide whether a semantic belongs in shape or constraints
- how parsers, transformers, and generators should compose across the three layers

## Current Repository Status

Today the repository has an explicit multi-IR shell in `@aio/core`.

The current implemented state is:

- `Value IR` exists as a concrete value tree
- `Shape IR` exists as the current `SchemaDocument` and `SchemaNode` model
- `Constraint IR` exists as a separate document with targeted entries
- `IrModel` exists as the combined transport model that can carry any subset of the three layers

Current examples:

- the JSON path materializes `ValueDocument` and inferred `ShapeDocument`
- the TypeScript parser directly produces `Shape IR`
- the JSON Schema parser produces `Shape IR` plus `Constraint IR`
- the JSON Schema generator can render from `Shape IR` alone or from `Shape IR + Constraint IR`

This means the repository is no longer only discussing a future split.
The split now exists, but routing and capability matching are still in a transitional state.

## Three IR Layers

### Value IR

`Value IR` answers one question:

> what concrete value is present?

Its job is to represent serialized data as data, without inferring reusable schema meaning.

Good fit for:

- JSON
- YAML
- TOML

Expected responsibilities:

- object or map values
- array values
- string values
- numeric values
- boolean values
- `null`

Non-goals:

- reusable type definitions
- optional-versus-required field semantics
- validator constraints
- language-specific type syntax

### Shape IR

`Shape IR` answers one question:

> what serialized structure is allowed?

Its job is to represent reusable structural type meaning independent of one source language or schema ecosystem.

Good fit for:

- TypeScript serializable type subsets
- JSON sample inference
- JSON Schema structural subsets
- future schema-oriented language targets

Expected responsibilities:

- scalar families such as `string`, `integer`, `number`, `boolean`
- exact scalar literals when they materially affect structure
- `object`
- `record`
- `array`
- `tuple`
- `union`
- `reference`
- reusable `definitions`
- optional presence
- nullable value semantics
- `unknown` when structure cannot be resolved safely

Non-goals:

- full language syntax fidelity
- validator-specific rules
- annotations that do not change structure

Current repository note:

The current `SchemaDocument` and `SchemaNode` model in `@aio/core` should be treated as `Shape IR v0`.

### Constraint IR

`Constraint IR` answers one question:

> what extra validation or portable annotation rules apply to an already-known shape?

Its job is to describe semantics that narrow, annotate, or qualify an existing shape without redefining that shape.

Good fit for:

- JSON Schema validation keywords
- OpenAPI schema constraints
- validator-library refinements that are portable enough to share

Expected responsibilities:

- numeric constraints such as `minimum` and `maximum`
- string constraints such as `minLength`, `maxLength`, and `pattern`
- collection constraints such as `minItems`, `maxItems`, and `uniqueItems`
- object-wide rules such as open-versus-closed behavior when that proves to be shared
- portable annotations such as `description`, `default`, or `examples` if they become shared generator inputs

Non-goals:

- rebuilding a second structural tree
- arbitrary runtime callbacks or execution hooks
- source-language trivia

## Decision Rule: Shape vs Constraint

Use this rule first:

> if removing a semantic changes the core allowed structure, it belongs to `Shape IR`

Otherwise:

> if removing a semantic leaves the same structure but with looser validation, it belongs to `Constraint IR`

### Usually Shape

- `object`
- `record`
- `array`
- `tuple`
- `union`
- `reference`
- reusable `definitions`
- optional presence
- nullable value semantics

### Usually Constraint

- `minimum`
- `maximum`
- `exclusiveMinimum`
- `exclusiveMaximum`
- `multipleOf`
- `minLength`
- `maxLength`
- `pattern`
- `minItems`
- `maxItems`
- `uniqueItems`

### Current Gray Areas

These are now partially implemented in `Constraint IR`, but should still be treated as areas that may refine further as more sources and targets land:

- object open-versus-closed semantics
- portable annotations such as `description`, `default`, and `examples`
- whether an eventual impossible-schema concept belongs in `Shape IR`, `Constraint IR`, or a combined model

Current working repository state:

- `closed-object` is represented in `Constraint IR`
- `format`, `default`, `examples`, `description`, `read-only`, and `write-only` are represented in `Constraint IR`
- `required` and `nullable` remain `Shape IR` concerns

The working rule for gray areas is:

- do not promote them into shared IR just because one format can express them
- gather repeated pressure from multiple sources or targets first

## Layer Relationships

The three IRs should be related, but not collapsed into one model.

Recommended dependency direction:

- `Value IR` stands alone
- `Shape IR` stands alone
- `Constraint IR` depends on `Shape IR`

That means:

- a value parser should not be forced to emit constraints
- a shape parser should not be forced to emit values
- a constraint layer should attach to an existing shape instead of duplicating structure

## Recommended Document Model

The current repository already follows this model conceptually:

```ts
interface ModelDocument {
  value?: ValueDocument;
  shape?: ShapeDocument;
  constraints?: ConstraintDocument;
}
```

In code, this transport model exists today as `IrModel` in `@aio/core`.

With the following meaning:

- `value` is present for value-format workflows
- `shape` is present for schema and language-type workflows
- `constraints` is present only when the source or target meaning includes them

This is a routing model, not a requirement that every workflow materialize every layer.

## Constraint Attachment Model

`Constraint IR` should not mirror the full shape tree.

The current repository already follows this rule through targeted entries:

```ts
interface ConstraintTarget {
  kind: "document" | "root" | "definition" | "field" | "node";
  path: string[];
}

interface ConstraintEntry {
  target: ConstraintTarget;
  constraints: Constraint[];
}
```

This is intentionally an overlay model:

- shape remains the source of structural truth
- constraints attach by logical path
- generators and transforms can consume constraints opportunistically without changing `Shape IR`

## Current Pipeline Reality

Today the SDK route planner still uses a static route table.

That static plan is only a partial description of runtime behavior:

- `json -> *` routes explicitly pass through `value` then `shape`
- `typescript -> *` routes explicitly pass through `shape`
- `json-schema -> *` routes are still labeled as `shape` routes in route metadata
- but the runtime already preserves `constraints` when the parser produces them and the generator can consume them

So the repository is currently in an intermediate state:

- IR boundaries are now explicit in core contracts
- runtime artifacts can already carry multiple IR layers
- route metadata has not yet been promoted into a true capability planner

## Next Boundary Rule

The next routing implementation should stop hard-coding only `source format -> target format`.

Instead, it should answer at runtime:

- what IRs a parser can produce
- which of those IRs are required by the selected generator
- which IRs are optional but preservable
- whether a transformer is needed between produced and required IRs
- what semantics will be preserved, normalized, or lost along the way

Recommended direction:

- `ShapeDocument` remains the structural source of truth
- `ConstraintDocument` stores entries that target shape nodes
- each constraint entry attaches rules to one shape node or one shape field

Conceptually:

```ts
interface ConstraintDocument {
  entries: ConstraintEntry[];
}

interface ConstraintEntry {
  target: ShapeNodeTarget;
  constraints: Constraint[];
}
```

Preferred long-term attachment:

- stable node ids or explicit node references

Acceptable intermediate attachment:

- logical shape paths

Avoid:

- a second tree of `ConstraintObject`, `ConstraintArray`, `ConstraintTuple`, and similar mirrored node kinds

## Parser Responsibilities

Each parser should emit only the layers that naturally exist in its source.

### Value-Family Parsers

Examples:

- JSON
- YAML
- TOML

Recommended output:

- primary output: `Value IR`
- optional follow-on transform: `Value IR -> Shape IR`

Important rule:

- parsing a value and inferring a shape are different responsibilities, even if one package temporarily offers both

### Shape-Family Parsers

Examples:

- TypeScript serializable type subset
- future schema-oriented language types

Recommended output:

- primary output: `Shape IR`

Important rule:

- these parsers should target structural meaning, not full language semantics

### Shape-Plus-Constraint Parsers

Examples:

- JSON Schema
- OpenAPI schema objects
- validator DSLs that mix structure and refinements

Recommended output:

- `Shape IR`
- `Constraint IR` when supported semantics require it

Important rule:

- if a source contains both shape and constraints, the parser should separate them conceptually even if implementation staging lands in phases

## Generator Responsibilities

Generators should declare which IR layers they consume.

### Value Generators

Examples:

- JSON output
- YAML output
- TOML output

Recommended input:

- `Value IR`

### Shape Generators

Examples:

- TypeScript generator
- future Rust, Go, Java, or Kotlin schema-oriented generators

Recommended input:

- `Shape IR`

### Shape-Plus-Constraint Generators

Examples:

- JSON Schema generator
- OpenAPI schema generator
- validator-library generators

Recommended input:

- `Shape IR`
- optional `Constraint IR`

Important rule:

- successful generation from shape alone must still be allowed when constraints are absent
- when constraints are present but unsupported, the generator should report semantic loss explicitly

## Recommended Pipeline Rules

The project should prefer explicit transforms over hidden mixed responsibilities.

Recommended flows:

1. `JSON/YAML/TOML -> Value IR`
2. `Value IR -> Shape IR` for inference-oriented workflows
3. `TypeScript subset -> Shape IR`
4. `JSON Schema -> Shape IR + Constraint IR`
5. `Shape IR -> TypeScript`
6. `Shape IR + Constraint IR -> JSON Schema`

This keeps the architecture honest about where inference, structure, and validation are happening.

## Current Practical Mapping

For the current repository, use this interpretation:

- `@aio/core` is the canonical home of `Shape IR v0`
- the JSON parser currently mixes value parsing and shape inference in one package boundary
- the TypeScript parser is a direct `Shape IR` producer
- the JSON Schema parser is currently a shape-subset parser with explicit exclusions for many constraint keywords
- the JSON Schema generator is currently a shape-first generator with target-local rendering options

This is acceptable as an implementation stage.

What should change next is the architecture contract, not an immediate full code rewrite.

## Near-Term Implementation Guidance

Before adding new languages or broad new schema features, prefer this order:

1. explicitly document the current `Shape IR v0` boundary
2. document which source semantics are intentionally dropped, normalized, or deferred
3. add capability and semantic-loss reporting around parser and generator behavior
4. gather evidence about repeated pressure for shared constraints
5. only then decide whether to introduce a real `Constraint IR`

This keeps the repository from overfitting shared abstractions to JSON Schema alone.

## Design Guardrails

- do not expand `Shape IR` just to preserve one source format's validation details
- do not treat value inference as proof that value and shape must share one model
- do not duplicate shape structure inside future constraint modeling
- do not add new parser or generator families without first stating which IR layer they consume or produce
- do not silently erase unsupported semantics when a diagnostic or loss report would preserve important truth

## Open Design Questions

- should object open-versus-closed behavior become a shared semantic or remain target-local?
- what is the minimum useful first version of `Constraint IR` if it is introduced?
- should semantic-loss reporting exist before `Constraint IR`, and likely as part of every generator result shape?
- when `Value IR` arrives, should JSON parsing split into two packages or remain one package with two entry points?

These questions should be resolved with implementation evidence, not just preference.

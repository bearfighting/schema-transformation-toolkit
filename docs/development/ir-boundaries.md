# IR Boundaries

## Purpose

This document defines the intended semantic boundary between `Value IR`, `Shape IR`, and `Constraint IR`.

It exists to answer three questions before more parser or generator work lands:

- what each IR layer is responsible for
- how to decide whether a semantic belongs in shape or constraints
- how parsers, transformers, and generators should compose across the three layers

Use [architecture-layering.md](architecture-layering.md) for long-term routing, registry, and orchestration structure.
This document should stay focused on IR meaning, current implemented boundaries, and layer-composition rules.

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
The split now exists in code and is already part of runtime artifacts and route planning.

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

## Current Composition Reality

Today the SDK planner already carries the multi-IR split in runtime route metadata:

- `json -> *` routes explicitly pass through `value` then `shape`
- `typescript -> *` routes explicitly pass through `shape`
- `json-schema -> json-schema` routes explicitly preserve `constraint`
- runtime artifacts can carry `value`, `shape`, and `constraints` together when available

So the current repository should be read as:

- IR boundaries are explicit in core contracts
- runtime planning already understands multiple IR layers
- future work should refine capability matching without collapsing those boundaries

## Constraint Attachment Rule

`ShapeDocument` remains the structural source of truth.
`ConstraintDocument` should store entries that target shape nodes or fields rather than mirroring the full shape tree.

Preferred long-term attachment:

- stable node ids or explicit node references

Acceptable intermediate attachment:

- logical shape paths

Avoid:

- a second tree of `ConstraintObject`, `ConstraintArray`, `ConstraintTuple`, and similar mirrored node kinds

## Producer And Consumer Rules

Parsers should emit only the layers that naturally exist in their source:

- value-family parsers primarily produce `Value IR`
- serializable-type parsers primarily produce `Shape IR`
- schema-and-validator parsers may produce `Shape IR + Constraint IR`

Generators should consume only the layers they actually need:

- value generators consume `Value IR`
- language-type generators usually consume `Shape IR`
- richer schema generators may consume `Shape IR + Constraint IR`

The guiding rule is to prefer explicit transforms over hidden mixed responsibilities.
That keeps inference, structure, and validation separate even when one package temporarily offers multiple steps.

## Current Practical Mapping

For the current repository, use this interpretation:

- `@aio/core` is the canonical home of `Shape IR v0`
- the JSON path materializes `Value IR` and then infers `Shape IR`
- the TypeScript parser is a direct `Shape IR` producer
- the JSON Schema parser is a `Shape IR + Constraint IR` producer for the currently supported subset
- the JSON Schema generator can consume `Shape IR` alone or `Shape IR + Constraint IR`

## Design Guardrails

- do not expand `Shape IR` just to preserve one source format's validation details
- do not treat value inference as proof that value and shape must share one model
- do not duplicate shape structure inside future constraint modeling
- do not add new parser or generator families without first stating which IR layer they consume or produce
- do not silently erase unsupported semantics when a diagnostic or loss report would preserve important truth

## Maintenance Rule

- keep this file focused on IR meaning, semantic placement rules, and current layer composition
- keep routing and registry evolution in [architecture-layering.md](architecture-layering.md)
- keep repository-level prioritization in [progress.md](progress.md)

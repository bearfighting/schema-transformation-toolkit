# IR Boundaries

This document defines the semantic boundary between `Value IR`, `Shape IR`, and `Constraint IR`.

Use [architecture-layering.md](architecture-layering.md) for routing and package structure.

## Current State

The repository already has an explicit multi-IR shell:

- `Value IR` exists as a concrete value tree
- `Shape IR` exists as the current schema document and node model
- `Constraint IR` exists as a separate overlay document
- `IrModel` is the transport model that can carry any subset of those layers

The split is no longer theoretical.
It is already part of runtime artifacts and route planning.

## Layer Meaning

### Value IR

`Value IR` answers:

> what concrete value is present?

It is for serialized data as data.
It is not for reusable schema meaning, constraints, or language syntax.

Good fit:

- JSON
- YAML
- TOML

### Shape IR

`Shape IR` answers:

> what serialized structure is allowed?

It is for reusable serializable structure independent of one source language or schema ecosystem.

Good fit:

- object, record, array, tuple, union, reference, reusable definitions
- scalar families, literals, `null`, optional presence, nullable value semantics, `unknown`

Non-goals:

- full language syntax fidelity
- validator-specific rules
- annotations that do not change structure

The current `SchemaDocument` and `SchemaNode` model should be treated as `Shape IR v0`.

### Constraint IR

`Constraint IR` answers:

> what extra validation or portable annotation rules apply to an already-known shape?

It is for semantics that narrow, annotate, or qualify an existing shape without rebuilding that shape.

Good fit:

- numeric constraints
- string constraints
- collection constraints
- object-wide rules such as closure when that proves shared
- portable annotations such as `description`, `default`, or `examples`

Non-goals:

- duplicating the full shape tree
- arbitrary runtime callbacks
- source-language trivia

## Shape Versus Constraint Rule

Use this test first:

> if removing a semantic changes the core allowed structure, it belongs to `Shape IR`

Otherwise:

> if removing a semantic leaves the same structure but with looser validation or less annotation, it belongs to `Constraint IR`

Usually `Shape IR`:

- object
- record
- array
- tuple
- union
- reference
- reusable definitions
- optional presence
- nullable value semantics

Usually `Constraint IR`:

- `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`
- `minLength`, `maxLength`, `pattern`, `format`
- `minItems`, `maxItems`, `uniqueItems`
- `minProperties`, `maxProperties`
- portable annotations

## Current Gray Areas

These need repeated cross-format pressure before being treated as settled shared semantics:

- object open-versus-closed behavior
- portable annotations as first-class generator inputs
- whether an eventual impossible or never-schema concept belongs in shape or constraints

Current working state:

- `required` and `nullable` remain `Shape IR`
- `closed-object`, `format`, `default`, `examples`, `description`, `read-only`, and `write-only` live in `Constraint IR`

## Composition Rule

The dependency direction should stay:

- `Value IR` stands alone
- `Shape IR` stands alone
- `Constraint IR` depends on `Shape IR`

That means:

- value parsers should not be forced to emit constraints
- shape parsers should not be forced to emit values
- constraints should attach to shapes rather than duplicate structure

## Attachment Rule

`Constraint IR` should stay an overlay model.
It should target logical paths on top of shape semantics instead of mirroring the whole shape tree.

The practical rule is:

- shape remains the structural truth
- constraints attach by logical target
- generators consume constraints opportunistically when the target can preserve them

## Maintenance Rules

- keep this file about semantic placement only
- do not move a format-local feature into shared IR because one source format can express it
- require repeated pressure across multiple sources or targets before expanding shared semantics

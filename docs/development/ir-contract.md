# Schema IR Contract

This document records the current contract for the shared schema IR.

It describes:

- what the IR can represent today
- which invariants `core` enforces
- how parsers and generators should treat the IR
- how diagnostics should be attached to results

## Current Surface

The current IR includes:

- `SchemaDocument`
- `SchemaDefinition`
- `SchemaScalarNode`
- `SchemaLiteralNode`
- `SchemaReferenceNode`
- `SchemaUnionNode`
- `SchemaTupleNode`
- `SchemaRecordNode`
- `SchemaNullNode`
- `SchemaUnknownNode`
- `SchemaObjectNode`
- `SchemaArrayNode`
- `SchemaFieldNode`

## Document Contract

`SchemaDocument` is the root container for one shared schema model.

Current rules:

- every document has exactly one `root`
- `definitions` are document-local and ordered
- definition identity is `definition.name.source`
- definition names must be unique within one document
- references are document-local only

## Node Semantics

### Scalars And Literals

- scalar kinds are `string`, `integer`, `number`, and `boolean`
- `integer` and `number` are distinct IR semantics
- literal values are exact scalar values and must be finite when numeric

### Null, Optionality, And Nullability

- `SchemaNullNode` means the value is exactly `null`
- optional presence is different from `null`
- `nullable: true` on a field means the field may be present with `null`
- a field whose type already includes `null` must not also set `nullable: true`

### Unknown

- `SchemaUnknownNode` is the one shared node for unresolved schema meaning
- explanation lives in `reason` and optional `evidence`
- `evidence` explains the result but does not create a new schema meaning
- degraded-but-still-representable results should prefer ordinary nodes plus diagnostics rather than `unknown`

### Structural Nodes

- `SchemaObjectNode` is a fixed named-field shape
- `SchemaRecordNode` is a dynamic-key object shape
- `SchemaArrayNode` is a homogeneous collection
- `SchemaTupleNode` is a fixed-position ordered sequence
- `SchemaUnionNode` is one-of-many schema meaning
- `SchemaReferenceNode` points to a document-local definition

Record and object are intentionally different semantics.
Array and tuple are intentionally different semantics.

## Core Invariants

These invariants are enforced by `core` factories and validation:

- literal numbers must be finite
- reference names must be non-empty
- definition names must be non-empty
- definition names must be unique inside one document
- every reference must resolve to a same-document definition
- record keys must currently be the scalar type `string`
- fields may not combine `nullable: true` with a type that already includes `null`

## Normalization Rules

The IR is semantic, not syntax-shaped.
Current normalization includes:

- union members are flattened
- equivalent union members are deduplicated
- reference equivalence is based on reference name equality
- unknown equivalence is based on semantic reason and nullable state rather than detailed evidence

`evidence` helps explain a result, but does not define a distinct schema.

## Parser Boundary

Parsers should target this IR as a semantic handoff, not as a syntax dump.

That means:

- keep source-specific heuristics outside the IR when possible
- introduce new IR semantics only when the meaning is genuinely shared
- fail explicitly for unsupported input instead of silently approximating it

## Generator Boundary

Generators consume valid IR and render target output from shared semantics.

That means:

- generators should not invent new shared schema meaning
- generator failures should usually be target-rendering failures, not IR redesign signals
- target validation may still reject a valid IR when a chosen target configuration cannot render it safely

## Diagnostic Contract

`SchemaDiagnostic` is the shared structured explanation type across parser and generator layers.

Current expectations:

- `code` is stable and machine-consumable
- `message` is human-readable
- `path` is optional but should be used when a stable logical location exists
- `nodeKind` should identify the relevant contract surface when helpful
- `source` should identify the producing layer
- `evidence` may carry small structured context

Source-syntax locations are not shared top-level fields today.
Parser-specific source locations should live in structured `evidence`.

Diagnostic evidence and unknown evidence are different:

- `unknown.evidence` explains why a specific unknown node exists
- `diagnostic.evidence` explains a parser or generator decision on a result

## Result Boundary

The IR contract does not promise:

- full source-language syntax fidelity
- automatic naming of reusable definitions
- cross-document references
- preservation of source-only declaration form when shared semantics are equivalent

## Maintenance Rules

- keep this file about the current shared contract, not future design sketches
- move semantic-placement debates to [ir-boundaries.md](ir-boundaries.md)
- move success, loss, and truthfulness rules to [capabilities-and-loss.md](capabilities-and-loss.md)

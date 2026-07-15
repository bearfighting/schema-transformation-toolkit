# Schema IR Contract

This document is the current contract for the shared schema IR.

It describes what the IR can represent today, which invariants are enforced in `core`, and how parser and generator layers should use diagnostics around it.

## Current Core Module Split

The current `core` schema implementation is intentionally organized into focused internal modules:

- `types.ts`: IR node types and shared result-shape types
- `factories.ts`: public construction entry points
- `identifiers.ts`: identifier normalization
- `equivalence.ts`: semantic equality and union-dedup rules
- `validation.ts`: document and field invariants
- `normalization.ts`: tuple, union, and unknown-evidence normalization
- `guards.ts`: runtime node-kind guards

This split exists to keep shared semantics centralized while avoiding another large all-in-one factory file.

## Purpose

The schema IR is the semantic handoff between parsers, generators, and future product surfaces such as `web` and other later integration layers.

The IR is intentionally about serializable data-shape semantics:

- it should represent stable data structure meaning
- it should not mirror the full expressive power of any one source language
- it should stay semantic rather than syntax-shaped

## Current Surface

The current IR supports these document and node types:

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

`SchemaDocument` is the root container for one schema model.

Current shape:

```ts
interface SchemaDocument {
  version: "0.1";
  kind: "document";
  name: IdentifierName;
  definitions: SchemaDefinition[];
  root: SchemaNode;
}
```

Current rules:

- every document has exactly one `root`
- `definitions` is document-local and ordered
- definition identity is `definition.name.source`
- definition names must be unique within one document
- references do not cross document boundaries

## Node Semantics

### Scalar

- `SchemaScalarNode` represents widened scalar families
- current scalar kinds are `string`, `integer`, `number`, and `boolean`
- `integer` and `number` are distinct IR semantics

### Literal

- `SchemaLiteralNode` represents an exact scalar value
- current literal values are `string | number | boolean`
- numeric literal values must be finite

### Null

- `SchemaNullNode` means the schema is exactly `null`
- this is different from optional presence
- this is also different from `nullable: true` on a field

### Unknown

- `SchemaUnknownNode` is the single IR node for unresolved schema meaning
- unknown stays one node kind; the explanation lives in metadata
- current shared reasons are:
  - `no-evidence`
  - `empty-array-element`
  - `empty-array-only-field`
  - `mixed-types-collapsed`

Current unknown rules:

- `reason` is semantic explanation, not display text
- `evidence` is optional context for diagnostics or UI
- `evidence` does not change schema meaning
- `unknown` should only be used when the resulting schema meaning is genuinely unresolved
- degraded-but-still-representable results should prefer ordinary IR nodes plus diagnostics

Current evidence conventions:

- `source` identifies the producing layer
- `detail` is lightweight explanatory text only
- `observedKinds` is a compact summary of seen value categories when that context is useful
- evidence should stay small and structured; it should not become a raw parser trace

### Object And Field

- `SchemaObjectNode` represents a fixed named-field shape
- `SchemaFieldNode` carries field-level presence and nullability semantics

Field rules:

- `required: false` means the field may be absent
- `nullable: true` means the field may be present with `null`
- `type: SchemaNullNode` means the field value is exactly `null`
- a field whose type already includes `null` must not also set `nullable: true`

### Array

- `SchemaArrayNode` represents a homogeneous collection
- array semantics live in `elementType`
- array and tuple are intentionally different schema concepts

### Tuple

- `SchemaTupleNode` represents a fixed-position ordered sequence
- each tuple element carries its own `required` flag
- missing tuple positions and explicit `null` values are different semantics
- tuple positions may themselves be unions

### Record

- `SchemaRecordNode` represents a dynamic-key object shape
- record and object are intentionally different schema concepts
- current record keys are constrained to the scalar type `string`

### Union

- `SchemaUnionNode` represents one-of-many schema meaning
- union members are normalized and deduplicated by semantic equivalence
- object unions with discriminator literals should remain unions instead of being widened into one merged object

### Definition And Reference

- `SchemaDefinition` is a named reusable schema fragment
- `SchemaReferenceNode` points to a definition by `name.source`
- definitions are explicit; `core` does not auto-name them
- references are document-local only

## Core Invariants

These are the invariants currently enforced by `core` factories:

- literal numbers must be finite
- reference names must be non-empty
- definition names must be non-empty
- definition names must be unique inside one document
- every reference must point to an existing definition in the same document
- record keys must currently be `schemaScalarNode("string")`
- fields may not combine `nullable: true` with a type that already includes `null`

These invariants are important because parser and generator packages depend on `core` to reject structurally invalid IR before target-specific work begins.

## Normalization Rules

The IR already applies some normalization instead of preserving purely syntactic construction detail.

Current normalization expectations:

- union members are flattened
- equivalent union members are deduplicated
- reference equivalence is based on reference name equality
- unknown equivalence is based on semantic reason and nullable state rather than `evidence`

This means `evidence` helps explain a result, but does not create a distinct schema meaning by itself.

## Parser Boundary

Parsers should target this IR as a semantic model, not as a syntax dump.

That means:

- parsers may keep source-specific heuristics outside the IR
- parsers should only introduce new IR semantics when the meaning is genuinely shared
- unsupported input should fail explicitly instead of being silently approximated

Current examples:

- the JSON parser may infer `unknown` with parser-specific evidence
- the JSON parser may collapse mixed incompatible samples to `unknown` when the caller explicitly selects that inference mode
- the JSON parser may preserve a discriminated object union as a `SchemaUnionNode`
- the JSON parser should keep tuple-position or union-preservation decisions in diagnostics when the final IR is still known
- the JSON parser currently does not auto-extract reusable definitions from repeated shapes

## Generator Boundary

Generators consume valid IR and render target-language output from shared semantics.

That means:

- generators should not invent new schema semantics
- generator failures should usually be target-rendering failures, not IR-shape redesigns
- generator validation may still reject a technically valid IR document if the chosen target configuration cannot render it safely

Current example:

- the TypeScript generator validates rendered names and returns structured failures when a naming strategy would emit invalid syntax

## Diagnostic Contract

`SchemaDiagnostic` is the shared structured explanation type across parser and generator layers.

Current shape:

```ts
interface SchemaDiagnostic {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  path?: string[];
  nodeKind?: string;
  source?: string;
  evidence?: unknown;
}
```

Current expectations:

- `code` is stable and machine-consumable
- `message` is human-readable
- `path` is optional but should be added when the producer can locate the issue stably
- `nodeKind` should describe the relevant IR or contract surface when useful
- `source` should identify the emitting layer such as `parser-json` or `generator-typescript`
- `evidence` may carry extra structured context without changing the schema meaning
- source-syntax locations are not currently shared top-level diagnostic fields; parser-specific source locations should live inside structured `evidence`

Diagnostic and unknown evidence have different roles:

- `unknown.evidence` explains why a specific unknown node exists in the IR
- `diagnostic.evidence` explains a parser or generator decision for one result
- not every diagnostic should produce an unknown node
- not every unknown node needs rich diagnostic evidence beyond its own node metadata

### Parser Source-Location Convention

For parser v0 work, logical location and syntax-origin location are intentionally separate:

- `path` remains the primary logical or IR-facing location
- source spans or line-column data should live in parser-specific diagnostic `evidence`
- parser source-location evidence should not be treated as shared IR semantics by itself

Current recommended parser evidence shape:

```ts
{
  sourceLocation: {
    start: {
      offset: number;
      line: number;
      column: number;
    }
    end: {
      offset: number;
      line: number;
      column: number;
    }
    length: number;
  }
}
```

This keeps the shared diagnostic contract small while still giving parser consumers enough information for editor, CLI, or web highlighting.

## Diagnostic Path Convention

The project now uses path as a logical location path rather than a raw source span.

Current conventions:

- parser paths point to data-shape locations
- generator paths point to IR structure locations

Examples:

- parser path: `["user", "tags"]`
- parser tuple-position path: `["1"]`
- generator root field path: `["root", "userId"]`
- generator definition path: `["definitions", "user-profile"]`
- generator array element path: `["root", "elementType"]`

This convention is intentionally simple so `web` and future CLI output can render it consistently.

## Result Contract

The shared result model keeps backward compatibility with the original `ok/code/message` shape while allowing richer structured diagnostics.

Current expectations:

- parse success may include `diagnostics`
- parse failure may include `diagnostics`
- generate success may include `diagnostics`
- generate failure may include `diagnostics`
- `code` and `message` remain the minimum compatibility surface

## What This Contract Deliberately Does Not Do Yet

The current IR does not yet define:

- cross-document imports or exports
- anonymous reusable definitions
- automatic repeated-shape extraction into definitions
- syntax-level source mapping spans
- full TypeScript type-system coverage

Those can be added later, but they should only be introduced when they represent stable shared semantics rather than one parser or one generator's local needs.

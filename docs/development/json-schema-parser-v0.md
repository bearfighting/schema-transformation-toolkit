# JSON Schema Parser v0

## Purpose

This document defines the first scoped design for a JSON Schema parser that targets the current shared schema IR.

The goal is not to parse arbitrary JSON Schema.
The goal is to accept the largest practical JSON Schema subset that can be represented by the current IR without expanding `core`.

That makes this parser a semantic importer for the current shared data-shape model, not a full JSON Schema platform.

## Design Rule

The parser should be limited by current IR semantics, not by the full JSON Schema specification surface.

That means:

- support JSON Schema constructs that map cleanly into current shared IR semantics
- fail explicitly for JSON Schema constructs whose meaning cannot be represented safely today
- allow narrow semantic lowering only when the loss is already accepted elsewhere in the project and can be reported clearly with diagnostics

## v0 Scope

The first version should parse one in-memory JSON Schema document into one `SchemaDocument`.

It should:

- target Draft 2020-12 first
- accept the current JSON Schema generator output surface as a guaranteed success subset
- support the current shared IR node set directly where possible
- report structured failures instead of approximating unsupported schema meaning silently
- emit parser diagnostics when the accepted JSON Schema meaning must be lowered into broader current IR semantics

It should not yet support:

- arbitrary draft compatibility
- external `$ref`
- multi-file schema resolution
- JSON Schema annotation preservation
- evaluation-style keywords whose meaning does not fit the current IR

## Result Contract

This parser should follow the repository-wide capability and semantic-loss contract.

That means:

- return success without diagnostics when JSON Schema meaning maps directly into current shared shape semantics
- return success with diagnostics when the parser intentionally normalizes or lowers JSON Schema meaning while remaining truthful
- return failure when accepting the source would silently erase or misrepresent semantics too aggressively

Success in this parser does not mean full JSON Schema fidelity.
It means the resulting `Shape IR v0` document is still truthful for the accepted subset.

## Why This Is The Right Boundary

This parser is primarily useful for three reasons:

- it creates a real `json-schema -> ir -> typescript` flow
- it creates a `json-schema -> ir -> json-schema` round-trip path for the currently representable subset
- it pressure-tests whether JSON Schema pushes on true shared-IR gaps or on JSON Schema-local features

The first implementation should prefer a strict and explainable boundary over broad compatibility.

In practice, that means `json-schema -> ir -> json-schema` should be treated as a round-trip for the current IR-aligned subset, with explicit non-goals for unsupported validation and document-system semantics.

## Guaranteed Success Subset

At minimum, the parser should accept the subset that the current JSON Schema generator emits today.

That includes:

- top-level `$schema` for Draft 2020-12
- top-level `title`
- top-level `$defs`
- top-level `$ref`
- scalar `type`
- simple compact nullable `type: ["T", "null"]` property schemas
- `const`
- object `properties`
- object `required`
- array `items`
- tuple-style `prefixItems`
- tuple-style `minItems`
- `items: false` for closed tuples
- `additionalProperties: <schema>` for record-like objects
- field-level nullable structure rendered as either compact `type: ["T", "null"]` or structural composition
- union structure rendered as `oneOf` or `anyOf`
- wide schemas rendered as `true`

If the parser cannot round-trip current generator output, the parser boundary is too narrow.

## Capability Status

The v0 parser should describe its behavior in four classes.

### Supported Directly

- scalar `type` values
- `type: "null"`
- `const` with string, number, or boolean values
- ordinary object `properties` and `required`
- homogeneous arrays through `items`
- tuple structure through `prefixItems + minItems + items: false`
- typed records through `additionalProperties: <schema>`
- document-local `$defs`
- document-local `$ref`

These cases should succeed without semantic-loss diagnostics unless another separate warning applies.

### Supported With Normalization

- nullable property forms such as `type: ["T", "null"]`
- nullable property forms expressed through `oneOf` or `anyOf` with one non-null member
- nested union syntax that becomes one normalized shared union

These cases should succeed, but diagnostics should make the normalization explicit when the source distinction is not preserved directly.

### Supported With Semantic Loss

- `oneOf` versus `anyOf` source distinctions
- boolean `true` schemas lowered into `unknown`
- metadata-only wide roots lowered into `unknown`
- arrays without `items` lowered into `array<unknown>`
- `additionalProperties: true` lowered into `Record<string, unknown>`

These cases should succeed only because the lowered meaning is still truthful under the current shared shape contract.
They should remain visible through stable diagnostics.

### Unsupported Or Intentionally Deferred

- boolean `false` schemas
- closed ordinary objects through `additionalProperties: false`
- mixed fixed-field-plus-typed-additionalProperties objects
- compact `type: [...]` arrays outside the narrow nullable scalar case
- external or non-local `$ref`
- unsupported drafts
- validation keywords outside current shared shape semantics
- annotation keywords whose meaning would currently be erased

These cases should fail explicitly.

## Current IR Mapping Table

### Scalar

- `{ "type": "string" }` -> `SchemaScalarNode("string")`
- `{ "type": "integer" }` -> `SchemaScalarNode("integer")`
- `{ "type": "number" }` -> `SchemaScalarNode("number")`
- `{ "type": "boolean" }` -> `SchemaScalarNode("boolean")`

### Literal

- `{ "const": "open" }` -> `SchemaLiteralNode("open")`
- `{ "const": 42 }` -> `SchemaLiteralNode(42)`
- `{ "const": true }` -> `SchemaLiteralNode(true)`

### Null

- `{ "type": "null" }` -> `SchemaNullNode`

### Unknown

- `true` -> `SchemaUnknownNode`

This is the accepted widening counterpart to the current generator behavior for `unknown`.

### Array

- `{ "type": "array", "items": <schema> }` -> `SchemaArrayNode`

### Tuple

Tuple parsing should be limited to the generator-aligned structure:

- `type: "array"`
- `prefixItems: [...]`
- `items: false`
- optional `minItems`

Mapping:

- each `prefixItems[i]` becomes one tuple element
- `minItems` determines which tail positions are optional
- if `minItems` is absent, all tuple elements are required

### Object

Object parsing should support:

- `type: "object"`
- `properties`
- `required`

Mapping:

- each property becomes one `SchemaFieldNode`
- property absence from `required` means `required: false`
- property membership in `required` means `required: true`

### Record

Record parsing should support:

- `type: "object"`
- `additionalProperties: <schema>`

Mapping:

- this becomes `SchemaRecordNode(schemaScalarNode("string"), <value>)`

v0 should not try to represent mixed fixed-field-plus-record shapes because current IR has no direct node for that combination.

### Union

Both of these should map to `SchemaUnionNode`:

- `{ "oneOf": [ ... ] }`
- `{ "anyOf": [ ... ] }`

This is a semantic lowering, not a faithful preservation.
The parser should report a warning when the source form matters but the IR cannot preserve the distinction.

### Reference And Definitions

- top-level `$defs` entries become `SchemaDefinition`s
- `"$ref": "#/$defs/User"` becomes `SchemaReferenceNode("User")`

v0 should support document-local references only.

## Supported Parsing Shapes

The parser should accept the following JSON Schema shapes in v0.

### Root Shapes

- scalar roots
- literal roots
- null roots
- object roots
- array roots
- tuple roots
- record roots
- union roots
- root `$ref`
- metadata-only wide roots that are semantically `true`

### Object Field Shapes

For object properties, v0 should support:

- plain property schemas
- optional properties via omission from `required`
- nullable properties expressed as `type: ["T", "null"]` for simple scalar `T`
- nullable properties expressed as `oneOf: [T, null]`
- nullable properties expressed as `anyOf: [T, null]`

The parser should normalize those nullable property forms back into field-level `nullable: true` when exactly one non-null member remains.

### Reusable Definitions

The parser should support:

- one document
- zero or more document-local `$defs`
- transitive references among those definitions
- root references into `$defs`

## Accepted Semantic Lowering

Some JSON Schema input can be accepted even though the original surface form will not be preserved exactly through IR.

These lowerings are acceptable in v0 because they do not require new IR concepts and they are already close to current generator behavior.

### `oneOf` Versus `anyOf`

Current IR has only `union`.

Therefore:

- `oneOf` and `anyOf` should both parse into `SchemaUnionNode`
- the parser should emit a warning that the distinction is not preserved

This is acceptable because the current generator already exposes the same boundary in reverse.

### `true` Schema

Current IR can represent widening through `SchemaUnknownNode`.

Therefore:

- `true` should parse to `unknown`
- the parser may attach parser-specific evidence explaining that the source was a boolean-wide schema

This is a semantic widening, not a lossless JSON Schema round-trip guarantee.

### Nullable Structural Form

Current IR expresses field nullability as field metadata rather than as a raw union wrapper in every case.

Therefore:

- `type: ["T", "null"]` inside an object property should parse back to `field.nullable: true` plus the underlying non-null `type` when `T` is a supported simple scalar
- `oneOf: [T, null]` inside an object property should parse back to `field.nullable: true` plus the underlying non-null `type`
- the same should apply to `anyOf: [T, null]`

This normalization should be limited to clear field-level cases.

## Diagnostics Expectations

The parser should use diagnostics to make accepted normalization and loss visible.

Expected diagnostic classes in v0:

- normalization notices for nullable property lowering
- semantic-loss warnings for `oneOf` versus `anyOf` lowering
- widening warnings for `true` schemas lowered into `unknown`
- explicit failure diagnostics for unsupported JSON Schema semantics

Diagnostics should stay stable enough to support:

- parser contract tests
- failure-matrix tests
- integration tests that verify accepted lowering behavior

## Required Explicit Failures

The parser should fail explicitly for inputs whose meaning cannot be represented safely under the current IR.

### JSON Schema-Local Or Resolution-Oriented Failures

- external `$ref`
- anchors and dynamic reference behavior
- other draft-specific reference forms
- multi-document resolution

### Validation-Oriented Keywords Outside Current IR

- `allOf`
- `not`
- `if`, `then`, `else`
- `dependentSchemas`
- `contains`
- `propertyNames`
- `unevaluatedProperties`
- `unevaluatedItems`

### Constraint And Annotation Keywords

These should fail in v0 rather than being silently dropped:

- string constraints such as `pattern`, `format`, `minLength`, `maxLength`
- numeric constraints such as `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`
- array constraints such as `minItems`, `maxItems`, `uniqueItems` outside the tuple-aligned supported interpretation
- object constraints such as `minProperties`, `maxProperties`
- annotations such as `description`, `examples`, `default`, `deprecated`, `readOnly`, `writeOnly`

The point of failing here is to avoid pretending that these inputs round-trip semantically when the current IR would simply erase the constraint.

### Boolean `false` Schema

Current IR has no impossible or never-schema concept.

Therefore:

- `false` should fail explicitly in v0

This is a likely future shared-IR pressure point, but it should not be approximated as `unknown`.

### Closed Objects

The parser should fail for:

- `additionalProperties: false`

Reason:

- current IR can distinguish object from record
- current IR cannot represent closed ordinary objects
- silently dropping closure would weaken schema meaning too much for a strict parser default

### Mixed Fixed Fields Plus Additional Properties

The parser should fail for shapes like:

```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string" }
  },
  "additionalProperties": { "type": "number" }
}
```

Reason:

- this is neither a pure fixed object nor a pure record in current IR
- accepting it would force an implicit new mixed object-map abstraction that does not yet exist

### Type Arrays

The parser should accept only the narrow nullable form:

- `{ "type": ["string", "null"] }`
- `{ "type": ["integer", "null"] }`
- `{ "type": ["number", "null"] }`
- `{ "type": ["boolean", "null"] }`

The parser should still fail for broader `type: [...]` array forms.

## Gray Areas To Delay

These are the main areas that should stay out of v0 while parser and generator coverage expands further.

### Object Closure

`additionalProperties: false` may eventually be a real shared-IR concept rather than a JSON Schema-only feature.

For now:

- treat it as unsupported in the parser
- keep documenting it as a likely shared-IR pressure point

### Impossible Schema

`false` schema is a meaningful concept that may matter beyond JSON Schema.

For now:

- treat it as unsupported in the parser
- revisit only when another parser or generator also pushes on impossible-schema semantics

### Refinement Constraints

Patterns, numeric ranges, lengths, and similar constraints may eventually become a broader validation-layer concern.

For now:

- treat them as unsupported in the parser
- do not expand the current data-shape IR just to preserve them early

## Recommended Package Shape

The package should mirror the existing parser layout:

- `packages/parsers/json-schema/src/index.ts`
- `packages/parsers/json-schema/src/parse.ts`
- `packages/parsers/json-schema/src/options.ts`
- `packages/parsers/json-schema/src/diagnostics.ts`
- `packages/parsers/json-schema/src/errors.ts`
- `packages/parsers/json-schema/src/convert.ts`
- `packages/parsers/json-schema/src/decode.ts`
- `packages/parsers/json-schema/README.md`

The parser `format` should be `"json-schema"`.

## Recommended Public API

The public API should mirror the other parser packages:

- `inferJsonSchemaDocument`
- `inferJsonSchemaDocumentWithOptions`
- `tryInferJsonSchemaDocument`
- `tryInferJsonSchemaDocumentWithOptions`
- `jsonSchemaParser`
- `preparedJsonSchemaParserOptions`
- `resolveJsonSchemaParseOptions`
- `prepareJsonSchemaParseOptions`
- `configureJsonSchemaParser`

## Recommended Options

v0 options should stay intentionally small:

```ts
type JsonSchemaParseStrictness = "strict";

interface JsonSchemaParseOptions extends ParseOptions {
  strictness?: JsonSchemaParseStrictness;
  diagnostics?: {
    preserveSourceInfo?: false;
  };
}
```

Notably absent in v0:

- draft switching
- external reference resolution
- best-effort dropping of unsupported keywords

## Recommended Failure Model

The failure model should use stable parser-facing codes.

Suggested v0 codes:

- `invalid-json-schema-json`
- `unsupported-json-schema-draft`
- `unsupported-json-schema-ref`
- `unsupported-json-schema-keyword`
- `unsupported-json-schema-boolean-false`
- `unsupported-json-schema-closed-object`
- `unsupported-json-schema-mixed-object-shape`
- `unsupported-json-schema-type-array`
- `invalid-json-schema-shape`
- `unsupported-json-schema-parser-v0`

Suggested warning-oriented diagnostics on successful parse:

- `json-schema-union-composition-lowered`
- `json-schema-true-schema-lowered`
- `json-schema-nullable-property-normalized`

## Test Plan

The initial test layout should mirror the existing parser structure:

- `tests/parsers/json-schema/api-contract.test.ts`
- `tests/parsers/json-schema/parse.test.ts`
- `tests/parsers/json-schema/failure-matrix.test.ts`
- `tests/integration/json-schema-to-json-schema.test.ts`
- `tests/integration/json-schema-to-typescript.test.ts`

The most important v0 tests are:

1. current generator output parses successfully
2. parsed generator output round-trips back to semantically equivalent JSON Schema
3. definitions and local `$ref` survive round-trip
4. tuples survive round-trip
5. record schemas survive round-trip
6. closed objects fail explicitly
7. `false` schema fails explicitly
8. `allOf` and constraint keywords fail explicitly
9. `oneOf` and `anyOf` both parse, but diagnostics record the lowering

## Success Criteria

The parser is ready when:

- it accepts the current generator-emitted JSON Schema subset
- it produces valid current IR without requiring `core` changes
- it fails explicitly for non-representable JSON Schema semantics
- it documents accepted semantic lowering instead of hiding it
- it has direct parser tests and end-to-end integration tests

## Non-Goals

v0 should not try to prove that the current IR is a complete JSON Schema model.

Its real job is narrower:

- import the largest current IR-aligned JSON Schema subset
- make semantic-loss boundaries explicit
- tell us which future pressures are shared-IR pressures and which are JSON Schema-local

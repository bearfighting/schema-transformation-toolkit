# JSON Schema Generator v0

## Purpose

This document defines the first scoped implementation plan for a JSON Schema generator.

The goal is to validate that the current shared schema IR can render into a second target ecosystem cleanly, without turning the project into a full JSON Schema platform all at once.

## v0 Scope

The first version should generate one in-memory JSON Schema document from one `SchemaDocument`.

It should:

- consume the existing shared IR without requiring new IR node kinds
- target JSON Schema Draft 2020-12
- emit document-local reusable definitions through `$defs`
- support the current semantic node set as directly as practical
- fail explicitly when the IR cannot be rendered safely under the chosen v0 rules

It should not yet support:

- external `$ref`
- multi-file output
- schema bundling strategies
- draft switching
- annotations such as `description`, `examples`, or `default`
- source-language concerns such as `package`, `import`, or module resolution

## Why Now

This is a good next generator because:

- the current IR already has stable object, array, tuple, record, union, literal, null, reference, and definition semantics
- JSON Schema is meaningfully different from TypeScript output, so it is a better cross-target validation surface than another TypeScript-adjacent renderer
- the generator can reuse the current parser and core boundaries instead of forcing immediate parser expansion

## Target Package Shape

The package should mirror the current TypeScript generator structure:

- `packages/generators/json-schema/src/index.ts`
- `packages/generators/json-schema/src/api.ts`
- `packages/generators/json-schema/src/emit.ts`
- `packages/generators/json-schema/src/options.ts`
- `packages/generators/json-schema/src/validate.ts`
- `packages/generators/json-schema/src/failure.ts`
- `packages/generators/json-schema/README.md`

Expected public API shape:

- `jsonSchemaGenerator`
- `generateJsonSchema(document, options?)`
- `tryGenerateJsonSchema(document, options?)`
- `createJsonSchemaGenerator(options?)`
- `configureJsonSchemaGenerator(options?)`
- `resolveJsonSchemaGeneratorOptions(options?)`
- `prepareJsonSchemaGeneratorOptions(options?)`

The generator contract should continue using the shared `SchemaGenerator` result shapes from `@aio/core`.

## Generator Target And Output Shape

The generator `target` should be `"json-schema"`.

The success output should be a structured JSON-compatible object rather than a formatted string.

Suggested output type:

```ts
type JsonSchemaOutput = Record<string, unknown> | boolean;
```

That keeps the generator close to the JSON Schema data model and avoids mixing rendering with pretty-printing concerns too early.

## Draft Choice

v0 should target Draft 2020-12 only.

Why:

- `$defs` aligns naturally with current reusable definitions
- tuple rendering is cleaner with `prefixItems`
- the first implementation stays simpler if draft compatibility is not a concern

If later draft support becomes important, it should be added as an explicit compatibility layer rather than baked into the first generator design.

## Core Mapping Decisions

### Object Closure

The generator should not automatically add `additionalProperties: false` for ordinary object nodes in v0.

Reason:

- the current IR distinguishes `object` from `record`
- the current IR does not explicitly say that object nodes are closed-world shapes
- omitting object closure is the safer default and avoids accidentally strengthening schema meaning

Future tightening can be added later through explicit generator options or future IR semantics.

The current implementation now allows this to be tightened through `objectAdditionalPropertiesMode: "false"` when a caller explicitly wants closed ordinary objects.

### Union Strategy

The generator should render unions using `oneOf` in v0.

Reason:

- current IR unions are semantic alternatives, not loose constraint accumulation
- `oneOf` preserves branch structure more explicitly than `anyOf`

Known caveat:

- overlapping branches may behave more strictly in JSON Schema than they do in some source or target languages

If that caveat becomes a frequent interoperability problem, a future option may allow `anyOf`, but v0 should stay opinionated.

The current implementation now supports an explicit `unionComposition: "anyOf"` option while keeping `oneOf` as the default.

### Unknown Strategy

The generator should render `SchemaUnknownNode` as `true` in v0.

Reason:

- `true` is the widest valid JSON Schema
- it preserves correctness without inventing non-standard pseudo-schema structure
- the explanatory meaning of unknown already belongs in diagnostics, not in target schema keywords

### Reference Strategy

References should remain document-local in v0 and always render through `$defs`.

Mapping:

- `SchemaReferenceNode("User")` -> `{ "$ref": "#/$defs/User" }`

This should stay aligned with current `core` document-local reference semantics.

## Node Mapping Table

### Scalar

- `string` -> `{ "type": "string" }`
- `integer` -> `{ "type": "integer" }`
- `number` -> `{ "type": "number" }`
- `boolean` -> `{ "type": "boolean" }`

### Literal

- string literal -> `{ "const": "value" }`
- numeric literal -> `{ "const": 42 }`
- boolean literal -> `{ "const": true }`

`const` is a better v0 fit than single-element `enum`.

### Null

- `SchemaNullNode` -> `{ "type": "null" }`

### Array

- `SchemaArrayNode` -> `{ "type": "array", "items": <element schema> }`

### Tuple

Tuple nodes should render as array schemas using:

- `type: "array"`
- `prefixItems: [...]`
- `minItems`
- `items: false`

Examples:

- `[number, string]` -> `prefixItems` of two schemas, `minItems: 2`, `items: false`
- `[number, string?]` -> `prefixItems` of two schemas, `minItems: 1`, `items: false`

### Object

Object nodes should render as:

- `type: "object"`
- `properties`
- `required` when at least one field is required

Optional fields should simply be absent from `required`.

### Record

Record nodes should render as:

- `type: "object"`
- `additionalProperties: <value schema>`

The current IR already constrains record keys to string, so no additional key rendering strategy is needed in v0.

### Union

Union nodes should render as:

- `{ "oneOf": [ ...member schemas ] }`

### Reference

Reference nodes should render as `$ref` into top-level `$defs`.

### Definition

Document definitions should render under `$defs` using their `name.source` values as keys.

### Unknown

- `SchemaUnknownNode` -> `true`

If the node is nullable, `true` already includes `null`, so v0 should not wrap it further.

At the document root, a wide `true` schema may be represented as metadata-only output when the generator includes top-level fields such as `title`, `$schema`, `$id`, or `$defs`.
That stays semantically equivalent to `true` while keeping the resulting document shape simpler.

## Field Semantics

`SchemaFieldNode.required` and `SchemaFieldNode.nullable` should continue to mean different things in the generator.

Rules:

- `required: false` affects the parent object's `required` list
- `nullable: true` affects the field schema itself

Suggested nullable field rendering:

```json
{
  "type": ["string", "null"]
}
```

v0 should prefer the compact nullable form when the non-null branch is a simple scalar schema.

If a nullable field cannot be represented safely in compact form, the generator may still fall back to a structural composition.

## Document-Level Output Shape

The generated root schema should look roughly like:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "UserProfile",
  "$defs": {
    "User": {
      "type": "object",
      "properties": {
        "id": { "type": "integer" }
      },
      "required": ["id"]
    }
  },
  "type": "object",
  "properties": {
    "users": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/User"
      }
    }
  },
  "required": ["users"]
}
```

`$schema` and `$defs` should be emitted only when needed or enabled by option.

`title` should default to `document.name.source` unless later configuration says otherwise.

## v0 Options

The initial option surface should stay intentionally small.

Suggested options:

```ts
interface JsonSchemaGeneratorOptions {
  includeSchemaUri?: boolean;
  includeId?: boolean;
  unknownStrategy?: "true";
  objectAdditionalPropertiesMode?: "omit" | "false";
  unionComposition?: "oneOf" | "anyOf";
}
```

Suggested defaults:

- `includeSchemaUri: true`
- `includeId: false`
- `unknownStrategy: "true"`
- `objectAdditionalPropertiesMode: "omit"`
- `unionComposition: "oneOf"`

Notes:

- `includeId` can use `document.name.source` in v0 if enabled
- `unknownStrategy` exists mainly to leave room for future expansion without redesigning the option shape
- object closure should stay opt-in even now that `"false"` is supported, because the IR does not yet encode closed-world object semantics directly
- `unionComposition` should stay a narrow binary choice until there is a stronger need for more target-specific composition behavior

## Validation And Failure Model

Most valid current IR should be renderable.

The generator should still validate:

- that every reference resolves to a document definition
- that definition keys are usable for `$defs`
- that no future unsupported runtime node kinds slip through silently

Suggested initial failure codes:

- `invalid-json-schema-reference`
- `invalid-json-schema-definition-name`
- `unsupported-node-kind`

Diagnostics should follow the current shared shape:

- `severity`
- `code`
- `message`
- optional `path`
- optional `nodeKind`
- optional `source`
- optional `evidence`

Generator `source` should be `"generator-json-schema"`.

## Testing Plan

The first test set should mirror the current TypeScript generator structure.

Recommended tests:

- `tests/generators/json-schema/render.test.ts`
- `tests/integration/json-to-json-schema.test.ts`
- `tests/integration/typescript-to-json-schema.test.ts`

Representative render cases:

- scalar root
- literal root
- null root
- object with required and optional fields
- nullable field
- array root
- tuple root with optional trailing element
- record root
- union root
- reusable definitions and references
- unknown root

Representative failure cases:

- missing referenced definition
- unsupported future node kind

## Implementation Order

### Step 1

- create the package skeleton
- define generator options and result types
- add root API contract tests

### Step 2

- implement scalar, literal, null, array, and object rendering
- add required vs nullable field handling

### Step 3

- implement definitions and references through `$defs`
- implement document-level output assembly

### Step 4

- implement union, tuple, and record rendering
- implement unknown rendering

### Step 5

- add generator validation and failure diagnostics
- document supported output and current limitations

## Out Of Scope Follow-Ups

These should wait until v0 exists and has real test coverage:

- configurable `oneOf` vs `anyOf`
- alternative nullable rendering strategies beyond the current compact-default behavior
- object closure configuration
- external `$ref`
- multi-document schema emission
- JSON Schema parser support
- schema annotation and metadata generation

## Success Criteria

The v0 generator is ready when:

- it renders the current supported IR subset into valid Draft 2020-12-compatible output
- it preserves current shared semantics without inventing new IR behavior
- it supports document-local definitions and references
- it has explicit failures instead of silent approximation
- it is covered by direct generator tests and end-to-end integration tests

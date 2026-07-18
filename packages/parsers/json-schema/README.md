# @aio/parser-json-schema

JSON Schema parser package for the shared schema IR.

This package is intentionally narrow.
It accepts the largest practical JSON Schema subset that can be represented by the current shared IR without expanding `@aio/core`.

Its `json-schema -> ir -> json-schema` story is intentionally subset-based:

- supported schemas round-trip semantically through the current IR
- unsupported validation-heavy or document-system features fail explicitly instead of being approximated

If a JSON Schema feature is not explicitly documented as supported, it should be treated as unsupported for now.

## Current Scope

The parser currently supports:

- Draft 2020-12 input
- scalar schemas
- `const`
- `null`
- arrays
- tuple schemas rendered through `prefixItems` plus `items: false`
- fixed-field objects through `properties` and `required`
- record-like objects through `additionalProperties`
- document-local `$defs`
- document-local `$ref` through `#/$defs/...`
- `oneOf` and `anyOf` lowered into the current IR union semantics
- wide `true` schemas lowered into the current IR `unknown` semantics
- simple nullable property forms through `type: ["T", "null"]`
- nullable object properties expressed structurally as `oneOf: [T, null]` or `anyOf: [T, null]`

The parser currently fails explicitly for:

- external `$ref`
- `false` schemas
- closed objects through `additionalProperties: false`
- mixed fixed-field plus typed `additionalProperties` object shapes
- `allOf`, `not`, and conditional keywords
- constraint and annotation keywords that the current IR cannot preserve
- broader `type: [...]` array forms outside the current simple-nullable subset

## Root API

- `inferJsonSchemaDocument`
- `inferJsonSchemaDocumentWithOptions`
- `tryInferJsonSchemaDocument`
- `tryInferJsonSchemaDocumentWithOptions`
- `jsonSchemaParser`
- `preparedJsonSchemaParserOptions`
- `resolveJsonSchemaParseOptions`
- `prepareJsonSchemaParseOptions`
- `configureJsonSchemaParser`

## Minimal Usage

```ts
import { jsonSchemaParser } from "@aio/parser-json-schema";

const parsed = jsonSchemaParser.parse(
  JSON.stringify({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "User",
    type: "object",
    properties: {
      id: { type: "integer" },
    },
    required: ["id"],
  }),
);
```

## Notes

- `path` remains the primary logical location for diagnostics
- source spans are not currently preserved
- successful parses may still include diagnostics for accepted semantic lowering such as `oneOf`/`anyOf` union lowering and nullable-property normalization

For the current repository-wide design boundary, see [docs/development/ir-boundaries.md](../../../docs/development/ir-boundaries.md) and [docs/development/capabilities-and-loss.md](../../../docs/development/capabilities-and-loss.md).

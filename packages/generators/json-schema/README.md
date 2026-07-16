# @aio/generator-json-schema

JSON Schema generator for the shared schema IR.

## Current Scope

This package renders the current shared schema IR into JSON Schema Draft 2020-12.

The first version is intentionally narrow:

- one `SchemaDocument` in
- one JSON Schema document out
- document-local reusable definitions through `$defs`
- explicit failures instead of unsupported approximation

The generator currently targets JSON Schema Draft 2020-12 only.

This package is intentionally a focused generator, not a full JSON Schema platform.
If a behavior is not explicitly documented here, it should not be assumed.

## Current Output Support

The current generator supports:

- scalar root documents
- literal root documents
- null root documents
- object root documents
- array root documents
- tuple root documents
- record root documents
- union root documents
- reusable definitions and `$ref`
- simple `nullable` fields through compact `type: ["T", "null"]` rendering
- `unknown` nodes as the widest valid schema

## API

`generateJsonSchema(document, options?)`

- convenience function using the default JSON Schema generator configuration
- throws when generation fails
- returns a JSON-compatible schema object

`tryGenerateJsonSchema(document, options?)`

- returns `{ ok: true, output }` on success
- returns `{ ok: false, code, message }` on generation failure
- may also include `diagnostics`, including non-fatal warnings on successful generation

`createJsonSchemaGenerator(options?)`

- returns a configured generator instance
- the returned instance exposes `.generate(document, runtimeOptions?)`

`configureJsonSchemaGenerator(options?)`

- returns `{ generator, prepared }`
- useful when a caller wants both the generator instance and the fully prepared configuration state

## Minimal Usage

```ts
import {
  schemaDocument,
  schemaFieldNode,
  schemaObjectNode,
  schemaScalarNode,
} from "@aio/core";
import { generateJsonSchema } from "@aio/generator-json-schema";

const document = schemaDocument(
  "User",
  schemaObjectNode([schemaFieldNode("id", schemaScalarNode("integer"))]),
);

const output = generateJsonSchema(document);
```

`output` is a JSON-compatible object.
Formatting and stringification are intentionally left to the caller so the generator can stay focused on schema semantics.

## Real Examples

Object root:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "User",
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "name": { "type": ["string", "null"] }
  },
  "required": ["id"]
}
```

Reusable definitions:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "UserDirectory",
  "$defs": {
    "User": {
      "type": "object",
      "properties": {
        "id": { "type": "integer" }
      },
      "required": ["id"]
    }
  },
  "type": "array",
  "items": {
    "$ref": "#/$defs/User"
  }
}
```

Tuple root:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Coordinates",
  "type": "array",
  "prefixItems": [{ "type": "number" }, { "type": "string" }],
  "minItems": 1,
  "items": false
}
```

Unknown array items:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "PartialShape",
  "type": "object",
  "properties": {
    "tags": {
      "type": "array",
      "items": true
    }
  },
  "required": ["tags"]
}
```

Unknown root:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "UnknownValue"
}
```

For a root-level wide schema, the generator now emits only document metadata.
That remains semantically equivalent to `true` while avoiding an unnecessary structural wrapper.

## Current Configuration Surface

The current public options are intentionally small:

- `includeSchemaUri`
- `includeId`
- `unknownStrategy`
- `objectAdditionalPropertiesMode`
- `unionComposition`

Current defaults:

- `includeSchemaUri: true`
- `includeId: false`
- `unknownStrategy: "true"`

`unknownStrategy` currently remains a one-value option on purpose.
It acts as a forward-compatibility placeholder for future widening strategies, while the v0 generator always renders `unknown` as the widest valid schema.

- `objectAdditionalPropertiesMode: "omit"`
- `unionComposition: "oneOf"`

Current meaningful non-default options:

- `objectAdditionalPropertiesMode: "false"` closes ordinary object nodes with `additionalProperties: false`
- `unionComposition: "anyOf"` renders unions with `anyOf` instead of `oneOf`

## Current Limitations

The generator does not yet support:

- external `$ref`
- multi-file output
- draft switching
- schema annotations such as `description` and `examples`
- configurable `oneOf` vs `anyOf`

Unsupported cases should fail explicitly rather than being approximated loosely.

## Current Semantic Notes

- ordinary object nodes do not automatically render `additionalProperties: false`
- record nodes render through `additionalProperties`
- simple nullable scalar fields render through `type: ["T", "null"]`
- non-simple nullable fields still render structurally when they cannot be compacted safely
- document-local references render through `#/$defs/...`
- unknown nodes render as the widest valid schema
- tuple optionality renders through `minItems` plus `prefixItems`
- root references commonly produce a top-level `$ref` with reusable definitions in `$defs`

Example object-closure option:

```json
{
  "type": "object",
  "properties": {
    "id": { "type": "integer" }
  },
  "required": ["id"],
  "additionalProperties": false
}
```

## Failure Model

The generator currently returns structured failures for:

- unresolved references
- invalid record-key semantics on runtime documents
- unsupported runtime node kinds

Current diagnostics use the shared `SchemaDiagnostic` shape and identify the emitting layer as `generator-json-schema`.

Successful generation may also include warnings for cases such as:

- `unknown` nodes that widen to the broadest JSON Schema
- unions rendered with `oneOf` whose branches may overlap under JSON Schema semantics
- unions rendered with `anyOf` whose overlapping branches may broaden acceptance
- ordinary object nodes rendered with `additionalProperties: false`

These warnings include structured `evidence` where useful, such as overlapping member indexes and kinds, chosen union composition, rendered unknown form, or the field names affected by closed-object rendering.

## Where To Look Next

- see [examples/json-to-json-schema.md](../../../examples/json-to-json-schema.md) for JSON-driven examples
- see [examples/typescript-to-json-schema.md](../../../examples/typescript-to-json-schema.md) for definitions-heavy TypeScript-driven examples
- see [docs/development/json-schema-generator-v0.md](../../../docs/development/json-schema-generator-v0.md) for the working design plan behind the current implementation

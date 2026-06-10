# @aio/parser-json

JSON parser and schema inference package for the current shared IR.

## Responsibilities

- parse JSON input into raw JSON values
- infer supported JSON shapes into the shared AST
- preserve unresolved-but-meaningful JSON semantics when the IR can represent them
- distinguish between invalid JSON and still-unsupported JSON inference cases

## Current IR Support

- top-level `string`
- top-level `integer`
- top-level `number`
- top-level `boolean`
- top-level `null` as `unknown | null`
- objects
- arrays with a common inferable element type
- empty arrays as `array<unknown>`
- nested objects
- nested arrays when their element types remain inferable
- `optional` fields inferred from missing object keys
- `nullable` fields inferred from explicit `null`
- fields with only `null` evidence as `unknown` + `nullable`
- fields with only empty-array evidence as `array<unknown>`

## Current Still-Unsupported Cases

- arrays with no common inferable element type

Examples of valid JSON that still do not infer into a stable schema:

- `[1, "a"]`
- `[{"id": 1}, "a"]`

## API

`inferJsonDocument(input, name?)`

- returns a `SchemaDocument`
- throws when input is invalid or currently unsupported

`inferJsonDocumentWithOptions(input, options?)`

- resolves default parser options first
- returns a `SchemaDocument`
- currently validates that future-facing options still stay within the supported subset

`tryInferJsonDocument(input, name?)`

- returns `{ ok: true, document }` on success
- returns `{ ok: false, code, message }` on failure

`tryInferJsonDocumentWithOptions(input, options?)`

- same result shape as `tryInferJsonDocument`
- accepts the structured parser options form

`resolveJsonParseOptions(options?)`

- expands sparse user options into a full resolved configuration

`prepareJsonParseOptions(options?)`

- returns `{ resolved, warnings, errors }`
- useful for UIs or higher-level orchestration before actually parsing

`configureJsonParser(parseWithOptions, options?)`

- returns `{ parser, prepared }`
- useful when a caller wants both the parser instance and the fully prepared configuration state

## Failure Model

Current failure codes:

- `invalid-json`
- `unsupported-mixed-types`

The previous `top-level-null`, `empty-array`, `null-only-field`, and `empty-array-only-field` cases are now represented in the IR using `unknown` semantics instead of failing inference.

## Configuration Status

The JSON parser already exposes a richer configuration model, including:

- `strictness`
- `inference.numericMode`
- `inference.emptyArrayMode`
- `inference.mixedTypeMode`
- `inference.nullHandling`
- `diagnostics.preserveSourceInfo`

At the moment, most future-facing options are validated but not yet implemented beyond the current strict subset. This is intentional: the configuration shape is being established early, while unsupported combinations still fail explicitly.

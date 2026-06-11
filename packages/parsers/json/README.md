# @aio/parser-json

JSON parser and schema inference package for the current shared IR.

## Responsibilities

- decode JSON text into raw JSON values
- infer supported JSON shapes into the shared schema IR
- preserve unresolved-but-meaningful JSON semantics when the IR can represent them
- distinguish between invalid JSON and still-unsupported JSON inference cases

## Current IR Support

- top-level `string`
- top-level `integer`
- top-level `number`
- top-level `boolean`
- top-level `null` as `null`
- objects
- arrays with a common inferable element type
- tuples when tuple inference is explicitly enabled
- records when record inference is explicitly enabled
- empty arrays as `array<unknown>`
- nested objects
- nested arrays when their element types remain inferable
- `optional` fields inferred from missing object keys
- `nullable` fields inferred from explicit `null`
- fields with only `null` evidence as `null`
- fields with only empty-array evidence as `array<unknown>`

## Current Still-Unsupported Cases

- arrays with no common inferable element type
- arrays or fields with mixed incompatible types when `mixedTypeMode` remains `"error"`

Examples of valid JSON that still do not infer into a stable schema:

- `[1, "a"]`
- `[{"id": 1}, "a"]`

## API

Recommended schema-facing entry points:

`inferJsonSchemaDocument(input, name?)`

- returns a `SchemaDocument`
- throws when input is invalid or currently unsupported

`inferJsonSchemaDocumentWithOptions(input, options?)`

- resolves default parser options first
- returns a `SchemaDocument`
- currently validates that future-facing options still stay within the supported subset

`tryInferJsonSchemaDocument(input, name?)`

- returns `{ ok: true, document }` on success
- returns `{ ok: false, code, message }` on failure

`tryInferJsonSchemaDocumentWithOptions(input, options?)`

- same result shape as `tryInferJsonSchemaDocument`
- accepts the structured parser options form

`decodeJsonText(input)`

- returns a raw `JsonValue`
- currently uses `JSON.parse`
- is intentionally separate from schema inference so future value IR parsing can reuse the same decode layer

`resolveJsonSchemaParseOptions(options?)`

- expands sparse user options into a full resolved configuration

`prepareJsonSchemaParseOptions(options?)`

- returns `{ resolved, warnings, errors }`
- useful for UIs or higher-level orchestration before actually parsing

`configureJsonSchemaParser(parseWithOptions, options?)`

- returns `{ parser, prepared }`
- useful when a caller wants both the parser instance and the fully prepared configuration state

Compatibility aliases remain available for the older schema-first names:

- `inferJsonDocument`
- `inferJsonDocumentWithOptions`
- `tryInferJsonDocument`
- `tryInferJsonDocumentWithOptions`
- `resolveJsonParseOptions`
- `prepareJsonParseOptions`
- `configureJsonParser`

When a caller explicitly opts into `schema.mixedTypeMode: "union"` or `inference.mixedTypeMode: "union"`, the parser can preserve mixed compatible samples as schema unions instead of failing.

When a caller explicitly opts into `schema.tupleInferenceMode: "heterogeneous-only"` or `inference.tupleInferenceMode: "heterogeneous-only"`, the parser can preserve heterogeneous arrays as tuple nodes instead of rejecting them for lacking a single shared element type.

When a caller explicitly opts into `schema.recordInferenceMode: "shared-value-type"` or `inference.recordInferenceMode: "shared-value-type"`, the parser can preserve dynamic-key object samples as record nodes when the current conservative record heuristic succeeds.

Current tuple inference behavior:

- homogeneous arrays still infer as `array<T>`, even when tuple inference is enabled
- heterogeneous arrays such as `[1, "east"]` infer as tuples when tuple inference is enabled
- repeated tuple samples merge positionally
- missing later positions become optional tuple elements
- explicit `null` stays part of the tuple position type; it does not become "optional"
- incompatible values within one tuple position are preserved as unions for that position

Examples with `tupleInferenceMode: "heterogeneous-only"`:

- `[1, "east"]` -> `[number, string]`
- `[[1, "east"], [2]]` -> `Array<[number, string?]>`
- `[[1, "east"], [2, true], [3, null]]` -> `Array<[number, string | boolean | null]>`

Current record inference behavior:

- record inference is opt-in and off by default
- the current heuristic only considers multiple object samples
- the current heuristic requires no stable common key shared by every sample
- all observed values across those samples must still merge into one shared value type
- single objects still infer as fixed-field objects because one sample is not enough evidence to prefer a dynamic-key map

Examples with `recordInferenceMode: "shared-value-type"`:

- `[{"en":"Hello","fr":"Bonjour"},{"de":"Hallo","es":"Hola"}]` -> `Array<Record<string, string>>`
- `[{"users":{"a":{"id":1}}},{"users":{"b":{"id":2}}}]` -> `{ users: Record<string, { id: number }> }[]`

## Failure Model

Current failure codes:

- `invalid-json`
- `unsupported-mixed-types`

The previous `empty-array` and `empty-array-only-field` cases are now represented in the IR using `unknown` semantics instead of failing inference.

## Configuration Status

The schema parser currently exposes configuration for:

- `strictness`
- `schema.numericMode`
- `schema.emptyArrayMode`
- `schema.mixedTypeMode`
- `schema.nullHandling`
- `schema.tupleInferenceMode`
- `schema.recordInferenceMode`
- `diagnostics.preserveSourceInfo`

The current public configuration surface only includes options that are implemented today:

- `strictness: "strict"`
- `schema.numericMode: "distinguish" | "number-only"`
- `schema.emptyArrayMode: "unknown-array"`
- `schema.mixedTypeMode: "error"`
- `schema.mixedTypeMode: "union"`
- `schema.nullHandling: "nullable"`
- `schema.tupleInferenceMode: "off" | "heterogeneous-only"`
- `schema.recordInferenceMode: "off" | "shared-value-type"`
- `diagnostics.preserveSourceInfo: false`

For backward compatibility, the older `inference.*` option shape is still accepted and resolves into `schema.*`.

Planned configuration areas that are not exposed yet:

- `strictness: "best-effort"`
- `schema.emptyArrayMode: "error"`
- `schema.mixedTypeMode: "unknown"`
- `schema.nullHandling: "strict"`
- `diagnostics.preserveSourceInfo: true`

Notes:

- `schema.mixedTypeMode: "unknown"` may also need richer IR semantics if we want to preserve why a value became `unknown`.
- `diagnostics.preserveSourceInfo: true` will require IR or document metadata support for source locations or evidence tracking.

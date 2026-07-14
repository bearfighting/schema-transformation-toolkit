# @aio/parser-typescript

TypeScript parser package for the shared schema IR.

This package implements the first TypeScript schema-subset parser for the shared schema IR.

It is intentionally narrow.
The goal is to validate the IR against a second source language with a data-shape-oriented subset, not to model the whole TypeScript type system.

## Intended Scope

The first supported subset is documented in:

- [docs/development/typescript-parser-v0-cases.md](../../../docs/development/typescript-parser-v0-cases.md)
- [docs/development/typescript-parser-todo.md](../../../docs/development/typescript-parser-todo.md)

## Current Status

The package currently supports:

- explicit named entry declarations
- `type` aliases, `interface` declarations, and `enum` declarations
- object type literals
- scalar keywords: `string`, `number`, `boolean`
- `null`
- optional properties
- readonly properties and readonly array or tuple syntax when they do not introduce new IR semantics
- field-level nullable unions such as `string | null`
- general unions
- array shorthand and `Array<T>`
- `ReadonlyArray<T>`
- tuples without rest elements
- scalar literal types and literal unions
- `Record<string, T>`
- reachable top-level named references
- parser-facing schema validation through the shared `core` validation surface

The parser emits:

- a `SchemaDocument` with a root reference to the requested entry
- reachable reusable definitions only
- enum declarations as literal or literal-union definitions
- enum member references to earlier members when they resolve to supported literal values
- structured diagnostics for unsupported syntax and entry-contract failures

Current enum support is intentionally non-computational:

- literal initializers are supported
- implicit numeric progression is supported
- references to earlier enum members are supported
- general computed enum evaluation is out of scope

## Current Unsupported Subset

The parser currently fails explicitly for:

- missing explicit entry names
- missing entry declarations
- tuple rest elements
- external or unresolved type references
- utility types outside `Record`
- non-string `Record` keys
- conditional, mapped, function, and intersection types
- unsupported object type members such as method signatures
- unsupported property names such as computed keys
- generic unsupported syntax kinds such as `symbol`
- enum initializers outside literal, implicit-numeric, or earlier-member-reference forms
- arithmetic, bitwise, concatenated, or otherwise computed enum initializers
- readonly syntax when it only wraps still-unsupported tuple-rest or malformed array-reference forms continues to fail at the underlying array or tuple boundary

These failures are intentionally structured and tested as a matrix rather than being approximated loosely.

## Root API

- `inferTypeScriptDocument`
- `inferTypeScriptDocumentWithOptions`
- `tryInferTypeScriptDocument`
- `tryInferTypeScriptDocumentWithOptions`
- `typeScriptParser`
- `preparedTypeScriptParserOptions`
- `resolveTypeScriptParseOptions`
- `prepareTypeScriptParseOptions`
- `configureTypeScriptParser`

## Current Failure Model

Current failure results use stable parser-facing codes, including:

- `missing-typescript-entry`
- `missing-typescript-entry-declaration`
- `missing-typescript-property-type`
- `unsupported-typescript-conditional-type`
- `unsupported-typescript-enum-member-initializer`
- `unsupported-typescript-function-type`
- `unsupported-typescript-intersection-type`
- `unsupported-typescript-mapped-type`
- `unsupported-typescript-property-name`
- `unsupported-typescript-record-key`
- `unsupported-typescript-syntax`
- `unsupported-typescript-tuple-rest-element`
- `unsupported-typescript-type-member`
- `unsupported-typescript-type-reference`

Diagnostics carry the shared `core` shape, including stable `path`, `nodeKind`, and `evidence` fields when the parser can determine a meaningful logical location.

For parser-specific source locations, the current v0 convention is:

- `path` remains the primary logical or IR-facing location
- syntax-origin positions live in `diagnostic.evidence.sourceLocation`
- `sourceLocation` carries `start`, `end`, and `length`
- `start` and `end` each include `offset`, `line`, and `column`

## Test Coverage

The current parser test layout is intentionally split by concern:

- `tests/parsers/typescript/parse.test.ts`: supported success-path coverage
- `tests/parsers/typescript/failure-matrix.test.ts`: grouped failure matrix coverage
- `tests/integration/typescript-to-typescript.test.ts`: `typescript -> ir -> typescript` round-trips

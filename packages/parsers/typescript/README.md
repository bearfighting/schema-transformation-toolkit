# @aio/parser-typescript

TypeScript parser package for the shared schema IR.

This package implements the first TypeScript schema-subset parser for the shared schema IR.

It is intentionally narrow.
The goal is to validate the IR against a second source language with a data-shape-oriented subset, not to model the whole TypeScript type system.

If a TypeScript feature is not explicitly documented as supported here, it should be treated as unsupported for now.

If you want end-to-end examples rather than support bullets first, start with:

- [examples/typescript-to-json-schema.md](../../../examples/typescript-to-json-schema.md)
- [tests/integration/typescript-to-typescript.test.ts](../../../tests/integration/typescript-to-typescript.test.ts)

## Intended Scope

The first supported subset is documented in:

- [docs/development/typescript-parser-v0-cases.md](../../../docs/development/typescript-parser-v0-cases.md)
- [docs/development/typescript-parser-todo.md](../../../docs/development/typescript-parser-todo.md)

## Current Status

The package currently supports:

- explicit named entry declarations
- `type` aliases, `interface` declarations, and `enum` declarations
- `export`-modified supported declarations when the underlying declaration shape stays within the current schema subset
- single-file parsing where all reachable schema declarations are defined in the same source text
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
- named entries that resolve to unsupported top-level declaration kinds such as classes
- imported type references that would require cross-file resolution
- namespace-imported type references such as `Models.User`
- re-export-only entries such as `export { User } from "./models"`
- tuple rest elements
- external or unresolved type references
- utility types outside `Record`
- non-string `Record` keys
- interface `extends` clauses
- conditional, mapped, function, and intersection types
- unsupported object type members such as method signatures
- unsupported property names such as computed keys
- generic unsupported syntax kinds such as `symbol`
- enum initializers outside literal, implicit-numeric, or earlier-member-reference forms
- arithmetic, bitwise, concatenated, or otherwise computed enum initializers
- readonly syntax when it only wraps still-unsupported tuple-rest or malformed array-reference forms continues to fail at the underlying array or tuple boundary

These failures are intentionally structured and tested as a matrix rather than being approximated loosely.

Unsupported cases should fail explicitly rather than being silently reduced into guessed schema meaning.

The architectural intent for these module-related failures is documented in:

- [docs/development/typescript-parser-preprocess.md](../../../docs/development/typescript-parser-preprocess.md)

In short:

- module-boundary and entry-preparation issues should trend toward a dedicated preprocess layer
- declaration-to-IR conversion should stay focused on the schema subset itself
- current single-file failures should be read as present capability boundaries, not necessarily permanent product boundaries

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

## Minimal Usage

```ts
import { typeScriptParser } from "@aio/parser-typescript";

const parsed = typeScriptParser.parse("interface User { id: number }", {
  entry: "User",
  name: "UserDocument",
});
```

The parser currently requires an explicit `entry`.
Successful results return a `SchemaDocument` whose root is usually a reference to the selected named definition.

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

The current TypeScript parser also tries to keep unsupported-syntax diagnostics mechanically useful rather than only human-readable.
For the common unsupported-node failures, `diagnostic.evidence` now typically includes:

- `documentName`: parser document name for the current parse
- `syntaxKind`: TypeScript AST kind name such as `MappedType` or `TypeReference`
- `nodeText`: the exact source snippet for the unsupported node
- parser-specific extra evidence when the failure category has a stable shape

Common extra evidence currently includes:

- malformed built-in type references: `utilityType`, `expectedTypeArguments`
- unsupported `Record<K, V>` keys: `keyType`, `keyTypeKind`, `valueType`
- tuple rest failures: `tupleElementKind`
- unsupported named entry declarations: `declarationKind`, `declarationText`
- unsupported interface heritage: `heritageClauses`
- imported type references: `importSource`, `importedName`
- namespace-imported type references: `importSource`, `importedNamespace`, `qualifiedReference`
- re-export-only entries: `moduleSpecifier`, `importedName`, `declarationText`

### Diagnostic Examples

Example: mapped type failure

```ts
type Box<T> = { [K in keyof T]: T[K] };
```

Representative diagnostic shape:

```ts
{
  code: "unsupported-typescript-mapped-type",
  path: ["definitions", "Box"],
  nodeKind: "definition",
  evidence: {
    documentName: "TypeScriptDocument",
    detail: "Unsupported TypeScript syntax kind: MappedType.",
    syntaxKind: "MappedType",
    nodeText: "{ [K in keyof T]: T[K] }",
    sourceLocation: {
      start: { offset: 14, line: 1, column: 15 },
      end: { offset: 38, line: 1, column: 39 },
      length: 24,
    },
  },
}
```

Example: unsupported `Record` key

```ts
type Scores = Record<number, string>;
```

Representative diagnostic shape:

```ts
{
  code: "unsupported-typescript-record-key",
  path: ["definitions", "Scores"],
  nodeKind: "record",
  evidence: {
    documentName: "TypeScriptDocument",
    detail: "Unsupported Record key type in: Record<number, string>.",
    syntaxKind: "TypeReference",
    nodeText: "Record<number, string>",
    keyType: "number",
    keyTypeKind: "NumberKeyword",
    valueType: "string",
    typeReference: "Record<number, string>",
    sourceLocation: {
      start: { offset: 14, line: 1, column: 15 },
      end: { offset: 36, line: 1, column: 37 },
      length: 22,
    },
  },
}
```

## Test Coverage

The current parser test layout is intentionally split by concern:

- `tests/parsers/typescript/parse.test.ts`: supported success-path coverage
- `tests/parsers/typescript/failure-matrix.test.ts`: grouped failure matrix coverage
- `tests/integration/typescript-to-typescript.test.ts`: `typescript -> ir -> typescript` round-trips

The repository also now includes `typescript -> ir -> json-schema` integration coverage to keep the TypeScript parser aligned with a second generator target.

## Where To Look Next

- see [examples/typescript-to-json-schema.md](../../../examples/typescript-to-json-schema.md) for parser behavior that flows into reusable definitions and `$ref`
- see [docs/development/typescript-parser-v0-cases.md](../../../docs/development/typescript-parser-v0-cases.md) for the explicit supported and unsupported case inventory
- see [docs/development/progress.md](../../../docs/development/progress.md) for the current parser expansion focus

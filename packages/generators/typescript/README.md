# @aio/generator-typescript

TypeScript generator for the shared schema IR.

## Responsibilities

- read the shared IR without depending on any specific parser
- emit TypeScript declarations from schema documents
- apply TypeScript-specific naming and identifier rules
- expose transparent generator configuration for callers and UIs

This package is intentionally a focused IR-to-TypeScript generator, not a general-purpose TypeScript code synthesis layer.

## Current Output Support

The current generator supports:

- object root documents as `export interface` or `export type`
- scalar root documents as `export type`
- literal root documents as `export type`
- union root documents as `export type`
- `null` root documents as `export type`
- array root documents as `export type`
- tuple root documents as `export type`
- record root documents as `export type`
- nested inline object types
- `optional` fields as `?`
- `nullable` fields as `| null`
- literal nodes as exact TypeScript literal types
- union nodes as exact TypeScript union types
- optional tuple elements as `?`
- record nodes as `Record<K, V>`
- `unknown` nodes as `unknown`
- configurable array rendering with `T[]` / `Array<T>`
- normalized identifier naming for type names and field names
- reserved-word and invalid-identifier handling

## Current Naming Behavior

By default:

- type names render as `PascalCase`
- field names render as `camelCase`
- reserved words receive a trailing `_`
- invalid leading identifier characters receive a leading `_`
- unrecoverable field names may fall back to quoted property keys

These rules come from the configured naming strategy and can be replaced.

## API

`generateTypeScript(document, options?)`

- convenience function using the default TypeScript generator configuration
- accepts the same generator options as configured instances
- throws when generation fails
- returns the generated TypeScript source as a string

`createTypeScriptGenerator(options?)`

- returns a configured generator instance
- the returned instance exposes `.generate(document, runtimeOptions?)`

`tryGenerateTypeScript(document, options?)`

- returns `{ ok: true, output }` on success
- returns `{ ok: false, code, message }` on generation failure
- may also include `diagnostics`

`resolveTypeScriptGeneratorOptions(options?)`

- expands sparse user options into a full resolved configuration

`prepareTypeScriptGeneratorOptions(options?)`

- returns `{ resolved, warnings, errors }`
- useful for UIs and higher-level orchestration

`configureTypeScriptGenerator(options?)`

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
import { generateTypeScript } from "@aio/generator-typescript";

const document = schemaDocument(
  "User",
  schemaObjectNode([schemaFieldNode("id", schemaScalarNode("integer"))]),
);

const output = generateTypeScript(document);
```

## Current Configuration Surface

The current public options are still intentionally small:

- `namingStrategy`
- `rootObjectMode`
- `arrayStyle`

This is already enough to support:

- default TypeScript naming
- custom snake_case output
- choosing `interface` or `type` for root object emission
- choosing smart, compact, or generic array rendering
- future target-specific naming experiments without changing the parser or IR

More TypeScript-specific generation controls are expected later, such as choosing between `interface`, `type`, or `class` emission for compatible shapes.

## Real Examples

Object root:

```ts
export interface User {
  id: number;
  name?: string | null;
}
```

Object root as type alias:

```ts
export type User = {
  id: number;
  name?: string | null;
};
```

Array root:

```ts
export type UserList = Array<{
  id: number;
  name?: string;
}>;
```

Unresolved semantics:

```ts
export type StandaloneNull = null;
export type EmptyArray = unknown[];
```

Literal root:

```ts
export type Status = "open";
```

Union root:

```ts
export type MixedValue = string | number;
```

Tuple root:

```ts
export type Coordinate = [number, string];
```

Tuple root with optional and nullable position:

```ts
export type PartialCoordinate = [number, (string | null)?];
```

Record root:

```ts
export type TranslationTable = Record<string, string>;
```

Custom naming strategy:

```ts
export interface user_profile {
  user_id: number;
}
```

Compact array style:

```ts
export type NumberList = number[];
```

## Current Limitations

The generator does not yet support:

- choosing `class` emission via configuration
- `enum`
- imports/exports beyond the current single-document output
- target-specific formatting families beyond the current naming/object-root/array-style options

Current definition and reference support:

- document-local reusable definitions are supported
- root and nested references are supported when they resolve within the same `SchemaDocument`
- the generator still does not support cross-document reuse or import/export modeling

Unsupported cases should fail explicitly rather than being approximated loosely.

## Failure Model

The current generator can return structured failures for:

- invalid rendered type names
- invalid rendered field names
- invalid rendered or missing reference names
- unsupported runtime node kinds

This is mainly intended to protect callers from custom naming strategies that produce invalid TypeScript syntax, and to give the generator room to grow as the IR expands.

Current diagnostics behavior:

- generator failures also include structured diagnostics with the same primary `code` and `message`
- generator failure diagnostics now also include stable `path` and `nodeKind`, plus `evidence` for rendered/source naming failures where useful
- success results currently stay quiet unless future generator warnings become useful

## Where To Look Next

- see [examples/json-to-typescript.md](../../../examples/json-to-typescript.md) for JSON-driven examples
- see [examples/typescript-to-json-schema.md](../../../examples/typescript-to-json-schema.md) for a second target that consumes the same IR
- see [tests/integration/typescript-to-typescript.test.ts](../../../tests/integration/typescript-to-typescript.test.ts) for definitions-heavy TypeScript round-trips

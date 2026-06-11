# @aio/generator-typescript

TypeScript generator for the shared schema IR.

## Responsibilities

- read the shared IR without depending on any specific parser
- emit TypeScript declarations from schema documents
- apply TypeScript-specific naming and identifier rules
- expose transparent generator configuration for callers and UIs

## Current Output Support

The current generator supports:

- object root documents as `export interface` or `export type`
- scalar root documents as `export type`
- array root documents as `export type`
- nested inline object types
- `optional` fields as `?`
- `nullable` fields as `| null`
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

`resolveTypeScriptGeneratorOptions(options?)`

- expands sparse user options into a full resolved configuration

`prepareTypeScriptGeneratorOptions(options?)`

- returns `{ resolved, warnings, errors }`
- useful for UIs and higher-level orchestration

`configureTypeScriptGenerator(options?)`

- returns `{ generator, prepared }`
- useful when a caller wants both the generator instance and the fully prepared configuration state

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
export type StandaloneNull = unknown | null;
export type EmptyArray = unknown[];
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
- `union`
- references/shared named models
- imports/exports beyond the current single-document output
- target-specific formatting families beyond the current naming/object-root/array-style options

## Failure Model

The current generator can return structured failures for:

- invalid rendered type names
- invalid rendered field names
- unsupported runtime node kinds

This is mainly intended to protect callers from custom naming strategies that produce invalid TypeScript syntax, and to give the generator room to grow as the IR expands.

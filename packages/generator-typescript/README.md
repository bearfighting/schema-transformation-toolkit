# @aio/generator-typescript

TypeScript generator for the shared schema IR.

## Responsibilities

- read the shared IR without depending on any specific parser
- emit TypeScript declarations from schema documents
- apply TypeScript-specific naming and identifier rules
- expose transparent generator configuration for callers and UIs

## Current Output Support

The current generator supports:

- object root documents as `export interface`
- scalar root documents as `export type`
- array root documents as `export type`
- nested inline object types
- `optional` fields as `?`
- `nullable` fields as `| null`
- `unknown` nodes as `unknown`
- `array<unknown>` as `unknown[]`
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

`generateTypeScript(document)`

- convenience function using the default TypeScript generator configuration
- returns the generated TypeScript source as a string

`createTypeScriptGenerator(options?)`

- returns a configured generator instance
- the returned instance exposes `.generate(document)`

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

This is already enough to support:

- default TypeScript naming
- custom snake_case output
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

Array root:

```ts
export type UserList = ({
  id: number;
  name?: string;
})[];
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

## Current Limitations

The generator does not yet support:

- choosing `interface` vs `type` vs `class` via configuration
- `enum`
- `union`
- references/shared named models
- imports/exports beyond the current single-document output
- target-specific formatting families beyond naming strategy

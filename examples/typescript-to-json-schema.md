# TypeScript To JSON Schema Examples

These examples show the current behavior of the toolchain for:

- TypeScript schema-subset parsing
- schema IR as the intermediate representation
- JSON Schema Draft 2020-12 generation

Unless otherwise noted, examples assume the current supported TypeScript parser subset and default JSON Schema generator behavior.

## 1. Simple Interface

TypeScript:

```ts
interface User {
  id: number;
  name?: string | null;
}
```

Parser options:

```ts
{
  entry: "User",
  name: "UserDocument";
}
```

Generated JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "UserDocument",
  "$defs": {
    "User": {
      "type": "object",
      "properties": {
        "id": { "type": "number" },
        "name": {
          "oneOf": [{ "type": "string" }, { "type": "null" }]
        }
      },
      "required": ["id"]
    }
  },
  "$ref": "#/$defs/User"
}
```

## 2. Transitive Reachable Definitions

TypeScript:

```ts
type Status = "open" | "closed";
type Audit = { at: string; actor: string };
type User = { id: number; status: Status; audit: Audit };
type Response = { users: User[] };
type Unused = { debug: boolean };
```

Parser options:

```ts
{
  entry: "Response",
  name: "ResponseDocument";
}
```

Generated JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ResponseDocument",
  "$defs": {
    "Status": {
      "oneOf": [{ "const": "open" }, { "const": "closed" }]
    },
    "Audit": {
      "type": "object",
      "properties": {
        "at": { "type": "string" },
        "actor": { "type": "string" }
      },
      "required": ["at", "actor"]
    },
    "User": {
      "type": "object",
      "properties": {
        "id": { "type": "number" },
        "status": { "$ref": "#/$defs/Status" },
        "audit": { "$ref": "#/$defs/Audit" }
      },
      "required": ["id", "status", "audit"]
    },
    "Response": {
      "type": "object",
      "properties": {
        "users": {
          "type": "array",
          "items": { "$ref": "#/$defs/User" }
        }
      },
      "required": ["users"]
    }
  },
  "$ref": "#/$defs/Response"
}
```

`Unused` is intentionally omitted because the TypeScript parser only keeps the reachable definition set for the selected entry.

## 3. Record And Union Composition

TypeScript:

```ts
type User = { id: number; name: string };
type Response = { grouped: Record<string, Array<User | null>> };
```

Parser options:

```ts
{
  entry: "Response",
  name: "ResponseDocument";
}
```

Generated JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ResponseDocument",
  "$defs": {
    "User": {
      "type": "object",
      "properties": {
        "id": { "type": "number" },
        "name": { "type": "string" }
      },
      "required": ["id", "name"]
    },
    "Response": {
      "type": "object",
      "properties": {
        "grouped": {
          "type": "object",
          "additionalProperties": {
            "type": "array",
            "items": {
              "oneOf": [{ "$ref": "#/$defs/User" }, { "type": "null" }]
            }
          }
        }
      },
      "required": ["grouped"]
    }
  },
  "$ref": "#/$defs/Response"
}
```

This case is useful because it shows three current behaviors together:

- reusable named definitions
- `Record<string, T>` rendering through `additionalProperties`
- nullable union members inside nested array item schemas

## 4. Enum-Like Literal Definitions

TypeScript:

```ts
enum Status {
  Open = "open",
  Closed = "closed",
}

type Response = { status: Status };
```

Parser options:

```ts
{
  entry: "Response",
  name: "ResponseDocument";
}
```

Generated JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ResponseDocument",
  "$defs": {
    "Status": {
      "oneOf": [{ "const": "open" }, { "const": "closed" }]
    },
    "Response": {
      "type": "object",
      "properties": {
        "status": { "$ref": "#/$defs/Status" }
      },
      "required": ["status"]
    }
  },
  "$ref": "#/$defs/Response"
}
```

The current TypeScript parser deliberately treats supported enum declarations as literal or literal-union schema definitions rather than preserving TypeScript enum runtime semantics.

## 5. Readonly Syntax As Data-Shape Semantics

TypeScript:

```ts
interface User {
  readonly id: number;
  readonly tags: readonly string[];
  readonly pair: readonly [number, string?];
}
```

Parser options:

```ts
{
  entry: "User",
  name: "UserDocument";
}
```

Generated JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "UserDocument",
  "$defs": {
    "User": {
      "type": "object",
      "properties": {
        "id": { "type": "number" },
        "tags": {
          "type": "array",
          "items": { "type": "string" }
        },
        "pair": {
          "type": "array",
          "prefixItems": [{ "type": "number" }, { "type": "string" }],
          "minItems": 1,
          "items": false
        }
      },
      "required": ["id", "tags", "pair"]
    }
  },
  "$ref": "#/$defs/User"
}
```

The current parser treats supported readonly syntax as ordinary shared data-shape semantics rather than introducing a dedicated readonly node into the IR.

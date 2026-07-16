# Universal Data Model Converter Architecture Review

> Review Date: 2026-07
>
> Current Status:
>
> - JSON Parser ✅
> - TypeScript Parser ✅
> - JSON Schema Parser ✅
> - TypeScript Generator ✅
> - JSON Schema Generator ✅
> - Basic Round-trip Tests ✅

---

# Executive Summary

The project has evolved beyond a simple code generator and is becoming a **semantic data model conversion framework**.

The current architecture is moving in the right direction:

- A shared intermediate representation (IR)
- Parser / Generator separation
- Round-trip testing
- Structured diagnostics
- Language-independent semantic model

The next architectural milestone should **not** be adding more languages.

Instead, it should be to stabilize the IR architecture before expanding parser and generator support.

The proposed direction is to organize the project around three independent but related IR families:

- Value IR
- Shape IR
- Constraint IR

---

# Current Progress Assessment

## Strengths

The project already demonstrates several characteristics of a mature conversion framework.

### Parser Coverage

Current parsers:

- JSON
- TypeScript
- JSON Schema

This is significant because JSON Schema introduces semantic constraints that cannot simply be represented as language syntax.

---

### Generator Coverage

Current generators:

- TypeScript
- JSON Schema

Together with the parser implementation, the project now supports semantic round-trip testing.

---

### Existing Shape IR

The current Schema IR already models:

- primitive types
- object
- array
- tuple
- record
- literal
- union
- reference
- definitions
- null
- optional fields

This is already considerably better than simply exposing a TypeScript AST.

---

### Testing

The project now has:

- parser
- generator
- round-trip integration tests

This is an important milestone because semantic correctness is becoming verifiable.

---

# Suggested Architecture

Instead of treating every conversion as passing through one giant IR, the project should consist of three independent semantic models.

```
                 Value IR

JSON
YAML
TOML
      ───────────────► Value IR ───────────────► JSON/YAML/TOML


                 Shape IR

TypeScript
JSON Sample
JSON Schema
OpenAPI
      ───────────────► Shape IR ───────────────►
                        TypeScript
                        Rust
                        Java
                        Go
                        Kotlin


             Constraint IR

JSON Schema
OpenAPI
Validation DSL
      ───────────────► Constraint IR ─────────►
                        JSON Schema
                        OpenAPI
                        Zod
                        Validators
```

These three IRs are related, but they should not necessarily be generated together.

---

# Value IR

## Purpose

Represent actual serialized data.

Examples:

- JSON
- YAML
- TOML

Value IR should describe values only.

```
Object
Array
String
Number
Boolean
Null
```

It should not contain language-specific type information.

---

## Responsibilities

Value IR answers one question:

> What is the value?

Example:

```
{
    "name": "Alice",
    "age": 30
}
```

becomes

```
Object
    name -> String("Alice")
    age -> Number(30)
```

---

# Shape IR

## Purpose

Represent structural types.

Shape IR answers:

> What shape is allowed?

Example:

```
object {
    name: string
    age: integer
}
```

Shape IR should remain language independent.

---

## Recommended Nodes

Primitive

- string
- number
- integer
- boolean
- null
- unknown

Composite

- object
- array
- tuple
- record
- union
- literal
- reference

Reusable

- definitions

---

# Constraint IR

Constraint IR should represent validation rules that do not change structural shape.

Examples:

```
minimum

maximum

minLength

maxLength

pattern

multipleOf

uniqueItems

minItems

maxItems
```

These are validation rules rather than structural definitions.

---

# Shape vs Constraint

A useful rule:

> If removing a piece of information changes the structural type, it belongs to Shape IR.

Otherwise, it belongs to Constraint IR.

Examples:

Shape

```
object

array

tuple

optional field

nullable

union
```

Constraint

```
minimum

pattern

maxLength

uniqueItems
```

---

# Constraint Overlay

Constraint IR should not duplicate the entire Shape tree.

Instead, use an overlay model.

```
ShapeDocument

    root

ConstraintDocument

    bindings

ConstraintBinding

    targetNodeId

    constraint
```

Example:

```
Node

User.age

↓

Constraint

minimum = 0

maximum = 150
```

This avoids maintaining two parallel trees.

---

# Recommended Schema Model

```
SchemaModel

    ShapeDocument

    ConstraintDocument?
```

Rather than

```
ConstraintObject

ConstraintArray

ConstraintTuple

...
```

---

# Parser Responsibilities

Each parser should produce only the IRs that naturally exist in its source.

| Source | Value | Shape | Constraint |
|---------|-------|--------|------------|
| JSON | ✅ | inferred | none |
| YAML | ✅ | inferred | none |
| TOML | ✅ | inferred | none |
| TypeScript | ❌ | ✅ | minimal |
| JSON Schema | ❌ | ✅ | ✅ |
| OpenAPI | ❌ | ✅ | ✅ |

---

# Testing Strategy

Instead of building N × M complete integration suites, organize testing into four layers.

## Parser Contract Tests

```
Source

↓

Expected IR
```

Parser correctness only.

---

## Generator Contract Tests

```
IR

↓

Expected Output
```

Generator correctness only.

---

## Round-trip Tests

```
Source

↓

IR

↓

Source

↓

Equivalent IR
```

Semantic equivalence should be tested rather than textual equality.

---

## Acceptance Tests

Only a small number of representative conversion paths should be maintained.

Examples:

```
JSON → TypeScript

JSON Schema → TypeScript

TypeScript → JSON Schema
```

---

# Capability Model

Future generators should explicitly describe supported semantic capabilities.

Example:

TypeScript

```
object

union

tuple

✓

minimum

pattern

minLength

✗
```

JSON Schema

```
object

union

tuple

minimum

pattern

✓
```

---

# Conversion Loss Reporting

Successful conversion does not necessarily mean semantic preservation.

Generators should report information loss.

Example:

```
Conversion

JSON Schema

↓

TypeScript
```

Result

```
Success

Losses

- minimum

- pattern

- maxLength
```

This should be treated separately from parser or generator diagnostics.

---

# Current Priorities

## Phase 1

Complete Shape IR support for JSON Schema.

Focus on:

- object
- array
- tuple
- union
- reference
- definitions

---

## Phase 2

Introduce Constraint IR v1.

Support only atomic constraints.

Examples:

- minimum
- maximum
- minLength
- maxLength
- pattern
- uniqueItems

Avoid implementing complex logical constraints too early.

---

## Phase 3

Introduce semantic loss reporting.

Every generator should report unsupported semantic features.

---

## Phase 4

Implement Value IR.

Support:

- JSON
- YAML
- TOML

using a shared semantic value model.

---

# Long-term Vision

The project should evolve from

> "A type generator"

into

> "A deterministic semantic conversion framework."

Core principles:

- Language independent
- Deterministic
- Explainable
- Testable
- Round-trip oriented
- Semantic preservation first
- Explicit information loss reporting

If these principles remain the foundation, adding new languages becomes incremental rather than architectural work.
# Rust Parser / Generator Design and Roadmap

The current released Rust surface is V1. This page records the supported
boundary, stability requirements, and intentional deferrals.

## 1. Goal

Add Rust data type support to Schema Transformation Toolkit.

The first version is intentionally limited to Rust syntax that represents common data models.

The goal is **not** to parse arbitrary Rust programs.

The transformation pipeline remains:

```text
Rust Source
    ↓
Rust Parser
    ↓
Canonical IR
    ↓
Rust Generator
    ↓
Rust Source
```

Rust support should follow the same architectural rule as other formats:

> Parsers preserve as much semantic information as reasonably possible.
> Generators decide how that information can be represented in the target language.

Rust support is a format adapter inside the existing TypeScript/Node.js
workspace. It must use the existing parser, generator, descriptor, registry,
and structured-result contracts. Rust-specific syntax libraries and runtime
types must not leak into core IR or the SDK surface.

The parser implementation backend is an explicit Phase 0 decision. The
repository cannot consume the Rust `syn` or `quote` crates as ordinary
TypeScript dependencies. A direct `syn`/`quote` implementation would require
an additional Rust/WASM or native build and packaging toolchain. V1 must choose
one of these backends before implementation:

```text
TypeScript/JavaScript Rust grammar backend
    → simplest workspace and package integration

Rust parser compiled to WASM/native helper
    → stronger reuse of Rust tooling, but adds build/runtime distribution cost
```

The canonical IR and adapter contracts must remain independent of that choice.
The first implementation should prefer the backend that preserves the current
Node.js, SDK packaging, and synchronous execution model without adding a
mandatory native runtime.

---

## 2. Scope

### 2.1 V1 Supported Syntax

V1 supports named structs:

```rust
pub struct User {
    pub id: u64,
    pub name: String,
    pub email: Option<String>,
    pub roles: Vec<String>,
    pub profile: Profile,
}
```

Supported primitive types:

```text
bool

String
str
&str

i8
i16
i32
i64
i128
isize

u8
u16
u32
u64
u128
usize

f32
f64
```

Supported container types:

```text
Option<T>
Vec<T>
Box<T>
HashMap<String, T>
BTreeMap<String, T>
```

Unit-only enums are lowered to named string literal unions. Both standard and
`alloc` paths for the supported map containers are accepted. `HashMap` and
`BTreeMap` share `SchemaRecordNode` semantics; generation currently uses
`std::collections::HashMap<String, T>`.

Supported references to other named data types:

```rust
struct User {
    profile: Profile,
}
```

Multiple structs in the same source file are supported.

---

## 3. Explicitly Out of Scope for V1

The following features are intentionally excluded from V1:

```text
tuple struct
tuple
fixed-size array
type alias

generic struct
generic type
const generic

trait
impl
associated type
where clause

Serde attributes
custom attributes

Rc
Arc

macro-generated types
```

Examples that should return an unsupported-feature error:

```rust
struct Page<T> {
    items: Vec<T>,
}
```

Unsupported syntax should fail explicitly rather than silently degrading semantic information.

The current V1 hardening requirement is semantic validation: parser and
generator round trips must preserve Shape and Constraint IR, recursive
references, unit enums, maps, nullable values, and numeric representation
hints. Generated representative sources are also compiled with `rustc` in a
temporary directory. This validates emitted syntax without adding a runtime
dependency or expanding the supported language boundary.

---

# 4. Parser Architecture

The parser has three internal stages. The syntax backend is an implementation
choice and must not become part of the public adapter contract.

```text
Rust Source
    ↓
Rust syntax backend
    ↓
Rust semantic model
    ↓
Canonical IR mapper
    ↓
Canonical IR
```

The syntax backend may be a JavaScript/TypeScript Rust grammar or a Rust
component compiled for the supported runtime. If a future backend uses `syn`,
`syn` must remain an implementation detail of that backend and must not appear
in public package types.

The canonical IR must not depend on syntax-backend types.

Conceptually:

```text
Rust source
    → parse syntax
    → adapter-local semantic model
    → map declarations and types
    → Shape IR + Constraint IR
```

The public adapter must expose the existing toolkit descriptor and
discriminated parse result contracts. It must not expose a Rust-specific
`Parser` trait or a Rust-specific AST.

---

# 5. Semantic Mapping

Rust syntax should first be interpreted as Rust data-model semantics before being converted into the canonical IR.

The central operation should conceptually be:

```rust
fn map_type(ty: &syn::Type) -> Result<IrType, RustParseError>;
```

This prevents Rust-specific syntax handling from leaking throughout the parser.

Example:

```text
syn::Type
    ↓
Rust type interpretation
    ↓
Canonical semantic type
```

---

# 6. Primitive Type Mapping

## Boolean

```text
bool
    ↓
Boolean
```

## String

```text
String
&str
str
    ↓
String
```

For V1, ownership and lifetime differences are intentionally discarded because they do not describe the serialized data model.

## Signed Integers

Rust integer types should preserve their numeric constraints where possible.

Example:

```text
i8
    ↓
Integer
minimum: -128
maximum: 127
```

```text
i32
    ↓
Integer
minimum: -2147483648
maximum: 2147483647
```

## Unsigned Integers

Example:

```text
u8
    ↓
Integer
minimum: 0
maximum: 255
```

```text
u32
    ↓
Integer
minimum: 0
maximum: 4294967295
```

The parser should **not** simply convert:

```text
u32 → Number
```

because doing so unnecessarily destroys information.

The canonical mapping should use both Shape IR and Constraint IR:

```text
Rust scalar
    → Shape scalar kind: integer
    → ScalarRepresentationHint: integer family, signedness, width
    → numeric constraints when the bounds are language-stable
```

Integer bounds that exceed JavaScript's safe integer range must use core
`DecimalValue` instances. For example, `u64` should preserve its maximum as
the exact decimal value `18446744073709551615`, not as an imprecise JavaScript
number.

`isize` and `usize` use `widthBits: "pointer"`. Their exact numeric bounds are
platform-dependent, so the parser must not invent a fixed 32-bit or 64-bit
range. The adapter should document whether it omits those bounds or reports a
platform-dependent semantic note; it must not silently claim a universal
bound.

## Floating Point

```text
f32
f64
    ↓
Number
```

Exact floating-point representation constraints do not need to be modeled in V1.

The representation hint should still preserve the Rust width:

```text
f32 → number + { family: "float", widthBits: 32 }
f64 → number + { family: "float", widthBits: 64 }
```

---

# 7. Container Mapping

## Option

```rust
Option<String>
```

maps conceptually to:

```text
field presence: optional
field nullability: nullable
field type: String
```

This is a deliberate V1 data-model policy. Without interpreting Serde
attributes, `Option<T>` is treated as accepting both a missing field and an
explicit null when it is used as a struct field. The policy must be reported
or made configurable if a future serialization mode needs to distinguish
these cases.

Nested types should work recursively:

```rust
Option<Vec<String>>
```

becomes:

```text
Optional
    └── Array
          └── String
```

For nested positions where Shape IR has no field-presence bit, `Option<T>`
maps to a nullable union:

```text
Vec<Option<String>>
    → Array(Union(String, Null))
```

The same recursive rule applies to `Option<Profile>` and other supported
inner types.

## Vec

```rust
Vec<String>
```

becomes:

```text
Array
    └── String
```

And:

```rust
Vec<Profile>
```

becomes:

```text
Array
    └── Reference(Profile)
```

---

# 8. Named Type References

Unknown simple Rust type paths should be interpreted as references to named data models.

Example:

```rust
struct User {
    profile: Profile,
}
```

becomes conceptually:

```text
Object User
    field profile
        Reference(Profile)
```

The parser does not need to require the referenced type to appear before the current struct.

For example, this is valid input:

```rust
struct User {
    profile: Profile,
}

struct Profile {
    age: u32,
}
```

Reference resolution can happen after all declarations have been parsed.

---

# 9. Rust Path Normalization

Rust types can appear using different paths:

```rust
Vec<String>

std::vec::Vec<String>

alloc::vec::Vec<String>
```

The Rust semantic mapper should normalize known standard types before converting them to IR.

Conceptually:

```text
Rust Type Path
      ↓
Path Normalization
      ↓
Known Rust Type
      ↓
Canonical IR
```

Avoid scattering string comparisons such as:

```rust
if name == "Vec" { ... }
```

throughout the parser.

Instead, centralize Rust type recognition.

---

# 10. Struct Mapping

Given:

```rust
pub struct User {
    pub id: u64,
    pub name: String,
    pub email: Option<String>,
}
```

produce conceptually:

```text
Object: User

fields:
  id:
    Integer
    minimum: 0
    maximum: 18446744073709551615

  name:
    String

  email:
    Optional<String>
```

Visibility modifiers do not affect the data model in V1.

Therefore:

```rust
pub name: String
```

and:

```rust
name: String
```

have equivalent IR semantics.

---

# 11. Generator Architecture

The generator performs the inverse transformation:

```text
Canonical IR
    ↓
Rust Type Selection
    ↓
Rust Syntax Generation
    ↓
Formatting
    ↓
Rust Source
```

The generator must use a deterministic Rust source emitter. If the selected
runtime provides a Rust token/AST backend, that backend may be used internally;
otherwise a small adapter-local emitter is sufficient for the V1 subset.
Either way, source construction must not be scattered through semantic mapping
code.

Conceptually:

```text
Canonical IR
    → Rust type selection
    → adapter-local Rust model
    → deterministic source emitter
    → Rust source
```

---

# 12. Rust Type Selection Policy

Some IR types have an exact Rust representation:

```text
Boolean        → bool
String         → String
Optional<T>    → Option<T>
Array<T>       → Vec<T>
Reference(Foo) → Foo
```

Numeric types require a selection policy.

Selection order is important:

```text
1. compatible ScalarRepresentationHint, when present
2. exact numeric range constraints
3. stable V1 default
4. explicit unsupported/loss result if the range cannot be represented
```

Representation hints are especially important for Rust → Rust round trips.
For example, an unsigned 64-bit scalar must remain `u64` even if a different
Rust integer could represent the currently observed range. Constraints are
the fallback for schemas produced by formats that do not preserve a concrete
Rust representation.

For example, if IR contains:

```text
Integer
minimum: 0
maximum: 255
```

the generator may select:

```rust
u8
```

Similarly:

```text
0..65535
→ u16
```

If the IR only specifies:

```text
Integer
```

without enough constraints to infer a narrower representation, V1 should use a stable default:

```rust
i64
```

The default must be documented and stable. It must not depend on the host
platform or incidental traversal order.

The important rule is:

> Rust numeric type selection is a generator policy, not an IR concern.

---

# 13. Generated Struct Style

V1 should generate simple public data models.

Example IR:

```text
Object User

id: Integer
name: String
email: Optional<String>
roles: Array<String>
```

generates:

```rust
pub struct User {
    pub id: i64,
    pub name: String,
    pub email: Option<String>,
    pub roles: Vec<String>,
}
```

Using `pub` consistently avoids introducing configuration decisions in V1.

Serde derives should not be generated yet. The V1 adapter describes common
Rust data models, not a complete serialization contract. In particular, it
does not interpret `serde` attributes, rename policies, omission policies, or
custom serializers. The `Option<T>` policy above is therefore an explicit
canonical-data-model convention, not a claim about every possible Serde
configuration.

For example, V1 should **not** automatically produce:

```rust
#[derive(Serialize, Deserialize)]
```

because that introduces a dependency and serialization semantics outside the initial scope.

---

# 14. Errors

Rust-specific parsing failures should distinguish between invalid Rust and
valid-but-unsupported Rust, while being returned through the existing parser
result contract rather than a new public Rust error hierarchy.

Conceptually:

```rust
enum RustParseFailure {
    SyntaxError(...),

    UnsupportedFeature {
        feature: RustFeature,
    },

    UnsupportedType {
        type_name: String,
    },

    InvalidDataModel(...),
}
```

These categories should map to stable adapter failure codes and structured
diagnostics. A Rust-specific internal error type is acceptable, but it must be
translated before crossing the parser package boundary.

Possible features:

```text
Enum
Generic
TupleStruct
TypeAlias
Map
Attribute
ConstGeneric
```

This distinction is important for future tooling and UI messages.

For example:

```text
Invalid Rust syntax
```

is fundamentally different from:

```text
Valid Rust, but generic structs are not supported yet.
```

---

# 15. Testing Strategy

Tests should focus on semantic equivalence rather than source-text equality.

Primary invariant:

```text
Rust
 ↓
IR₁
 ↓
Rust
 ↓
IR₂

IR₁ == IR₂
```

Do not require:

```text
source₁ == source₂
```

because formatting, visibility, and other non-semantic details may differ.

---

# 16. Test Fixtures

Start with small semantic fixtures.

```text
fixtures/rust/

primitive.rs
integer.rs
optional.rs
array.rs
nested.rs
multiple_structs.rs
references.rs
unsupported_enum.rs
unsupported_generic.rs
```

Example:

### optional.rs

```rust
struct User {
    name: String,
    email: Option<String>,
}
```

Test:

```text
Rust
→ IR
→ Rust
→ IR

IR₁ == IR₂
```

---

# 17. Cross-Format Tests

Rust support should also be tested against existing adapters.

Important paths:

```text
Rust
→ IR
→ TypeScript

Rust
→ IR
→ JSON Schema

Rust
→ IR
→ Zod
```

And the reverse:

```text
TypeScript
→ IR
→ Rust

JSON Schema
→ IR
→ Rust
```

These tests are particularly valuable because they reveal semantic information loss between type systems.

---

# 18. First End-to-End Fixture

The first milestone should successfully process:

```rust
pub struct User {
    pub id: u64,
    pub name: String,
    pub email: Option<String>,
    pub roles: Vec<String>,
    pub profile: Profile,
}

pub struct Profile {
    pub age: u32,
}
```

The following transformations should work:

```text
Rust → IR

Rust → TypeScript
Rust → JSON Schema

TypeScript → Rust
JSON Schema → Rust

Rust → Rust
```

---

# 19. Implementation Plan

## Phase 0 — Runtime and semantic decisions

Before adding packages, decide and document:

```text
syntax backend and supported Node.js/runtime environments
Option<T> field and nested-position mapping
isize/usize platform-dependent bound policy
Rust identifier and keyword escaping policy
generated visibility and formatting policy
```

This phase prevents a parser implementation from accidentally committing the
repository to a Rust/WASM packaging model or to an implicit Serde contract.

## Phase 1 — Parser Skeleton

Add the Rust parser package, selected syntax backend, descriptor, capabilities,
options, structured failure codes, and registry manifest.

Implement:

```text
source
→ syn::File
→ declarations
```

No complex semantic mapping yet.

## Phase 2 — Primitive Types

Implement:

```text
bool
String
integer types
floating-point types
```

Include integer constraints.

## Phase 3 — Composite Types

Implement recursive mapping for:

```text
Option<T>
Vec<T>
named references
```

## Phase 4 — Structs

Implement named-field structs and multiple declarations.

At this point:

```text
Rust → IR
```

should be usable.

## Phase 5 — Generator

Implement:

```text
IR object → struct
Boolean → bool
String → String
Integer → Rust integer
Number → f64
Optional → Option
Array → Vec
Reference → named type
```

The generator must consume representation hints before inferring a type from
constraints and must report unsupported ranges instead of silently widening or
wrapping them.

## Phase 6 — Round-Trip Tests

The current stability suite establishes:

```text
Rust → IR → Rust → IR
```

semantic equivalence tests.

## Phase 7 — Cross-Format Tests

The current route suite tests:

```text
Rust ↔ TypeScript
Rust ↔ JSON Schema
```

and the other existing Shape-compatible adapters, including Zod, OpenAPI,
Python, Go, Java, and Kotlin.

---

# 20. Future Extensions

Future work remains deliberately deferred:

```text
data-carrying and Serde-represented enums
tuples, tuple structs, and fixed-size arrays
aliases, newtypes, and generics
richer serialization semantics and macro-generated types
```

Generics should be treated as a separate design problem rather than casually
added to the parser.

---

# 21. Design Principles

Rust support should follow several rules.

### Preserve semantics before syntax

```text
Rust syntax
→ semantic meaning
→ IR
```

Do not attempt source-to-source translation.

### Do not leak Rust into the IR

The IR should not contain concepts such as:

```text
syn::Type
RustPath
RustStruct
Vec
Option
```

unless they correspond to genuinely language-independent concepts.

### Do not silently lose information

If something cannot be represented safely:

```text
explicit unsupported error
```

is preferable to:

```text
guess → incorrect IR
```

### Keep V1 deliberately small

The success criterion is not:

> Support the Rust type system.

It is:

> Reliably transform common Rust data models through the toolkit's canonical IR.

---

# 22. V1 Definition of Done

Rust V1 is complete when this model:

```rust
pub struct User {
    pub id: u64,
    pub name: String,
    pub email: Option<String>,
    pub roles: Vec<String>,
    pub profile: Profile,
}

pub struct Profile {
    pub age: u32,
}
```

can reliably participate in:

```text
                    ┌→ TypeScript
                    │
Rust → Canonical IR ├→ JSON Schema
                    │
                    ├→ Zod
                    │
                    └→ Rust
```

and existing supported schemas can generate equivalent Rust data models.

At that point, Rust becomes a real toolkit adapter rather than an isolated parser/generator implementation.

In addition, V1 is not complete until the selected parser runtime is included
in the normal workspace build and package smoke checks, the generated builtin
registry discovers both Rust descriptors, and unsupported syntax produces
structured parser failures rather than generic exceptions.

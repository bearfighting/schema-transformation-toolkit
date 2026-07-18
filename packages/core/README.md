# @aio/core

Shared IR, contracts, and cross-package naming utilities.

For the current canonical IR contract, see [docs/development/ir-contract.md](../../docs/development/ir-contract.md).

## Responsibilities

- define the shared schema IR used across parsers and generators
- provide public schema construction helpers
- enforce core document and node invariants
- expose shared result-shape and diagnostic contracts
- centralize reusable semantics such as identifier normalization, equivalence, and validation

If you want end-to-end examples first, start with:

- [examples/json-to-typescript.md](../../examples/json-to-typescript.md)
- [examples/json-to-json-schema.md](../../examples/json-to-json-schema.md)
- [examples/typescript-to-json-schema.md](../../examples/typescript-to-json-schema.md)

## Current Scope

The current `schema` IR intentionally stays small:

- `SchemaScalarNode`
- `SchemaLiteralNode`
- `SchemaReferenceNode`
- `SchemaUnionNode`
- `SchemaNullNode`
- `SchemaUnknownNode`
- `SchemaObjectNode`
- `SchemaArrayNode`
- `SchemaTupleNode`
- `SchemaRecordNode`
- `SchemaFieldNode`
- `SchemaDefinition`
- `SchemaDocument`

That v0 shape is enough for the currently supported end-to-end paths:

- `json -> schema ir -> typescript`
- `json -> schema ir -> json-schema`
- `typescript -> schema ir -> typescript`
- `typescript -> schema ir -> json-schema`

It is not yet broad enough to represent all meaningful JSON samples or all meaningful source-language type constructs as stable shared schema semantics.

The shared contract layer now also includes a lightweight structured diagnostics model so parsers and generators can report richer explanations without replacing the current success/failure result shapes.

## Minimal Usage

```ts
import {
  schemaDocument,
  schemaFieldNode,
  schemaObjectNode,
  schemaScalarNode,
} from "@aio/core";

const document = schemaDocument(
  "User",
  schemaObjectNode([schemaFieldNode("id", schemaScalarNode("integer"))]),
);
```

The resulting `SchemaDocument` can then be passed to any supported generator.

## Key Public Concepts

The core package revolves around a few central shapes:

- `SchemaDocument`: one logical schema model with one root and zero or more reusable definitions
- `SchemaNode`: the union of supported semantic node kinds
- `SchemaFieldNode`: field-level required and nullable semantics
- `SchemaDiagnostic`: structured parser/generator explanation shape
- `SchemaGenerator` and `SchemaParser`: shared cross-package interfaces

The public factories intentionally keep construction ergonomic while still validating invariants at the IR boundary.

## Current End-To-End Role

Today `@aio/core` is the only required handoff between:

- `@aio/parser-json`
- `@aio/parser-typescript`
- `@aio/generator-typescript`
- `@aio/generator-json-schema`

That means changes here should be treated as shared semantic changes, not package-local implementation details.

## Schema IR v1 Roadmap

The next expansion should focus on capabilities that materially improve `json -> typescript` coverage without turning the IR into a TypeScript-shaped AST.

Some roadmap items below have already landed in the current IR surface. They remain documented here because they explain the design direction and ordering that produced the current model.

### Must Have

#### 1. Record or Map Nodes

Status: implemented

Why:

- many JSON objects have dynamic keys instead of a fixed field set
- treating observed keys as fixed fields overfits sample data

Examples:

- `{ "en": "Hello", "fr": "Bonjour" }` -> `Record<string, string>`
- `{ "123": { ... }, "456": { ... } }` -> `Record<string, User>`

Suggested shape:

```ts
interface SchemaRecordNode extends SchemaBaseNode {
  kind: "record";
  key: SchemaNode;
  value: SchemaNode;
}
```

For v1, `key` should probably stay constrained to string-like nodes even if the IR field is typed more generally.

### Should Have

#### 2. Reusable References

Status: implemented

Why:

- avoids endlessly inlining repeated object shapes
- creates a cleaner bridge to named TypeScript aliases and interfaces
- gives future parsers and generators a stable way to share reusable structures

This means a document-level definitions area and reference nodes, not just a standalone `SchemaReferenceNode`.

#### 3. Better Unknown Semantics

Status: partially implemented

Why:

- not all unresolved situations mean the same thing
- improves diagnostics and future inference behavior

Useful distinctions include:

- truly unknown
- empty-array-only evidence
- null-only evidence
- degraded because mixed types were collapsed

This may remain as `SchemaUnknownNode` plus richer metadata, rather than many separate node kinds.

#### 4. Discriminated Union-Friendly Structure

Status: implemented in current JSON inference and IR-preservation behavior without a dedicated node kind

Why:

- common in real-world JSON APIs
- becomes very powerful once union + literal exist

This may not require a dedicated node kind in v1. It may be enough to ensure object unions with literal discriminator fields remain representable and are not normalized away.

### Can Wait

#### 5. Intersection or Composition

Useful for some schema ecosystems, but not needed to substantially improve `json -> typescript` inference.

#### 6. Inheritance-Like Modeling

More relevant to schema ecosystems and codegen targets than to raw JSON sample inference.

#### 7. XML-Oriented Structure

Out of scope for schema IR v1. If XML-specific structure becomes important later, it should not be forced into the schema IR just to satisfy one source format.

## Recommended Implementation Order

1. `SchemaRecordNode`
2. document-level references
3. richer `SchemaUnknownNode` evidence
4. discriminated-union-friendly normalization rules

That order keeps the next steps focused on real remaining gaps:

- record-like objects are the biggest remaining JSON shape gap
- references become more important as the IR grows
- richer unknown evidence will help future parser diagnostics without forcing a syntax AST yet

## Post-Tuple Priorities

The next concrete work after tuple support should stay focused on `json -> typescript` coverage:

1. `SchemaRecordNode`
2. document-level references / reusable definitions
3. richer `SchemaUnknownNode` evidence
4. discriminated-union-friendly normalization guarantees
5. optional literal-preserving inference modes

Why this order:

- record-like objects are the biggest remaining structural gap in ordinary JSON samples
- references matter more once shapes become larger and more repetitive
- unknown evidence and discriminated unions improve correctness without forcing parser syntax-layer work
- literal-preserving inference is valuable, but easier to add once the remaining structural gaps are closed

## Current Null Semantics

- `SchemaNullNode` represents a value whose schema is exactly `null`
- `SchemaFieldNode.nullable` means a non-null field type may also be `null`
- `SchemaFieldNode { type: SchemaNullNode, nullable: true }` is invalid and should not be constructed

## Current Literal Semantics

- `SchemaLiteralNode` represents an exact scalar value such as `"open"`, `42`, or `true`
- literal nodes are currently supported by the schema IR and TypeScript generator
- the current JSON sample inference path still widens ordinary scalar samples by default; literal-preserving inference will be introduced deliberately as part of later parser evolution

## Current Union Semantics

- `SchemaUnionNode` represents a value that may match one of several member schemas
- the TypeScript generator renders union members with `|`
- the JSON parser supports union inference when `mixedTypeMode` is explicitly set to `"union"`
- the default JSON parser mode remains `"error"` for mixed incompatible samples
- object union members with distinct literal discriminator fields should remain unions instead of being normalized into one wider object shape

Examples:

- `{ type: "a", value: string } | { type: "b", count: number }` should remain an object union
- it should not be normalized into `{ type: "a" | "b"; value?: string; count?: number }`

## Current Reference Semantics

- `SchemaDocument.definitions` stores reusable named schema definitions for one document
- `SchemaReferenceNode` points to a definition by its `name.source`
- references are document-local and do not cross document boundaries
- definitions are explicitly named; the core IR does not auto-generate definition names
- the current JSON parser does not yet auto-extract definitions from repeated shapes

Examples:

- a shared `User` object definition referenced from `Array<User>`
- a literal-union `Status` definition referenced from a root alias such as `TeamState = Status`

## Current Unknown Semantics

- `SchemaUnknownNode` remains one semantic node kind for unresolved schema meaning
- `reason` is explicit and required so unknown values stay explainable
- `evidence` is optional lightweight context for diagnostics and future UI surfaces
- `evidence` does not change the core schema meaning of the node
- the current shared reasons are:
  - `no-evidence`
  - `empty-array-element`
  - `empty-array-only-field`
  - `mixed-types-collapsed`

Current intent:

- generators can continue rendering `unknown` conservatively
- parsers can preserve why a value became `unknown`
- future `web` and CLI surfaces can explain unknown outcomes without requiring new node kinds
- degraded-but-still-known results should prefer ordinary IR nodes plus diagnostics rather than being forced into `unknown`

## Current Diagnostics Semantics

- `SchemaDiagnostic` is the shared structured explanation type across parser and generator layers
- current diagnostics use:
  - `severity`
  - `code`
  - `message`
  - optional `path`, `nodeKind`, `source`, and `evidence`
- result objects may now carry `diagnostics` in addition to existing `ok`, `code`, `message`, `document`, and `output` fields
- `code` and `message` remain the compatibility surface for callers that do not yet consume structured diagnostics

## Core Invariants To Remember

Some invariants are especially important when constructing or transforming IR directly:

- references must resolve to a definition in the same document
- definition names must be unique within one document
- record keys must currently be `string` scalar nodes
- `nullable: true` must not wrap a type that already includes `null`
- tuple optionality and explicit `null` remain distinct semantics

If you are not sure whether a shape is valid, prefer going through the public factories rather than constructing plain objects by hand.

## Current Tuple Semantics

- `SchemaTupleNode` represents an ordered, fixed-position sequence
- tuple nodes are distinct from `SchemaArrayNode`, which continues to represent homogeneous lists
- each tuple position carries its own `required` presence flag
- missing tuple positions and explicit `null` values are intentionally different semantics
- the JSON parser only infers tuples when `tupleInferenceMode` is explicitly enabled
- the current tuple inference mode is intentionally conservative: it only promotes heterogeneous arrays to tuples

Examples:

- `[number, string]` means the second position must exist and must be a string
- `[number, string?]` means the second position may be absent
- `[number, string | null]` means the second position must exist, but its value may be `null`
- `[number, (string | null)?]` means the second position may be absent, and if present may still be `null`

Current guardrails:

- `optional` and `null` are separate semantics and should not be collapsed into one concept
- tuple position unions are allowed when a single position has multiple observed value types
- tuple positions are modeled semantically so future non-TypeScript generators can map them into target-specific constructs

## Current Record Semantics

- `SchemaRecordNode` represents a dynamic-key object shape rather than a fixed field set
- record nodes are distinct from `SchemaObjectNode`, which continues to represent named fields
- current record keys are intentionally constrained to the scalar type `string`
- record value semantics live entirely in the `value` node; there is no field-level optional/nullable wrapper because keys are not enumerated fields

Examples:

- `Record<string, string>` for translation tables such as `{ "en": "Hello", "fr": "Bonjour" }`
- `Record<string, User>` for id-indexed maps such as `{ "123": { ... }, "456": { ... } }`

## Project Direction

This project is primarily about mapping data-shape semantics across formats and languages.

That means the shared schema IR should model serializable data structures, not the full expressive power of any one language's type system.

A useful intuition is `serde`-style modeling: if a construct has a stable serialized shape, it is a good fit for this project; if it mainly exists as language-internal type computation or behavior, it is usually out of scope.

In practice:

- prefer features that describe data shapes such as scalars, objects, arrays, tuples, records, unions, `null`, and optional presence
- avoid extending the IR just to capture language-specific type-programming constructs
- treat TypeScript as an important validation source language, but not as the definition of the IR
- reject or defer source-language features that cannot be mapped cleanly into shared data-schema semantics

This is especially important for future TypeScript parsing work:

- a TypeScript parser should target a schema-oriented subset of TypeScript
- success should mean semantic round-tripping for data types, not source-faithful support for the whole TypeScript type system
- advanced features such as conditional types, mapped types, generic type computation, and other type-level programming constructs are intentionally out of scope unless they can be reduced to stable data-schema meaning

Working rule:

- if a construct mainly describes data, it is a good schema IR candidate
- if a construct mainly computes, transforms, or programs over types, it should usually stay out of scope

Priority support boundary:

- should be supported and done well: scalar, object, array, tuple, record/map, union, `null`, optional presence, enum-like literal unions
- should be treated cautiously or left unsupported: conditional types, mapped types, generic utility composition, function types, class behavior, branded or opaque tricks, type-level computation

Project rule:

- supported serializable-shape features should be implemented deliberately and polished
- unsupported language-type-system features should be rejected or deferred decisively rather than partially approximated without clear semantics

## Design Guardrails

- keep the IR semantic, not TypeScript-specific
- prefer a small number of orthogonal node kinds over many special cases
- do not overfit to JSON parser implementation details
- let parser limitations stay in parsers when they do not need to become IR concepts
- preserve room for future `value` and `xml` IR families without reusing schema names too loosely

## Where To Look Next

- see [docs/development/ir-contract.md](../../docs/development/ir-contract.md) for the canonical current contract
- see [docs/development/progress.md](../../docs/development/progress.md) for the unified current implementation summary
- see [packages/parsers/json/README.md](../parsers/json/README.md) and [packages/parsers/typescript/README.md](../parsers/typescript/README.md) for current source-language boundaries
- see [packages/generators/typescript/README.md](../generators/typescript/README.md) and [packages/generators/json-schema/README.md](../generators/json-schema/README.md) for target-output behavior

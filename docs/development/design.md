# Project Design

This is the durable design reference for the toolkit. It describes boundaries
that should survive individual refactors; current work belongs in
[progress.md](progress.md), and implementation/release rules belong in
[standards.md](standards.md).

## Mission and boundaries

The toolkit transforms serializable data and schema shapes across format
families while making semantic differences explicit. The shared IR is semantic
and schema-oriented, not a TypeScript-shaped AST. The project prefers stable
data concepts—scalars, literals, objects, arrays, tuples, records, unions,
references, nullability, optional presence, and portable constraints—over
format-specific syntax.

Unsupported semantics must fail explicitly or be reported as a structured
loss. A successful conversion must remain truthful about what it preserved,
widened, normalized, or discarded.

The builtin families are JSON, YAML, CSV, TOML, JSON Schema, TypeScript, Zod,
OpenAPI, Rust, Python Dataclass, and Go. Format packages own format policy. Core
owns shared semantics and execution contracts. SDK is the stable consumer
boundary and compatibility facade.

## System shape

```text
format parser → Value IR / Shape IR / Constraint IR → format generator
                         ↑
              planned transformers and validation
```

The core pipeline executes parser, planned transformers, and generator in a
fixed order. It carries the current primary IR document plus supplementary
artifacts, stage diagnostics, semantic notes, and semantic losses. The SDK
resolves a route, adapts public options, invokes the pipeline, and wraps the
result into the public contract; it does not choose transformer order, merge
artifacts, or select generator entry IR.

The dependency direction is:

```text
format packages → core
SDK → core + registered format descriptors
registry generation → format descriptors → SDK bundle
```

Format packages must not call another format's parser or generator. The
OpenAPI adapter is the deliberate exception at the semantic boundary: it
consumes or emits canonical JSON Schema semantics rather than creating a
general format-to-format dependency.

## IR layers and contracts

- **Value IR** represents concrete data: null, boolean, number, string,
  arrays, and objects. JSON, YAML, CSV, and TOML primarily use this layer.
- **Shape IR** represents data structure: scalar and literal nodes, object
  fields, additional properties, arrays, tuples, records, unions, references,
  nullability, and unknown shapes. JSON Schema, TypeScript, Zod, OpenAPI, Rust,
  Python, and Go use it as their main entry layer.
- **Constraint IR** is an overlay for portable restrictions such as string,
  numeric, collection, and object constraints. It is retained as an artifact
  when the target needs it and is never silently treated as shape structure.

Primitive representation follows the same boundary: Shape IR keeps the
portable scalar domain (`string`, `integer`, `number`, and `boolean`),
Constraint IR carries portable numeric facets, and optional
`ScalarRepresentationHint` metadata can preserve language-neutral integer or
floating-point representation details. Semantic Shape equivalence ignores
representation hints; representation-aware comparison is available when a
language adapter needs to verify round trips.

Numeric constraints may use finite JavaScript numbers or exact JSON-safe
decimal values. A target must reject or report loss when it cannot emit an
exact decimal value; it must not silently coerce large integers through an
imprecise JavaScript number.

Optional presence and nullable values are distinct. References and recursive
structures remain explicit. Root-shape requirements are descriptor contracts,
not ad-hoc format-pair checks.

Parsers declare their output IR kind and artifacts. Transformers declare input
and output kinds. Generators declare accepted IR kinds, root-shape requirements,
required artifacts, options, and analysis hooks. The pipeline validates these
contracts at runtime with the shared IR guards and `tryValidateIrBundle(...)`.
Static route planning can reject impossible routes early; dynamic root-shape
or document mismatches remain structured runtime failures.

## Execution and evidence

The generic executor follows this sequence:

```text
executeParser
  → merge initial IrBundle
  → execute planned transformers
  → select generator entry IR and required artifacts
  → executeGenerator
  → collect generator losses
```

Diagnostics and semantic notes are grouped by `parse`, `transform`, and
`generate`, with an ordered `all` view. Parser primary and supplementary
artifacts enter the bundle. A transformer replaces the current primary
document while preserving unrelated artifacts and replacing same-kind output.
The generator receives only the planner-selected entry IR and required
artifacts. Failures preserve safe evidence from completed stages and expose a
structured `code`, `message`, `phase`, route plan, diagnostics, notes, and
artifacts rather than leaking descriptor exceptions.

Semantic losses are deduplicated and ordered consistently with the existing
SDK behavior. SDK report fields such as `capabilityRequirements` and
`lossHotspots` remain higher-level interpretation; the pipeline owns actual
loss collection, not product-specific reporting policy.

## Traversal, transformation, and normalization

Shared traversal operates on Shape IR structure, root nodes, definitions, and
references according to an explicit policy. It supports immutable transforms,
reference-preserving behavior, cycle-safe handling, and normalization only
where a cross-format consumer needs it. Format-specific rewriting stays in the
format package. New traversal or IR concepts require pressure from more than
one format or a concrete consumer contract.

## Format-family boundaries

- JSON and YAML are Value-oriented baselines; CSV requires an array root and
  TOML requires an object root.
- JSON Schema, Zod, OpenAPI, Rust, Python, and Go carry Shape and, where
  declared, Constraint artifacts. Their constraint behavior and loss reporting
  must remain explicit.
- TypeScript supports the schema-oriented subset documented by its parser;
  preprocessing and diagnostics are parser concerns, not SDK orchestration.
- OpenAPI remains bounded by canonical JSON Schema-compatible documents; this
  project does not promise full OpenAPI document generation.

These boundaries are descriptor and IR contracts, not a second route matrix in
the SDK.

## Cross-language root identity

`SchemaDocument.name` identifies the document, while the optional
`SchemaDocument.rootName` preserves the declaration name of the root type when
the source exposes one. A parser may therefore lower:

```text
document.name = "ecommerce-models"
root declaration = "User"
```

to an object root with `rootName = "User"`. Generators use `rootName` for the
target declaration and fall back to `name` for legacy documents that do not
carry it. `rootName` is shared IR metadata, not Python-specific metadata.

When `root` is a reference, `rootName` must match the reference and resolve to
a definition. Inline roots may carry a declaration name without a definition,
but may not reuse the name of another definition in the same document.
Transforms, normalization, and document equivalence preserve this identity.

The existing `SchemaRecordNode` already represents string-keyed map semantics.
Python `dict[str, T]` lowers to that node and is validated against existing
Rust, Go, Java, Kotlin, TypeScript, Zod, and JSON Schema record mappings. The
current shared contract remains limited to string keys; only add another IR
concept if a future cross-format implementation reveals a semantic gap.

`SchemaRecordNode` represents a pure string-keyed map. `SchemaObjectNode.fields`
represents fixed properties, and `additionalProperties` represents the policy
for keys outside those properties; these forms must not be silently rewritten
into one another.

## Capability-driven evolution

Once a language adapter reaches a stable V1 boundary, new work should be
organized around shared semantic capabilities rather than a sequence of
language-specific feature expansions. The intended development loop is:

```text
identify shared capability
→ define the semantic intersection
→ strengthen shared IR only when necessary
→ implement format adapters
→ add cross-language equivalence fixtures
```

The next proposed capability is a string-keyed map. The existing
`SchemaRecordNode` is the starting point; the initial shared contract should
be `string → T`, with Python `dict[str, T]`, Rust string-keyed maps,
TypeScript `Record<string, T>`, and JSON Schema `additionalProperties` as
adapters. This work is deferred until the route matrix exposes a concrete
semantic gap.

Literal and unit-enum semantics reuse named literal-union definitions when
targets can preserve their values without extra metadata. Java unit enums lower
to string literal unions in Core and the Java generator restores only unions
that are representable as exact enum identifiers. General unions come later
because their cross-format behavior depends on overlap, `oneOf` vs `anyOf`,
discriminators, and ambiguity. Format-specific package declarations remain
generator options rather than Core document metadata.

Java structural classes follow the same policy as records: supported instance
fields lower to object Shape IR, while methods, constructors, inheritance, and
framework metadata are rejected rather than inferred. Java generation can emit
an object shape as a record or as a final class with public final fields and a
full constructor; this remains generator policy and does not alter Core IR.

Field-level nullability and nested null unions are already distinct Shape IR
semantics:

```text
field.nullable = true
```

is not equivalent to:

```text
field.nullable = false
field.type = union(T, null)
```

This distinction must remain explicit as arrays, records, tuples, and general
unions gain more format support.

## Public and extension boundaries

`convert`, route/capability discovery, parser/generator compatibility helpers,
structured diagnostics, semantic notes, losses, artifacts, and report fields
form the stable SDK surface. Ordinary conversion outcomes use discriminated
result values instead of thrown exception strings.

`createConverter(registry)` is the primary custom extension boundary. Builtin
aliases remain for compatibility until a breaking release. Registry metadata
drives discovery and generated builtin registration; downstream consumers
should not hardcode format lists or inspect parser/generator internals.

## Durable decisions

1. Preserve semantic IR boundaries instead of introducing a universal
   format-shaped AST.
2. Prefer explicit incompatibility and structured loss over silent guessing.
3. Keep core generic and SDK-compatible; do not move product report policy into
   core.
4. Keep package dependency direction one-way and generated registry output
   reproducible.
5. Add shared concepts only when they solve a demonstrated cross-format need.
6. Python V1 is a restricted dataclass adapter over Shape IR. It uses no
   Python-specific IR, does not execute Python, keeps required presence and
   nullability separate, and reports unrepresentable constraints as losses.
7. Go V1 is a restricted single-file data-model adapter over Shape IR. It does
   not execute Go or resolve packages; pointers lower to nullable values,
   `omitempty` lowers to optional presence, and only string-keyed maps are
   lowered to the shared record node.
8. Root declaration identity is represented by the shared optional `rootName`
   field; no format-specific root metadata is permitted.
9. Kotlin V1 is a restricted data-class and unit-enum adapter over Shape IR.
   `List<T>`, `Map<String, T>`, and `Set<T>` are the only supported collection
   interfaces; Set lowers to an array plus the existing `unique-items`
   Constraint IR entry. User-defined generics, defaults, annotations,
   inheritance, sealed hierarchies, and ordinary class parsing remain outside
   the V1 boundary.

# Current Status

This is the repository-level status page. Keep it short: current capability,
next work, intentional deferrals, and the latest verification baseline.

## Current State

The toolkit has a stable conversion kernel built around:

```text
parser → Value IR / Shape IR / Constraint IR → generator
```

The core owns IR contracts, validation, traversal, normalization, descriptor
registration, generic pipeline execution, stage evidence, artifact retention,
and semantic-loss collection. The SDK is the downstream boundary for route
planning, registry adaptation, report construction, and public result schemas.

Current platform capabilities:

- Builtin parser and generator descriptors for JSON, YAML, CSV, TOML, JSON
  Schema, TypeScript, Zod, OpenAPI, the V1 Rust struct subset, and the V1
  Python dataclass subset, the V1 Go data-model subset, and the V1 Java
  record/unit-enum/structural-class subset with deterministic package-aware
  generation.
- Builtin Kotlin parser and generator descriptors for the V1 data-class and
  unit-enum subset, including `List<T>`, `Map<String, T>`, `Set<T>` through
  `unique-items` Constraint IR, nullable nested types, references, recursion,
  and deterministic root selection.
- All current conversion routes execute through the shared core pipeline.
- `createConversionRegistry(...)` supports custom parser, generator, and
  transformer registration.
- Generated builtin registry output is deterministic and included in the SDK
  build.
- SDK public contracts cover success, failure, diagnostics, semantic notes,
  losses, artifacts, route plans, and registry-safe custom output typing.
- Workspace builds run in the explicit order core → format packages → generated
  registry → SDK.
- A third-party manifest fixture and SDK tarball clean-install smoke are part
  of the acceptance path.

## Supported Routes

Validated route families include:

- Value routes: JSON, YAML, CSV, and TOML round trips where root constraints
  allow them.
- Shape routes: JSON Schema, TypeScript, Zod, OpenAPI, Rust, Python, Go, and
  Java conversions, plus Value-to-Shape routes where supported.
- Rust routes: restricted Rust structs to/from Shape-compatible targets, with
  representation hints and typed numeric constraints.
- Constraint-preserving routes: JSON Schema, Zod, OpenAPI, and Rust routes
  where the descriptors declare Constraint IR support.
- Transformer routes: Value-to-Shape inference and registered multi-stage
  transformer chains.

Use the SDK registry APIs for the exact current route and format lists:

- `listSourceFormatSupports()`
- `listTargetFormatSupports()`
- `listConversionRoutes()`
- `describeConversionRouteCapabilities()`

### Python Dataclass routes

Python Dataclass V1 is a supported Shape IR adapter for the documented
structural subset. Validated semantics include:

- primitive scalar fields;
- arrays through `list[T]`;
- nullable values through `Optional[T]` and `T | None`;
- named dataclass references and same-file forward references;
- recursive and mutually recursive definitions;
- string-keyed `dict[str, T]` fields and restricted map aliases; and
- multiple definitions selected with an explicit `entry` when required.

The parser and generator are now in V1 final cleanup and maintenance mode for
the current dataclass and string-keyed map boundary. New Python syntax features
are intentionally deferred until a shared semantic capability has been designed
and validated across multiple adapters.

## Next Priorities

1. Maintain Rust V1 hardening: semantic round trips, recursive references,
   negative fixtures, source locations, cross-format fixtures, and generated
   source compilation smoke tests.
2. Keep data-carrying enums, Serde representation attributes, aliases,
   newtypes, and generics deferred until enum/map work reveals concrete shared
   IR pressure.
3. Keep the public SDK contract, user guide, capability matrix, and consumer
   scenario matrix aligned with actual published behavior.
4. Decide whether the current builtin registry bundle should remain fully
   bundled or gain a measured tree-shaking strategy for downstream products.
5. Improve diagnostic location guidance for editor and code-highlighting
   integrations.
6. Validate the package surface against a clean external checkout or release
   artifact when the next Rust milestone is prepared.
7. Validate the shared `rootName` contract across language adapters and keep
   record/map semantics aligned without adding format-specific IR.
8. Harden Go V1 with broader fixtures, source locations, semantic-loss
   reporting, and cross-format route coverage.
9. Harden Java structural class coverage with negative fixtures, class-style
   generation, and cross-format semantic round trips without adding
   Java-specific Core IR.

### Future shared-capability roadmap

After Python V1 is frozen, future feature work should be capability-driven
rather than language-driven:

```text
cross-language equivalence
→ programming-language semantic matrix
→ shared string-keyed map design
→ Shape IR record/map validation and fixtures
→ Python dict[str, T], Rust maps, TypeScript Record, JSON Schema maps (complete)
→ Literal / unit-enum study across adapters
→ general union study
```

The shared string-keyed map capability now uses the existing `SchemaRecordNode`
across language adapters. It remains limited to `string → T`; Python
`typing.Dict`, non-string keys, and mixed open-object semantics are deferred.
Rust unit-enum support reuses named literal unions; general unions come later because `oneOf`,
`anyOf`, discriminators, ambiguity, and nullable special cases require a more
careful shared contract.

## Intentional Deferrals

- Runtime package scanning and automatic third-party discovery.
- Removal of builtin compatibility aliases in a breaking release.
- Full browser or Worker execution support in the synchronous SDK.
- Full multi-file TypeScript resolution.
- Full OpenAPI document generation beyond canonical 3.1 schema documents.
- Data-carrying Rust enums, full Serde representation semantics, aliases,
  newtypes, and generics until the preceding Rust milestones establish a
  concrete cross-format requirement.
- Broad new parser families or speculative IR expansion.
- Python `typing.Dict`, non-string dict keys, and general map key semantics
  remain outside the shared string-keyed record/map contract.
- Python defaults, `field(...)`, Pydantic, attrs, TypedDict, NamedTuple, and
  other framework/runtime semantics remain outside the Dataclass V1 adapter.
- Literal/Enum and general-union semantics until their shared IR contracts are
  explicitly designed.
- Go typed const enums, package resolution, generics, and embedded-field
  promotion remain deferred beyond the Go data-model V1 adapter.
- Java data-carrying enums, Jackson/Bean Validation metadata, JavaBeans,
  getter/setter inference, generic records/classes, and multi-file output remain
  deferred beyond the Java record/unit-enum/structural-class adapter.
- Kotlin ordinary class parsing, mutable/concrete collections, defaults,
  annotations, inheritance, sealed hierarchies, custom generics, and compiler
  runtime integration remain deferred beyond the Kotlin V1 adapter.
- More traversal, transform, or normalization features without a concrete
  cross-format consumer requirement.

## Maturity

- Traversal: stable for current shared analysis consumers.
- Transform: usable and intentionally narrow.
- Normalization: implemented and reused selectively.
- Registry extensibility: descriptor-driven builtin discovery and explicit
  third-party registration.
- Pipeline: all current SDK conversion routes use the shared core executor.
- SDK extensibility: `createConverter(registry)` is the primary custom boundary;
  builtin aliases remain supported for compatibility.
- Packaging: explicit workspace build, deterministic registry generation,
  third-party fixture validation, and SDK tarball smoke are complete.

## Verification Baseline

Latest completed baseline:

- 98 test files, 1068 tests passing.
- TypeScript, ESLint, and Prettier passing.
- Package boundary and API snapshot checks passing.
- Generated builtin registry check passing.
- Explicit workspace build passing.
- Third-party manifest/custom registry smoke passing.
- SDK tarball clean-install smoke uses locally packed workspace dependencies and
  does not require unpublished workspace packages to exist in npm.

Primary commands:

```bash
node scripts/build-workspace.mjs
./node_modules/.bin/vitest run
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint .
./node_modules/.bin/prettier --check .
node scripts/check-boundaries.mjs
node scripts/check-api-snapshots.mjs
node scripts/generate-builtin-registry.mjs --check
node scripts/check-third-party-fixture.mjs
node scripts/check-sdk-package.mjs
```

## Reading Order

1. [design.md](design.md) for architecture and semantic boundaries.
2. [standards.md](standards.md) for implementation and validation rules.
3. Package `README`s and `examples/` for package-specific usage.

Last verified: 2026-09-06.

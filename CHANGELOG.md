# Changelog

All notable changes to this project are documented here.

Workspace packages use one shared version. The `Unreleased` section is moved
into a versioned section when a release is prepared.

Version policy: releases before `1.0.0` are unstable. Use `0.x.0` for larger
feature batches, `0.x.y` for smaller features or focused fixes, and
`-alpha.N`, `-beta.N`, or `-rc.N` for testing stages before the corresponding
final version.

## Unreleased

### C# support

- Verify the C# parser and generator across shared Shape IR routes with
  TypeScript, JSON Schema, Rust, Python, Go, Java, Kotlin, and C#.
- Document the V1 single-file record/class/symbolic-enum boundary, including
  explicit numeric, collection, and enum metadata caveats.

## 0.6.0 - 2026-09-06

### Kotlin support

- Add restricted Kotlin data-class and unit-enum parser/generator packages.
- Support nullable nested types, references, recursion, `List<T>`,
  `Map<String, T>`, and `Set<T>` through the shared Shape and Constraint IR.
- Register Kotlin as a builtin SDK source and target with options, diagnostics,
  route discovery, API snapshots, and capability documentation.

## 0.5.0 - 2026-09-03

### Java parser and generator enhancements

- Add restricted structural Java class parsing and configurable immutable class
  generation; JavaBeans and framework semantics remain unsupported.
- Add unit-only Java enum parsing through shared string literal unions.
- Generate representable named string literal unions as deterministic Java
  enums.
- Add validated Java `packageName` generator output and expanded Java
  cross-format route coverage.

## 0.4.0 - 2026-08-31

This release adds first-class Go data-model adapters through the shared Shape
IR while keeping Go support limited to a deterministic, single-file schema
subset.

### Go support

- Add `@schema-transformation-toolkit/parser-go` for exported Go structs,
  JSON tags, pointers, slices, string-keyed maps, references, recursion, and
  Go scalar representation hints.
- Add `@schema-transformation-toolkit/generator-go` for deterministic Go
  structs, JSON tags, pointers, records, arrays, references, and recursive
  definitions.
- Register Go as a builtin SDK source and target with route discovery,
  capability metadata, options, diagnostics, and semantic-loss reporting.
- Report fixed-array widening, pointer nullability, optional presence, and
  unsupported Go syntax through structured notes or failures.

### Boundaries

- Go V1 is a single-file schema adapter; it does not execute Go or resolve
  packages, imports, external types, generics, methods, non-empty interfaces,
  aliases, or embedded-field promotion.
- Go constraint annotations are not emitted as runtime validation and are
  reported as semantic loss when converting to Go.

### Validation

- Add parser, generator, SDK registry, capability, package, and cross-format
  coverage for the new Go source and target routes.

- Added V1 Python dataclass parser and generator support through Shape IR.
- Added shared Shape IR `rootName` metadata to preserve root declaration
  identity separately from document identity across language adapters.
- Reject inline rootName conflicts with same-named definitions and report JSON
  Schema inline root-name loss through structured semantic notes.
- JSON Schema generation now validates Shape IR at the generator boundary and
  returns `invalid-schema-document` with Core diagnostics before target-specific
  validation; consumers should use the diagnostic code for the underlying
  validation category.
- Documented TypeScript root output: named roots no longer receive a
  self-referencing alias, while legacy IR keeps the document-name fallback.
- Hardened shared record-key, duplicate-field, nullable-field, reference, and
  root identity validation without adding format-specific IR nodes.
- Hardened Python V1 diagnostics with source locations and distinct failures for
  unsupported unions, defaults, decorators, inheritance, and references.
- Added Python recursive-reference, fixture, semantic round-trip, and
  cross-format route coverage without changing Core IR.
- Documented the shared root identity contract and deferred Python map support
  through the existing `SchemaRecordNode`.
- Clarified that Python Dataclass V1 supports only the generic forms `list[T]`
  and `Optional[T]`, and documented the future capability-driven roadmap from
  cross-language equivalence to maps, Literal/Enum, and general unions.

## 0.3.2 - 2026-08-18

### Packaging

- Republish the complete workspace as a fresh release artifact set after the
  `0.3.1` GitHub Release tarball integrity mismatch.
- Validate the generated package tarballs and clean SDK installation before
  publishing the release.

## 0.3.1 - 2026-08-18

### Rust enhancements

- Harden Rust semantic round trips and recursive reference handling with
  transparent `Box<T>` support.
- Add unit-only Rust enums through the shared literal/union Shape IR.
- Add string-keyed `HashMap`/`BTreeMap` parsing through the shared record Shape
  IR and deterministic fully qualified `HashMap` generation.
- Reject empty or duplicate unit-enum variants and non-canonical Rust imports;
  accept trailing commas in supported generic type arguments.
- Keep data-carrying enums, Serde attributes, aliases, and generics explicitly
  unsupported.

## 0.3.0 - 2026-08-17

This release introduces the first Rust data schema adapter boundary and
promotes it to a stable `0.3.0` release after Web integration validation.

### Highlights

- Add a restricted Rust struct parser for Shape IR and Constraint IR.
- Add a deterministic Rust generator for public structs.
- Support Rust primitive representation hints, optional/nullability mapping,
  arrays, references, definitions, and typed integer constraints.
- Register Rust as a builtin source and target format in the SDK.

### Boundaries

- Rust V1 intentionally excludes Serde attributes, enums, generics, maps,
  macros, traits, impls, and other unsupported Rust syntax. These boundaries
  are reported explicitly rather than approximated silently.
- Web integration validation has completed. Release-artifact package smoke
  remains part of the CI release workflow.

## 0.2.0

This release establishes the stable SDK boundary for deterministic,
registry-driven schema and data conversion across eight builtin format
families.

### Highlights

- Route all SDK conversions through the shared core pipeline with structured
  parse, transform, and generate evidence.
- Support Value IR, Shape IR, Constraint IR, transformer chains, artifacts,
  diagnostics, semantic notes, and semantic-loss reporting.
- Provide registry-driven format discovery, route planning, option metadata,
  custom parser/generator/transformer registration, and the
  `createConverter(registry)` facade.
- Preserve compatibility APIs and stable public result schemas while making
  ordinary conversion failures structured and safe for downstream consumers.
- Validate clean workspace builds, generated registries, third-party custom
  registries, and SDK package installation in CI.

### Compatibility

- Existing beta package names, route behavior, output structures, diagnostic
  codes, artifacts, notes, losses, and compatibility entry points remain
  supported for the 0.2 release line.

## 0.2.0-beta.9

This prerelease fixes clean-install workspace resolution for the registry build.

### Fixes

- Declare the core package as a root workspace development dependency so
  registry generation resolves correctly in CI and other clean checkouts.
- Keep the workspace lockfile aligned with the root build-script dependency.

## 0.2.0-beta.8

This prerelease fixes the CI and release validation order for clean workspace
checkouts.

### Fixes

- Build all workspace packages before registry discovery, tests, coverage, and
  release validation so package root exports are available in CI.
- Keep release artifact generation after the complete repository validation
  baseline.

## 0.2.0-beta.7

This prerelease hardens the public conversion boundary for downstream Web, CLI,
and custom registry consumers.

### Features and fixes

- Keep ordinary conversion failures structured across route planning,
  descriptor resolution, options adaptation, pipeline execution, and report
  analysis.
- Add transform-stage diagnostics, semantic notes, policy decisions, and
  transformer option discovery to the public contract.
- Add transformer-specific options through the advanced SDK request envelope,
  including custom registry fallback behavior.
- Complete the `createConverter(registry)` discovery facade for format support,
  route-scoped options, component options, and user-facing diagnostics.
- Preserve pipeline evidence when post-generation analysis or report wrapping
  fails.
- Add capability matrix validation and update the user-facing documentation.

## 0.2.0-beta.6

This prerelease adds the TOML Value format and hardens Value IR route
compatibility across JSON, YAML, CSV, and TOML.

### Features and fixes

- Add strict TOML Value IR parser and object-root generator packages.
- Add TOML SDK routes, capability summaries, option metadata, diagnostics, and
  public API snapshots.
- Harden shared Value IR validation against malformed documents, duplicate
  fields, invalid node kinds, and non-finite numbers.
- Preserve prototype-sensitive field names such as `__proto__` during Value
  conversion and generation.
- Add Value root-shape capabilities so statically incompatible routes are
  rejected during planning without implicit wrapping.

## 0.2.0-beta.5

This prerelease adds strict CSV value conversion and records the current
architecture assessment for downstream SDK integration.

### Features

- Add `@schema-transformation-toolkit/parser-csv` for strict header-based CSV
  input.
- Add `@schema-transformation-toolkit/generator-csv` for flat Value IR object
  arrays.
- Add CSV routes and option metadata to the SDK, including CSV conversion to
  JSON, YAML, TypeScript, JSON Schema, Zod, and OpenAPI where Shape IR is
  supported.
- Preserve string cell semantics, quoted fields, escaped quotes, embedded
  newlines, BOM handling, and deterministic LF output.

### Compatibility and safety

- Reject empty, duplicate, or inconsistent CSV headers and row widths with
  structured diagnostics.
- Reject nested CSV generator values and report number/boolean textification
  through semantic notes.
- Add CSV package boundaries, API snapshots, integration coverage, and
  architecture guidance for future SDK stabilization.

## 0.2.0-beta.4

This prerelease adds the strict JSON-compatible YAML parser and generator
pipeline and hardens its workspace and package boundaries.

### Features and fixes

- Add YAML Value IR and Shape IR conversion routes through the SDK.
- Refactor YAML parsing into profile validation, Value IR lowering, and shape
  inference stages.
- Reject duplicate Value IR fields instead of silently overwriting them during
  generation.
- Share Value IR conversion and validation helpers across JSON and YAML
  implementations.
- Fix clean-workspace TypeScript and API snapshot resolution for YAML packages.

## 0.2.0-beta.2

This prerelease adds a statically analyzed Zod 4 parser and expands the
cross-format schema semantics available through the shared IR.

### Features

- Add `@schema-transformation-toolkit/parser-zod` for TypeScript and
  JavaScript Zod 4 schema source.
- Support static Zod objects, collections, unions, references, recursive
  `z.lazy` schemas, constraints, string enums, descriptions, and defaults.
- Add Zod parser routes to JSON Schema, TypeScript, Zod, and OpenAPI through
  the SDK.

### Compatibility and safety

- Reject dynamic JavaScript, unsupported Zod constructs, invalid union arity,
  unsafe bindings, and non-lazy reference cycles with structured diagnostics.
- Preserve default output presence while reporting the input-presence caveat
  that cannot be represented by the current Shape IR.
- Render literal-only unions as JSON Schema/OpenAPI `enum` values.

## 0.2.0-beta.1

This prerelease fixes the SDK's ESM distribution boundary for OpenAPI YAML
support.

### Fixes

- Keep the CommonJS `yaml` runtime dependency external to the SDK ESM bundle.
- Declare `yaml` as a direct SDK runtime dependency so Node and strict ESM
  runtimes can resolve it normally.
- Add a package smoke guard against dynamic-require compatibility code in the
  published SDK entry point.

## 0.2.0-beta.0

This prerelease establishes the `schema-transformation-toolkit` package
identity and the public package layout for the unified SDK.

### Breaking changes

- Rename the npm scope from `@aio/*` to `@schema-transformation-toolkit/*`.
- Rename the primary consumer package from `@aio/sdk` to
  `@schema-transformation-toolkit/sdk`.
- Update workspace imports, package metadata, documentation, and public API
  snapshots to use the new package names.

### Packaging

- Make the workspace packages publishable under the new scope.
- Keep the unified SDK bundle as the recommended single-package consumer
  entry point.
- Add package-level smoke coverage for building and installing the SDK tarball
  with workspace dependencies resolved locally.

## 0.1.1-beta.3

This prerelease adds OpenAPI schema conversion to the shared conversion kernel
and SDK route surface.

### Features

- Add `@schema-transformation-toolkit/parser-openapi` for OpenAPI 3.0 and 3.1 schema documents.
- Add `@schema-transformation-toolkit/generator-openapi` for canonical OpenAPI 3.1.0 schema documents.
- Add SDK routes for OpenAPI input and output across the supported formats.
- Preserve supported constraints, local references, reusable definitions, and
  safe object-only `allOf` composition through the shared IR.
- Report unsupported OpenAPI keywords, references, and compositions through
  structured diagnostics instead of silently approximating them.

### Tests and documentation

- Add parser coverage for OpenAPI versions, YAML input, references,
  constraints, unsupported features, and composition boundaries.
- Add OpenAPI generator contract and SDK integration tests.
- Document the OpenAPI schema compatibility boundary and current limitations.

### Compatibility notes

- OpenAPI support is currently limited to schema documents; full API document
  processing for paths, operations, and request/response metadata remains
  deferred.
- OpenAPI generation always emits canonical version `3.1.0`.

## 0.1.1-beta.2

This patch release corrects the SDK format discovery contract for generator-only
targets.

### Fixes

- Add role-specific `listSourceFormatSupports()` and
  `listTargetFormatSupports()` APIs.
- Prevent generator-only formats such as Zod from appearing in source parser
  pickers when consumers build their UI from SDK discovery data.
- Clarify Web integration guidance for combined versus role-specific format
  catalogs.

## 0.1.1-beta.1

This is the first beta release of the shared conversion kernel and the Stage 1
`@schema-transformation-toolkit/sdk` consumer surface. The release is distributed as a tagged workspace
snapshot with package tarballs; npm publication remains deferred.

### Features

- Add `@schema-transformation-toolkit/generator-zod` for generating Zod 4 schemas from the shared Shape
  IR and Constraint IR.
- Support TypeScript and JavaScript ESM output, including `z.infer` types for
  TypeScript output.
- Support definitions, local references, recursive references, object
  policies, and the currently supported scalar, collection, union, and
  annotation semantics.
- Add SDK routes for `json -> zod`, `json-schema -> zod`, and
  `typescript -> zod`.
- Add structured diagnostics and semantic notes for unsupported or partially
  preserved target semantics.

### Tests

- Drive Zod generator contract tests from shared semantic fixtures.
- Add runtime validation tests for generated TypeScript and JavaScript modules
  using Zod 4.
- Add coverage for recursive schemas, constraints, SDK routes, capabilities,
  and public API contracts.

### Documentation

- Add Zod generator documentation and examples for JSON, JSON Schema,
  TypeScript, and recursive definitions.
- Document the TypeScript/JavaScript output distinction and current Zod 4
  compatibility boundary.

### Compatibility notes

- `@schema-transformation-toolkit/generator-zod` does not depend on or bundle Zod at runtime; generated
  code consumers must install Zod 4.
- Zod 3 compatibility, a Zod parser, transforms, custom validators,
  multi-file output, and cross-file resolution remain deferred.

### Descriptor and extension contracts

- Add versioned parser and generator descriptors with explicit registration
  validation and stable machine-readable registration errors.
- Add isolated custom parser/generator registries and generic custom generator
  output typing without changing the built-in conversion API.
- Add shared report-analysis hooks and descriptor contract test helpers.
- Freeze the Shape IR v0 parser extension boundary and document the required
  checklist for future format integrations.

## Release history

Release notes for tagged versions are maintained through the corresponding
GitHub Releases. Future release sections will be moved here from `Unreleased`
when versions are prepared.

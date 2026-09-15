# Temporary C# Support Roadmap

> Temporary implementation roadmap. This document is a working plan, not a
> durable development document. Delete it in the final C# cleanup PR after
> durable decisions and current status have been absorbed into `design.md`,
> `progress.md`, package READMEs, and `CHANGELOG.md` as appropriate.

## Objective

Add C# as a first-class source and target format through the existing adapter
boundary:

```text
C# parser → Shape IR → existing transformers/generators
existing parsers → Shape IR → C# generator
```

The initial adapter targets portable schema-oriented C# data models rather than
the full C# language. The MVP covers records, property-based classes, symbolic
enums, primitive types, nullability, arrays, common collections, string-keyed
maps where the existing IR permits them, named references, namespaces, and
deterministic modern C# generation.

The implementation must not add C#-specific concepts to Core IR unless a
cross-language semantic gap is demonstrated and a shared representation is
agreed upon.

## Before implementation: design freeze

Resolve these decisions before substantial parser/generator work begins:

- Canonical format identifier: `csharp`; do not add internal aliases.
- C# enum representation: reuse the existing named string literal-union
  semantics where exact symbolic values can be preserved.
- Nullability: `T?` lowers to nullable `T`; `T` remains non-null in the MVP.
  Nullable-context directives and runtime nullability behavior are outside the
  initial boundary unless implementation pressure requires a documented change.
- Requiredness and nullability remain distinct. `required` affects presence;
  `?` affects value nullability.
- The existing `SchemaRecordNode` represents
  `Dictionary<string, T>`, `IDictionary<string, T>`, and
  `IReadOnlyDictionary<string, T>`; non-string keys are unsupported.
- Namespace is parser/source metadata and a generator option, not shared IR.
- Multiple declarations require an explicit root/entry policy consistent with
  existing language adapters.
- Default generated records must preserve required/optional semantics. Prefer
  property-style records when positional records would make optional fields
  appear constructor-required.
- C#-specific details such as `set` versus `init`, collection mutability,
  numeric width, `decimal`, attributes, and framework behavior are reported as
  loss/notes or rejected; they are not silently added to Shape IR.

## PR plan

### PR 1 — C# generator foundation

**Goal:** establish an independent `@schema-transformation-toolkit/generator-csharp`
package and prove `Shape IR → deterministic C#` without SDK integration.

**Scope:**

- package scaffold, descriptor, public API, and README;
- registry manifest entry marked staged so it is validated as a package
  component but is not included in the SDK builtin registry until PR 5;
- scalar types, objects, arrays, nullable values, and named references;
- basic record rendering;
- explicit unsupported-node failures;
- deterministic declaration order, property order, whitespace, and line endings;
- focused generator unit tests.

**Exit criteria:** valid representative C# is generated from Shape IR; repeated
generation with identical IR/options is byte-stable; no Core IR or SDK route
changes are required.

### PR 2 — C# generator complete MVP

**Goal:** complete the target-side C# MVP and exercise it against existing IR
producers.

**Scope:**

- symbolic enum rendering;
- string-keyed map rendering where supported;
- common collection rendering and import calculation;
- `namespace` option;
- `style: "record" | "class"` option using shared generation logic;
- required property rendering for class/property-style output;
- semantic notes/losses for numeric width, decimal semantics, and collection
  representation where applicable;
- generator tests for options, imports, losses, and deterministic output;
- direct cross-language target fixtures at the package/core boundary where
  practical, without registering the format in the SDK yet.

**Exit criteria:** all generator MVP capabilities are covered by focused tests;
unsupported IR remains explicit; output does not depend on environment or
object iteration order.

### PR 3 — C# parser record MVP

**Goal:** establish an independent `@schema-transformation-toolkit/parser-csharp`
package for the smallest useful record-oriented source subset.

**Scope:**

- tokenizer and parser-local C# declaration model;
- file-scoped namespace and ordinary `using` declarations;
- records and record parameters;
- primitive types, nullable suffixes, arrays, supported collection generics,
  and named references;
- Shape IR mapping, `rootName`, and the agreed root/entry selection policy;
- valid-source, malformed-source, and reference-resolution tests;
- parser README and public API surface.

**Exit criteria:** representative C# records produce correct Shape IR,
including nested nullable/array/reference cases; parser syntax concerns remain
separate from IR mapping; no full C# grammar is introduced.

### PR 4 — Parser classes, enums, and diagnostics

**Goal:** finish the parser-side C# MVP with strict unsupported-syntax behavior.

**Scope:**

- property-based classes;
- `get; set;`, `get; init;`, and `required` handling according to the frozen
  presence/nullability contract;
- symbolic enums and enum references;
- structured diagnostics with source locations for invalid and unsupported
  syntax;
- explicit handling of methods, inheritance, interfaces, attributes, generic
  declarations, structs, record structs, tuples, delegates, events, indexers,
  `dynamic`, and other out-of-scope constructs;
- parser semantic notes/losses for intentionally widened source types;
- negative fixtures proving unsupported members are not silently discarded.

**Exit criteria:** records, classes, and basic enums are covered by success,
failure, and semantic-caveat tests; every unsupported MVP construct has a
stable diagnostic category and safe failure behavior.

### PR 5 — SDK and builtin registry integration

**Goal:** expose C# as a normal builtin source and target format through the
existing registry-driven SDK.

**Scope:**

- workspace dependencies for both C# packages;
- generated builtin registry registration;
- builtin format catalog and capability metadata;
- parse/generator option metadata and compatibility types where required;
- SDK public contract tests and API snapshots;
- route discovery and representative `source → csharp` and
  `csharp → target` conversions;
- package-boundary and generated-registry checks.

**Exit criteria:** callers can use `sourceFormat: "csharp"` and
`targetFormat: "csharp"`; routing uses the generic pipeline; no C#-specific
conversion branch is added to Core or SDK; public metadata matches actual
behavior.

### PR 6 — Cross-language verification and documentation

**Goal:** verify C# as a member of the shared IR ecosystem and document the
published boundary.

**Scope:**

- C# ↔ TypeScript;
- C# ↔ JSON Schema;
- C# ↔ Rust;
- C# ↔ Python;
- C# ↔ Go;
- C# ↔ Java;
- C# ↔ Kotlin where the current route supports the tested semantics;
- recursive references, maps, nested nullability, enums, and intentional
  semantic losses;
- normalized-IR/semantic-equivalence round-trip tests rather than textual
  source round trips;
- parser and generator README updates, main capability documentation,
  `progress.md`, and changelog updates;
- full packaging and clean-install validation.

**Exit criteria:** unexpected losses are classified as adapter defects, an
existing adapter defect, an IR limitation, or intentional loss; all supported
routes and documentation agree with the implementation.

## Core IR change gate

Do not expand Core IR merely because C# exposes a language-specific detail.
Open a separate Core PR only if all of the following hold:

1. the limitation affects at least two supported language families;
2. it represents portable schema semantics rather than C# syntax;
3. preserving it materially improves cross-language conversion; and
4. multiple targets can consume a well-defined representation.

Likely first-MVP outcomes for integer width, unsigned types, `decimal`,
collection mutability, `DateTime`, `Guid`, and attributes are explicit losses,
notes, or unsupported diagnostics—not new C#-specific IR nodes.

## Validation by stage

Each PR should run the smallest relevant checks before merge:

- package unit tests and typecheck for adapter work;
- parser/generator descriptor and contract tests;
- SDK API snapshots and boundary checks for PR 5;
- cross-language integration tests and package READMEs for PR 6.

Before the final merge, run the repository baseline from `standards.md`:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm check:public-api
pnpm format:check
pnpm build
git diff --check
```

Also run the explicit registry, boundary, third-party fixture, and SDK
tarball checks when the corresponding scripts are available in the workspace.

## Final cleanup

After PR 6 is accepted:

1. move durable architectural decisions into `docs/development/design.md`;
2. move current C# capability and intentional deferrals into
   `docs/development/progress.md`;
3. keep implementation and usage details in the C# package READMEs;
4. record the release-facing change in `CHANGELOG.md`;
5. delete this temporary roadmap document in a final cleanup commit/PR;
6. confirm `git diff --check`, repository status, generated registry state, and
   the release/package checks are clean.

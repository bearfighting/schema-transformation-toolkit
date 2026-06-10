# all-in-one-data-type-converter

A TypeScript-first workspace for building a schema IR, format parsers, and language generators for structured data conversion.

## Scope

This project is being designed around two related kinds of conversion:

1. Data format conversion
   Examples: `json -> yaml`, `yaml -> toml`
2. Structure definition conversion
   Examples: `TypeScript -> Java`, `class -> JSON Schema`, `JSON Schema -> TypeScript`

The shared core is a schema-oriented AST/IR.

- Raw input data can be parsed and inferred into the AST
- Schema-like inputs can also be mapped into the AST
- Generators consume the AST and emit target formats or target definitions
- Parsers and generators should implement shared core interfaces so new formats remain replaceable

## Current Direction

The current implementation is intentionally conservative:

- We prefer a stable inferable schema over aggressive guessing
- Valid input does not automatically mean a type definition can be generated
- If the input does not produce a stable schema under the current AST rules, the parser should report that explicitly

For JSON specifically, the current parser distinguishes between:

- invalid JSON
- valid JSON that can be inferred into the current AST
- valid JSON that is not inferable under AST v0

## AST v0 Principles

- `optional` means a field may be absent
- `nullable` means a field may be present with the value `null`
- `optional` and `nullable` are independent flags
- arrays must have a common inferable element type
- `integer` and `number` stay distinct unless mixed, in which case they normalize to `number`

## Extension Contracts

New parsers and generators should conform to shared interfaces from `@aio/core`:

```ts
interface SchemaParser<TInput = string> {
  format: string;
  parse(input: TInput, options?: { name?: string }): ParseResult;
}

interface SchemaGenerator<TOutput = string> {
  target: string;
  generate(document: SchemaDocument, options?: GenerateOptions): GenerateResult<TOutput>;
}
```

This keeps extension packages interchangeable:

- parsers convert input into IR or a structured failure
- generators convert IR into output or a structured failure
- IR remains the only required handoff between the two sides

## Design Boundary

The system is intended to keep parser, IR, and generator independent not only at the package level, but also at the decision-making level.

### Parser Responsibilities

Parsers should:

- understand the source format
- extract as much stable semantic information as possible
- report when the current IR cannot represent a case safely

Parsers should not make decisions based on how a specific target language might emit the result.

### IR Responsibilities

The IR should:

- represent cross-format, cross-language semantic facts
- preserve structure, presence rules, and uncertainty where possible
- avoid target-language-specific output preferences

The IR should not encode preferences such as `preferInterface`, `preferClass`, `emitSerdeRename`, or similar generator-specific output choices.

### Generator Responsibilities

Generators should:

- read IR plus generator configuration
- map semantic structure into a target language representation
- handle language-specific naming, keyword, and emission choices

Generators should not rely on parser-specific shortcuts or assume that upstream parsing was tailored to one output language.

### Design Rule Of Thumb

When deciding where a rule belongs:

- if it depends on source format details, it belongs in the parser
- if it is a cross-language semantic fact, it belongs in the IR
- if it depends on target language syntax or style, it belongs in the generator

This boundary is especially important for future work such as unresolved types, empty arrays, nullable-only samples, and target-specific choices like `interface` vs `type` vs `class`.

## Packages

- `@aio/core`: shared IR and core utilities
- `@aio/parser-json`: JSON to IR parsing
- `@aio/parser-yaml`: YAML to IR parsing
- `@aio/parser-toml`: TOML to IR parsing
- `@aio/generator-typescript`: IR to TypeScript generation
- `@aio/sdk`: optional aggregate package that re-exports core, parsers, and generators
- `@aio/cli`: command line entry point

## Package Strategy

The package layout is intended to support both low-level reuse and higher-level composition.

### 1. Core Package

`@aio/core` should remain independently usable.

It is the only package that defines:

- the shared schema IR
- parser and generator contracts
- core factories and guards
- cross-language utilities that are not tied to any single input or output format

`@aio/core` should not depend on any concrete parser or generator package.

This allows other projects to adopt the IR and contracts without bringing in JSON, YAML, TOML, or TypeScript support they do not need.

### 2. Parser And Generator Packages

Concrete implementations should live in their own packages and depend only on `@aio/core`.

Examples:

- `@aio/parser-json`
- `@aio/parser-yaml`
- `@aio/parser-toml`
- `@aio/generator-typescript`

These packages should be installable and usable independently. A consumer should be able to choose only the pieces they need:

```ts
import { jsonSchemaParser } from "@aio/parser-json";
import { typeScriptGenerator } from "@aio/generator-typescript";
```

Each package can export both:

- direct convenience functions such as `inferJsonDocument()` or `generateTypeScript()`
- contract-shaped instances such as `jsonSchemaParser` or `typeScriptGenerator`

This supports both simple usage and pluggable orchestration.

### 3. Optional Aggregation Package

The workspace can also expose an optional aggregate package such as `@aio/sdk`.

That package should:

- re-export common parser and generator packages
- provide convenient default wiring for users who want a batteries-included entry point

That package should not become a dependency of `@aio/core` or of individual parser/generator packages.

### Dependency Rules

To keep the system extensible, package dependencies should stay directional:

- `@aio/core` depends on no parser or generator package
- parser packages depend on `@aio/core`
- generator packages depend on `@aio/core`
- parser packages do not depend on generator packages
- generator packages do not depend on parser packages
- any future aggregate package may depend on both parser and generator packages

### Consumer Shapes

This structure supports three kinds of consumers:

1. Core-only consumers who want the IR and interfaces for their own implementations.
2. Selective consumers who install only specific parsers and generators.
3. Full-stack consumers who prefer a single aggregate package.

### Example Usage

Core only:

```ts
import type { SchemaDocument, SchemaGenerator, SchemaParser } from "@aio/core";
```

Selective imports:

```ts
import { jsonSchemaParser } from "@aio/parser-json";
import { typeScriptGenerator } from "@aio/generator-typescript";

const parsed = jsonSchemaParser.parse('{"user_id":1}', { name: "UserProfile" });

if (parsed.ok) {
  const generated = typeScriptGenerator.generate(parsed.document);
}
```

Aggregate imports:

```ts
import { jsonSchemaParser, typeScriptGenerator } from "@aio/sdk";
```

## Current Status

- `@aio/core` contains the first minimal AST
- `@aio/parser-json` supports AST v0 inference for the current supported JSON subset
- `@aio/parser-json` also reports unsupported-but-valid JSON cases with structured result codes
- `@aio/generator-typescript` supports the current AST v0 subset and naming/configuration experiments
- `@aio/parser-yaml` and `@aio/parser-toml` are still placeholders

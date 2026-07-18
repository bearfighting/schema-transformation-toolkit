# type-schema-converter

A TypeScript-first toolkit for parsing structured input into a shared schema IR and generating typed output from that IR.

## What It Is

This project is built around a simple boundary:

- parsers convert source input into IR
- generators convert IR into target output
- the IR is the only required handoff between the two

That separation is intended to make parsers and generators independently replaceable and easier to extend over time.

## Current Packages

- `@aio/core`: shared IR, contracts, and core result types
- `@aio/parser-json`: JSON to IR parsing and inference
- `@aio/parser-json-schema`: JSON Schema Draft 2020-12 parser for the current shared IR subset
- `@aio/parser-typescript`: TypeScript schema-subset parser for the shared IR
- `@aio/generator-json-schema`: IR to JSON Schema generation
- `@aio/generator-typescript`: IR to TypeScript generation
- `@aio/sdk`: optional aggregate re-export package

## Current Status

The current implementation is intentionally conservative.

- `@aio/parser-json` supports the currently implemented IR subset
- `@aio/parser-json-schema` supports a strict, generator-aligned JSON Schema Draft 2020-12 subset that fits the current IR without new core expansion
- `@aio/parser-typescript` supports a narrow, explicit TypeScript schema subset with structured failures for unsupported syntax
- `@aio/generator-json-schema` supports the currently implemented IR subset
- `@aio/generator-typescript` supports the currently implemented IR subset
- unsupported cases are reported through structured failures instead of silent guessing

## Current End-To-End Flows

The currently validated flows are:

- `json -> schema ir -> typescript`
- `json -> schema ir -> json-schema`
- `json-schema -> schema ir -> typescript`
- `json-schema -> schema ir -> json-schema`
- `typescript -> schema ir -> typescript`
- `typescript -> schema ir -> json-schema`

That does not mean every JSON sample or every TypeScript type is supported.
It means the current explicit subset is wired end to end and covered by tests.

For JSON Schema specifically, the `json-schema -> schema ir -> json-schema` path should be read as:

- semantic round-tripping for the current IR-aligned subset
- explicit non-goals for unsupported validation-heavy and document-system semantics

## Current Limits

This project currently supports explicit, documented subsets rather than full ecosystems.

- the JSON parser is not a universal schema inference engine for every possible sample
- the JSON Schema parser is not a full JSON Schema platform and intentionally fails for non-representable or validation-heavy schema semantics
- the TypeScript parser is not a full TypeScript front-end
- the JSON Schema generator is not yet a full JSON Schema platform with external `$ref`, draft switching, or multi-file output
- unsupported cases are expected to fail explicitly instead of being guessed silently

If you need the exact current boundary for one surface, prefer the package README and examples for that parser or generator over assuming broad language-level support.

## Installation

This workspace is still in active development, but the intended package usage looks like this:

```ts
import { jsonParser } from "@aio/parser-json";
import { tryGenerateJsonSchema } from "@aio/generator-json-schema";
import { tryGenerateTypeScript } from "@aio/generator-typescript";

const parsed = jsonParser.parse('{"user_id":1}', { name: "UserProfile" });

if (parsed.ok) {
  const schema = tryGenerateJsonSchema(parsed.document);
  const generated = tryGenerateTypeScript(parsed.document);

  if (schema.ok) {
    console.log(schema.output);
  }

  if (generated.ok) {
    console.log(generated.output);
  }
}
```

The convenience `generate...()` functions still exist and throw on generation failure.
The `tryGenerate...()` functions are often a better fit when you want structured diagnostics and explicit failure handling.

## Recommended Stage 1 API

For most users, the recommended entry point is now the Stage 1 pipeline API from `@aio/sdk`.

Use `@aio/sdk` when you want:

- one supported source format in
- one supported target format out
- route planning, diagnostics, losses, and preserved-capability reporting

```ts
import { convert } from "@aio/sdk";

const result = convert({
  sourceFormat: "json",
  targetFormat: "typescript",
  input: '{"id":1,"name":"Ada"}',
  name: "User",
});

if (!result.ok) {
  console.error(result.phase, result.code, result.message);
  console.error(result.diagnostics);
} else {
  console.log(result.output);
  console.log(result.plan);
  console.log(result.report);
}
```

The stable Stage 1 SDK runtime surface is intentionally small:

- `convert`
- `planConversion`
- `listConversionRoutes`
- `describeConversionRouteCapabilities`

The stable Stage 1 SDK option surface is also intentionally small:

- `sourceFormat`
- `targetFormat`
- `input`
- `name`
- `includeArtifacts`
- `advanced`

`advanced` exists for parser-specific or generator-specific overrides, but it is not the default path.

```ts
import { convert } from "@aio/sdk";

const result = convert({
  sourceFormat: "json",
  targetFormat: "json-schema",
  input: '[{"id":1},{"id":2}]',
  name: "UserList",
  advanced: {
    parser: {
      json: {
        inference: {
          tupleInferenceMode: "heterogeneous-only",
        },
      },
    },
    generator: {
      jsonSchema: {
        documentDialect: "2020-12",
      },
    },
  },
});
```

If you need direct parser control, direct generator control, or low-level IR contracts, prefer the lower-level packages instead:

- `@aio/parser-*`
- `@aio/generator-*`
- `@aio/core`

The SDK is meant to be the product-facing pipeline layer, not a re-export umbrella for the whole workspace.

## Documentation

### Start Here

- [README.md](README.md): project overview, package map, and current validated flows
- [docs/development/public-api-stage1.md](docs/development/public-api-stage1.md): current Stage 1 SDK boundary and public API policy
- [packages/core/README.md](packages/core/README.md): shared IR model, invariants, and cross-package semantic boundary
- [examples/README.md](examples/README.md): quick tour of current end-to-end examples

### By Flow

- [packages/parsers/json/README.md](packages/parsers/json/README.md): JSON parsing and inference
- [packages/parsers/json-schema/README.md](packages/parsers/json-schema/README.md): supported JSON Schema parsing
- [packages/parsers/typescript/README.md](packages/parsers/typescript/README.md): supported TypeScript schema-subset parsing
- [packages/generators/json-schema/README.md](packages/generators/json-schema/README.md): JSON Schema Draft 2020-12 generation
- [packages/generators/typescript/README.md](packages/generators/typescript/README.md): TypeScript generation
- [examples/json-to-typescript.md](examples/json-to-typescript.md): representative `json -> schema ir -> typescript` examples
- [examples/json-to-json-schema.md](examples/json-to-json-schema.md): representative `json -> schema ir -> json-schema` examples
- [examples/json-schema-to-typescript.md](examples/json-schema-to-typescript.md): representative `json-schema -> schema ir -> typescript` examples
- [examples/json-schema-to-json-schema.md](examples/json-schema-to-json-schema.md): representative `json-schema -> schema ir -> json-schema` examples
- [examples/typescript-to-json-schema.md](examples/typescript-to-json-schema.md): representative `typescript -> schema ir -> json-schema` examples

### Deep Dive

- [docs/development/README.md](docs/development/README.md): development-doc index and suggested reading order
- [docs/development/progress.md](docs/development/progress.md): unified current-state summary and completed milestone overview
- [docs/development/architecture-layering.md](docs/development/architecture-layering.md): IR layering and capability-aware orchestration direction
- [docs/development/ir-contract.md](docs/development/ir-contract.md): canonical shared IR contract
- [docs/development/capabilities-and-loss.md](docs/development/capabilities-and-loss.md): conversion-result truthfulness and semantic-loss contract
- [docs/development/json-schema-shape-gap.md](docs/development/json-schema-shape-gap.md): JSON Schema semantic gap inventory against the shared IR
- [docs/development/typescript-parser-cases.md](docs/development/typescript-parser-cases.md): TypeScript parser support and failure cases

## Development

```bash
pnpm install
pnpm format:check
pnpm lint
pnpm check:public-api
pnpm typecheck
pnpm test
pnpm build
```

CI currently runs on Node 24, and the workspace declares `node >=24`.

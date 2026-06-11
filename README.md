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
- `@aio/generator-typescript`: IR to TypeScript generation
- `@aio/sdk`: optional aggregate re-export package

## Current Status

The current implementation is intentionally conservative.

- `@aio/parser-json` supports the currently implemented IR subset
- `@aio/generator-typescript` supports the currently implemented IR subset
- unsupported cases are reported through structured failures instead of silent guessing

## Installation

This workspace is still in active development, but the intended package usage looks like this:

```ts
import { jsonSchemaParser } from "@aio/parser-json";
import { typeScriptGenerator } from "@aio/generator-typescript";

const parsed = jsonSchemaParser.parse('{"user_id":1}', { name: "UserProfile" });

if (parsed.ok) {
  const generated = typeScriptGenerator.generate(parsed.document);
  console.log(generated.output);
}
```

## Documentation

User-facing documentation:

- Root overview: [README.md](README.md)
- JSON parser usage: [packages/parser-json/README.md](packages/parser-json/README.md)
- TypeScript generator usage: [packages/generator-typescript/README.md](packages/generator-typescript/README.md)

Development documentation:

- Development index: [docs/development/README.md](docs/development/README.md)
- Current development notes: [docs/development/progress.md](docs/development/progress.md)
- IR v0 working cases: [docs/development/ir-v0-cases.md](docs/development/ir-v0-cases.md)

## Development

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

CI currently runs on Node 24, and the workspace declares `node >=24`.

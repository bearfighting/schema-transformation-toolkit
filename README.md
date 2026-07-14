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
- `@aio/parser-typescript`: TypeScript schema-subset parser for the shared IR
- `@aio/generator-typescript`: IR to TypeScript generation
- `@aio/sdk`: optional aggregate re-export package

## Current Status

The current implementation is intentionally conservative.

- `@aio/parser-json` supports the currently implemented IR subset
- `@aio/parser-typescript` supports a narrow, explicit TypeScript schema subset with structured failures for unsupported syntax
- `@aio/generator-typescript` supports the currently implemented IR subset
- unsupported cases are reported through structured failures instead of silent guessing

## Installation

This workspace is still in active development, but the intended package usage looks like this:

```ts
import { jsonParser } from "@aio/parser-json";
import { typeScriptGenerator } from "@aio/generator-typescript";

const parsed = jsonParser.parse('{"user_id":1}', { name: "UserProfile" });

if (parsed.ok) {
  const generated = typeScriptGenerator.generate(parsed.document);
  console.log(generated.output);
}
```

## Documentation

User-facing documentation:

- Root overview: [README.md](README.md)
- Core package overview and schema IR roadmap: [packages/core/README.md](packages/core/README.md)
- JSON parser usage: [packages/parsers/json/README.md](packages/parsers/json/README.md)
- TypeScript generator usage: [packages/generators/typescript/README.md](packages/generators/typescript/README.md)
- Examples: [examples/README.md](examples/README.md)

Development documentation:

- Development index: [docs/development/README.md](docs/development/README.md)
- Development scope: [docs/development/scope.md](docs/development/scope.md)
- Development workflow: [docs/development/workflow.md](docs/development/workflow.md)
- Acceptance criteria: [docs/development/acceptance.md](docs/development/acceptance.md)
- Design decisions: [docs/development/decisions.md](docs/development/decisions.md)
- Roadmap: [docs/development/roadmap.md](docs/development/roadmap.md)
- Progress: [docs/development/progress.md](docs/development/progress.md)
- IR working cases: [docs/development/ir-v0-cases.md](docs/development/ir-v0-cases.md)
- TypeScript parser cases: [docs/development/typescript-parser-v0-cases.md](docs/development/typescript-parser-v0-cases.md)

## Development

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

CI currently runs on Node 24, and the workspace declares `node >=24`.

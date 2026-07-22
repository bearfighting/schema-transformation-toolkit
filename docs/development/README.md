# Development Docs

This directory should stay small, durable, and easy to scan.

Use it in this order:

1. read [progress.md](progress.md) for the current repository state and next priority
2. read [test_plan.md](test_plan.md) only when you are changing tests or using tests to guard a refactor
3. open deeper reference notes only when you need a semantic boundary or design rule

## Start Here

- [progress.md](progress.md): the only repository-level status and prioritization page
- [scope.md](scope.md): project boundary and non-goals
- [workflow.md](workflow.md): default implementation and validation loop
- [acceptance.md](acceptance.md): definition of done

## Core Reference

- [architecture-layering.md](architecture-layering.md): package roles, IR layering, and planner direction
- [ir-boundaries.md](ir-boundaries.md): boundary between Value IR, Shape IR, and Constraint IR
- [ir-contract.md](ir-contract.md): shared result, diagnostic, and IR conventions
- [capabilities-and-loss.md](capabilities-and-loss.md): truthfulness, capability, and semantic-loss rules
- [schema-traversal.md](schema-traversal.md): implemented lightweight shared traversal for `Shape IR` and its design guardrails
- [decisions.md](decisions.md): durable design guardrails

## Specialized Reference

- [json-schema-shape-gap.md](json-schema-shape-gap.md): JSON Schema pressure against the current shared IR
- [typescript-parser-cases.md](typescript-parser-cases.md): supported and unsupported TypeScript parser cases
- [typescript-parser-preprocess.md](typescript-parser-preprocess.md): preprocess boundary for the TypeScript parser

## Maintenance Rules

- keep only one status page: `progress.md`
- keep only one test-strategy page: `test_plan.md`
- remove temporary planning documents after their outcomes are absorbed elsewhere
- prefer package `README`s for usage and package-local behavior

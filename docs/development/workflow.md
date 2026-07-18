# Development Workflow

## Default Loop

The default way to add a capability is:

1. clarify the target schema semantics
2. decide whether the capability belongs in parser logic, IR, generator logic, or some combination
3. add or update tests first
4. implement the smallest complete vertical slice
5. run validation
6. refactor if needed
7. update package docs and development docs

## Practical Rules

- make the IR explicit before adding parser or generator behavior that depends on it
- prefer one feature at a time over broad partially-finished changes
- keep unsupported cases explicit
- avoid half-support for features with unclear semantics
- preserve separation between parser responsibilities, IR responsibilities, and generator responsibilities

## Testing Sequence

For most features:

1. core tests for new IR shape or invariant
2. parser tests for successful and failing inference cases
3. generator tests for target output
4. integration tests for end-to-end flow

## Validation Commands

The standard validation pass is:

```bash
pnpm test
pnpm typecheck
```

For refactors that change public exports, package entry structure, or cross-package orchestration, the expected broader pass is:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm check:public-api
```

Run additional checks such as `pnpm build` when the change touches packaging or build-specific concerns.

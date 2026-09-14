# @schema-transformation-toolkit/parser-go

Parser for the single-file, schema-oriented subset of Go data-model declarations.

It supports exported struct fields, scalar types, slices, string-keyed maps,
pointers, JSON tags, named references, and recursive definitions. Pointers are
represented as nullable values; `omitempty` represents optional field presence.
This package does not execute Go or resolve packages, imports, generics,
methods, non-empty interfaces, aliases, or embedded-field promotion. The empty
interface and `any` are lowered to `unknown`.

The V1 boundary is single-file Shape IR only. Parser failures retain stable
codes and source-position evidence when the parser provides it; Constraint IR
is not produced by this adapter.

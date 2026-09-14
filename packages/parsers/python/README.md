# @schema-transformation-toolkit/parser-python

Parses the restricted Python 3.10+ dataclass type-shape subset into Shape IR.

The parser never executes Python. Defaults, runtime validation, serialization,
inheritance, user-defined generics, arbitrary generic types, and
framework-specific models are outside V1.

Supported annotations are `str`, `int`, `float`, `bool`, `list[T]`,
`dict[str, T]`, `Optional[T]`, `T | None`, and references to dataclasses or
restricted map aliases in the same source file. Multiple definitions require
the `entry` parse option. Direct and mutual recursive references are supported.
Quoted forward references are rejected in dataclass annotations, but accepted
inside restricted map aliases generated for forward or recursive references.

The supported generic forms are deliberately limited to `list[T]`,
`dict[str, T]`, and `Optional[T]`. Top-level aliases are limited to
`Name = dict[str, T]`. Other generic types are outside the Python Dataclass V1
boundary; this does not mean that every generic-looking annotation is
unsupported for the same reason.

The parser keeps required presence separate from nullability. Unsupported
types, defaults, decorators, inheritance, and unknown references return stable
structured failure codes with source-location evidence.

The specific failure codes are the public V1 taxonomy. The remaining generic
codes have narrow roles: `unsupported-python-feature` is reserved for
recognized but out-of-scope top-level or nested syntax, while
`unsupported-python-parser-v1` is a defensive fallback for an unexpected
parser failure. They are not substitutes for the specific type, union,
default, decorator, inheritance, or reference codes.

For nested nullable values, nullability remains inside the Shape node. For
example, `values: list[str | None]` is a required, non-nullable field whose
type is `array(union(string, null))`; it is not an optional field.

The document name identifies the schema document. When the source exposes a
root class name, the parser records it in shared Shape IR as `rootName`, so
generators can preserve the declaration name independently of document
identity. This is shared IR metadata, not Python-specific metadata.

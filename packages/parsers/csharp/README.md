# @schema-transformation-toolkit/parser-csharp

Independent PR3 C# Shape IR parser for a focused record-oriented data-model
subset. It supports positional and property-style records, primitive numeric
representations, nullable types, arrays, common list/map generics, namespaces,
ordinary using declarations, named references, recursion, and deterministic
root selection. Classes, enums, attributes, inheritance, generic declarations,
and other full-language constructs are intentionally unsupported.

Use `tryParseCSharp` for structured failures and `parseCSharp` as the throwing
convenience API. The package is staged and is not part of the SDK builtin
registry until the C# parser integration work is complete.

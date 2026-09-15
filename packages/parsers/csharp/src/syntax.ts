import {
  CSharpSyntaxError,
  type CSharpParserFailureCode,
  type CSharpPosition,
} from "./failure.js";

interface Token {
  text: string;
  position: CSharpPosition;
}
export interface CSharpTypeSyntax {
  kind: "name" | "array" | "generic";
  name?: string;
  element?: CSharpTypeSyntax;
  arguments?: CSharpTypeSyntax[];
  nullable: boolean;
  position: CSharpPosition;
}
export interface CSharpFieldSyntax {
  name: string;
  type: CSharpTypeSyntax;
  required: boolean;
  position: CSharpPosition;
}
export interface CSharpRecordSyntax {
  kind: "record";
  name: string;
  fields: CSharpFieldSyntax[];
  position: CSharpPosition;
  positional: boolean;
}
export interface CSharpClassSyntax {
  kind: "class";
  name: string;
  fields: CSharpFieldSyntax[];
  position: CSharpPosition;
}
export interface CSharpEnumSyntax {
  kind: "enum";
  name: string;
  members: string[];
  position: CSharpPosition;
}
export type CSharpDeclarationSyntax =
  CSharpRecordSyntax | CSharpClassSyntax | CSharpEnumSyntax;
export interface CSharpFileSyntax {
  declarations: CSharpDeclarationSyntax[];
}

const identifiers = /^@?[A-Za-z_][A-Za-z0-9_]*/u;
const csharpKeywords = new Set([
  "abstract",
  "as",
  "base",
  "bool",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "checked",
  "class",
  "const",
  "continue",
  "decimal",
  "default",
  "delegate",
  "do",
  "double",
  "else",
  "enum",
  "event",
  "explicit",
  "extern",
  "false",
  "finally",
  "fixed",
  "float",
  "for",
  "foreach",
  "goto",
  "if",
  "implicit",
  "in",
  "int",
  "interface",
  "internal",
  "is",
  "lock",
  "long",
  "namespace",
  "new",
  "null",
  "object",
  "operator",
  "out",
  "override",
  "params",
  "private",
  "protected",
  "public",
  "readonly",
  "ref",
  "return",
  "sbyte",
  "sealed",
  "short",
  "sizeof",
  "stackalloc",
  "static",
  "string",
  "struct",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "uint",
  "ulong",
  "unchecked",
  "unsafe",
  "ushort",
  "using",
  "virtual",
  "void",
  "volatile",
  "while",
  "add",
  "alias",
  "and",
  "ascending",
  "async",
  "await",
  "by",
  "descending",
  "dynamic",
  "equals",
  "file",
  "from",
  "get",
  "global",
  "group",
  "init",
  "into",
  "join",
  "let",
  "managed",
  "nameof",
  "not",
  "notnull",
  "on",
  "or",
  "orderby",
  "partial",
  "record",
  "remove",
  "required",
  "scoped",
  "select",
  "set",
  "unmanaged",
  "value",
  "var",
  "when",
  "where",
  "with",
  "yield",
]);

export function parseCSharpSyntax(source: string): CSharpFileSyntax {
  const tokens = tokenize(source);
  let index = 0;
  let namespaceSeen = false;
  let usingAllowed = true;
  const declarations: CSharpDeclarationSyntax[] = [];
  const peek = () => tokens[index];
  const take = () => tokens[index++];
  const fail = (
    code: CSharpParserFailureCode,
    message: string,
    token = peek(),
  ) => {
    throw new CSharpSyntaxError(code, message, token?.position);
  };
  const expect = (text: string) => {
    const token = take();
    if (!token || token.text !== text)
      fail("invalid-csharp-syntax", `Expected "${text}".`, token);
    return token;
  };
  const identifier = (
    context: string,
    options: { allowKeyword?: boolean } = {},
  ): string => {
    const token = take();
    if (!token || !identifiers.test(token.text))
      fail("invalid-csharp-syntax", `Expected ${context}.`, token);
    if (!token) throw new Error("unreachable");
    if (
      !token.text.startsWith("@") &&
      !options.allowKeyword &&
      csharpKeywords.has(token.text)
    )
      fail(
        "invalid-csharp-syntax",
        `C# keyword "${token.text}" must be escaped when used as ${context}.`,
        token,
      );
    return token.text.startsWith("@") ? token.text.slice(1) : token.text;
  };

  while (peek()) {
    if (peek()!.text === "[")
      fail(
        "unsupported-csharp-attribute",
        "Declaration attributes are not supported in PR4.",
      );
    if (peek()!.text === "using" || peek()!.text === "global") {
      if (namespaceSeen)
        fail(
          "invalid-csharp-syntax",
          "Using declarations must precede the file-scoped namespace.",
        );
      if (peek()!.text === "global") {
        fail(
          "unsupported-csharp-feature",
          "Global using declarations are not supported.",
        );
      }
      take();
      if (!usingAllowed)
        fail(
          "invalid-csharp-syntax",
          "Using declarations must precede declarations.",
        );
      if (peek()?.text === "static")
        fail(
          "unsupported-csharp-feature",
          "Static using declarations are not supported.",
        );
      identifier("a using namespace");
      while (peek()?.text === ".") {
        take();
        identifier("a using namespace segment");
      }
      if (peek()?.text === "=")
        fail("unsupported-csharp-feature", "Using aliases are not supported.");
      expect(";");
      continue;
    }
    if (peek()!.text === "namespace") {
      take();
      if (namespaceSeen)
        fail(
          "unsupported-csharp-namespace",
          "Multiple namespace declarations are not supported.",
        );
      if (!usingAllowed)
        fail(
          "invalid-csharp-syntax",
          "The file-scoped namespace must precede declarations.",
        );
      namespaceSeen = true;
      identifier("a namespace");
      while (peek()?.text === ".") {
        take();
        identifier("a namespace segment");
      }
      if (peek()?.text === "{")
        fail(
          "unsupported-csharp-namespace",
          "Block-scoped namespaces are not supported.",
        );
      expect(";");
      continue;
    }
    usingAllowed = false;
    const modifiers: string[] = [];
    while (
      [
        "public",
        "internal",
        "private",
        "protected",
        "sealed",
        "abstract",
        "partial",
        "static",
      ].includes(peek()?.text ?? "")
    )
      modifiers.push(take()!.text);
    if (new Set(modifiers).size !== modifiers.length)
      fail(
        "invalid-csharp-syntax",
        "C# record declaration modifiers cannot be repeated.",
      );
    if (
      peek()?.text !== "record" &&
      peek()?.text !== "class" &&
      peek()?.text !== "enum"
    ) {
      if (peek())
        fail(
          "unsupported-csharp-declaration",
          `C# declaration "${peek()!.text}" is not supported in PR4.`,
        );
      break;
    }
    const declarationKind = take()!;
    const start = declarationKind.position;
    if (modifiers.some((m) => !["public", "internal", "sealed"].includes(m)))
      fail(
        "unsupported-csharp-modifier",
        "Only public, internal, and sealed record or class modifiers are supported.",
      );
    if (declarationKind.text === "enum" && modifiers.includes("sealed"))
      fail(
        "unsupported-csharp-modifier",
        "Sealed enum declarations are not supported.",
      );
    if (declarationKind.text === "record" && peek()?.text === "struct")
      fail(
        "unsupported-csharp-declaration",
        "Record structs are not supported in PR4.",
      );
    const name = identifier("a record name");
    if (peek()?.text === "<")
      fail(
        "unsupported-csharp-feature",
        "Generic C# declarations are not supported in PR4.",
      );
    if (peek()?.text === ":")
      fail(
        declarationKind.text === "enum"
          ? "unsupported-csharp-enum"
          : "unsupported-csharp-inheritance",
        declarationKind.text === "enum"
          ? "Enum underlying types are not supported in PR4."
          : "Inheritance and interfaces are not supported in PR4.",
      );
    if (declarationKind.text === "enum") {
      declarations.push(parseEnum(name, start));
      continue;
    }
    if (declarationKind.text === "class") {
      if (peek()?.text === "(")
        fail(
          "unsupported-csharp-feature",
          "Class primary constructors are not supported in PR4.",
        );
      declarations.push({
        kind: "class",
        name,
        fields: parsePropertyBody(name),
        position: start,
      });
      continue;
    }
    let fields: CSharpFieldSyntax[];
    let positional = false;
    if (peek()?.text === ";") {
      fields = [];
    } else if (peek()?.text === "(") {
      positional = true;
      take();
      fields = parseParameterList();
      expect(")");
    } else fields = parsePropertyBody(name);
    if (peek()?.text === ";") take();
    declarations.push({
      kind: "record",
      name,
      fields,
      position: start,
      positional,
    });
  }
  return { declarations };

  function parseEnum(name: string, position: CSharpPosition): CSharpEnumSyntax {
    expect("{");
    const members: string[] = [];
    if (peek()?.text === "}")
      fail("empty-csharp-enum", `C# enum "${name}" must declare a member.`);
    while (peek()?.text !== "}") {
      if (peek()?.text === "[")
        fail(
          "unsupported-csharp-attribute",
          "Enum member attributes are not supported in PR4.",
        );
      const member = identifier("an enum member name");
      if (members.includes(member))
        fail(
          "duplicate-csharp-enum-member",
          `Duplicate C# enum member "${member}".`,
        );
      members.push(member);
      if (peek()?.text === "=")
        fail(
          "unsupported-csharp-enum-member",
          "Enum member assignments are not supported in PR4.",
        );
      if (peek()?.text === "(")
        fail(
          "unsupported-csharp-enum-member",
          "Enum member arguments are not supported in PR4.",
        );
      if (peek()?.text === "{")
        fail(
          "unsupported-csharp-enum-member",
          "Enum bodies are not supported in PR4.",
        );
      if (peek()?.text === ",") {
        take();
        continue;
      }
      if (peek()?.text === ";") {
        take();
        if (peek()?.text !== "}")
          fail(
            "unsupported-csharp-enum-member",
            "Enum bodies are not supported in PR4.",
          );
        break;
      }
      if (peek()?.text !== "}")
        fail(
          "invalid-csharp-syntax",
          "Expected comma or closing brace after an enum member.",
        );
    }
    expect("}");
    return { kind: "enum", name, members, position };
  }

  function parseParameterList(): CSharpFieldSyntax[] {
    const fields: CSharpFieldSyntax[] = [];
    while (peek()?.text !== ")") {
      const position = peek()!.position;
      const type = parseType();
      const name = identifier("a record parameter name");
      fields.push({ name, type, required: true, position });
      if (peek()?.text !== ",") break;
      take();
    }
    return fields;
  }
  function parsePropertyBody(ownerName: string): CSharpFieldSyntax[] {
    expect("{");
    const fields: CSharpFieldSyntax[] = [];
    while (peek()?.text !== "}") {
      const position = peek()?.position ?? { offset: 0, line: 1, column: 1 };
      let required = false;
      if (peek()?.text === "[")
        fail(
          "unsupported-csharp-attribute",
          "Property attributes are not supported in PR4.",
        );
      if (peek()?.text === "public") take();
      else if (
        peek()?.text === "private" ||
        peek()?.text === "protected" ||
        peek()?.text === "internal"
      ) {
        const accessibility = take()!.text;
        if (peek()?.text === ownerName || peek()?.text === "this")
          fail(
            "unsupported-csharp-member",
            `Non-public ${accessibility} constructors and indexers are not supported in PR4.`,
          );
        fail(
          "unsupported-csharp-property",
          "Only public automatic properties are supported.",
        );
      } else
        fail(
          "unsupported-csharp-property",
          "Only public automatic properties are supported.",
        );
      if (peek()?.text === "required") {
        required = true;
        take();
      }
      if (peek()?.text === ownerName || peek()?.text === "this")
        fail(
          "unsupported-csharp-member",
          "Constructors and indexers are not supported in PR4.",
        );
      const type = parseType();
      if (peek()?.text === "this")
        fail(
          "unsupported-csharp-member",
          "Constructors and indexers are not supported in PR4.",
        );
      const name = identifier("a property name");
      if (peek()?.text === "(" || peek()?.text === ";" || peek()?.text === "=")
        fail(
          "unsupported-csharp-member",
          "Methods and fields with initializers are not supported in PR4.",
        );
      expect("{");
      expect("get");
      expect(";");
      if (peek()?.text !== "init" && peek()?.text !== "set")
        fail(
          "unsupported-csharp-property",
          "Only get/init and get/set properties are supported.",
        );
      take();
      expect(";");
      expect("}");
      fields.push({ name, type, required, position });
    }
    expect("}");
    return fields;
  }
  function parseType(): CSharpTypeSyntax {
    const position = peek()?.position ?? { offset: 0, line: 1, column: 1 };
    const name = identifier("a type name", { allowKeyword: true });
    let type: CSharpTypeSyntax;
    if (peek()?.text === "<") {
      take();
      const args: CSharpTypeSyntax[] = [];
      while (peek()?.text !== ">") {
        args.push(parseType());
        if (peek()?.text !== ",") break;
        take();
      }
      expect(">");
      type = {
        kind: "generic",
        name,
        arguments: args,
        nullable: false,
        position,
      };
    } else type = { kind: "name", name, nullable: false, position };
    if (peek()?.text === "?") {
      take();
      type.nullable = true;
    }
    while (peek()?.text === "[") {
      take();
      if (peek()?.text !== "]")
        fail(
          "unsupported-csharp-type",
          "Only single-dimensional arrays are supported.",
        );
      take();
      type = { kind: "array", element: type, nullable: false, position };
      if (peek()?.text === "?") {
        take();
        type.nullable = true;
      }
    }
    return type;
  }
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let offset = 0;
  let line = 1;
  let column = 1;
  const advance = (text: string) => {
    for (const char of text) {
      if (char === "\n") {
        line++;
        column = 1;
      } else column++;
    }
    offset += text.length;
  };
  while (offset < source.length) {
    const position = { offset, line, column };
    const rest = source.slice(offset);
    const whitespace = rest.match(/^\s+/u);
    if (whitespace) {
      advance(whitespace[0]);
      continue;
    }
    const comment = rest.match(/^\/\/[^\n]*|^\/\*[\s\S]*?\*\//u);
    if (comment) {
      advance(comment[0]);
      continue;
    }
    const literal = rest.match(/^(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/u);
    if (literal) {
      tokens.push({ text: literal[0], position });
      advance(literal[0]);
      continue;
    }
    const identifierMatch = rest.match(identifiers);
    if (identifierMatch) {
      tokens.push({ text: identifierMatch[0], position });
      advance(identifierMatch[0]);
      continue;
    }
    const number = rest.match(/^\d+(?:\.\d+)?/u);
    if (number) {
      tokens.push({ text: number[0], position });
      advance(number[0]);
      continue;
    }
    const punctuation = rest[0]!;
    if ("{}()[],;<>?.=:".includes(punctuation)) {
      tokens.push({ text: punctuation, position });
      advance(punctuation);
      continue;
    }
    throw new CSharpSyntaxError(
      "invalid-csharp-syntax",
      `Unexpected C# character "${punctuation}".`,
      position,
    );
  }
  return tokens;
}

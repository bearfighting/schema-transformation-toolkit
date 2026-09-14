import { PythonSyntaxError } from "./failure.js";

export interface PythonPosition {
  offset: number;
  line: number;
  column: number;
}
export interface PythonFieldSyntax {
  name: string;
  annotation: string;
  position: PythonPosition;
}
export interface PythonClassSyntax {
  name: string;
  dataclass: boolean;
  fields: PythonFieldSyntax[];
  position: PythonPosition;
}
export interface PythonAliasSyntax {
  name: string;
  annotation: string;
  position: PythonPosition;
}
export interface PythonFileSyntax {
  classes: PythonClassSyntax[];
  aliases: PythonAliasSyntax[];
}

export function parsePythonSyntax(source: string): PythonFileSyntax {
  const classes: PythonClassSyntax[] = [];
  const aliases: PythonAliasSyntax[] = [];
  const lines = source.split(/\n/u);
  let offset = 0;
  let pendingDataclass = false;
  let active: PythonClassSyntax | undefined;
  let classIndent = -1;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const raw = lines[lineIndex] ?? "";
    const line = raw.replace(/#.*$/u, "");
    const trimmed = line.trim();
    const indent = line.length - line.trimStart().length;
    const position = { offset, line: lineIndex + 1, column: indent + 1 };
    if (!trimmed) {
      offset += raw.length + 1;
      continue;
    }
    if (
      indent !== 0 &&
      (trimmed.startsWith("import ") || trimmed.startsWith("from "))
    ) {
      throw new PythonSyntaxError(
        "unsupported-python-feature",
        "Nested imports are not supported in Python V1.",
        position,
      );
    }
    if (
      indent === 0 &&
      (trimmed.startsWith("import ") || trimmed.startsWith("from "))
    ) {
      if (pendingDataclass)
        throw new PythonSyntaxError(
          "invalid-python-syntax",
          "A @dataclass decorator must be immediately followed by a class.",
          position,
        );
      offset += raw.length + 1;
      continue;
    }
    if (trimmed === "@dataclass") {
      if (indent !== 0)
        throw new PythonSyntaxError(
          "unsupported-python-feature",
          "Nested dataclass decorators are not supported in Python V1.",
          position,
        );
      pendingDataclass = true;
      offset += raw.length + 1;
      continue;
    }
    if (trimmed.startsWith("@"))
      throw new PythonSyntaxError(
        "unsupported-python-decorator",
        `Python decorator "${trimmed}" is not supported in V1.`,
        position,
      );
    const aliasMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/u);
    if (aliasMatch && indent === 0 && /^dict\s*\[/u.test(aliasMatch[2]!)) {
      if (pendingDataclass)
        throw new PythonSyntaxError(
          "invalid-python-syntax",
          "A @dataclass decorator must be immediately followed by a class.",
          position,
        );
      if (
        classes.some((item) => item.name === aliasMatch[1]) ||
        aliases.some((item) => item.name === aliasMatch[1])
      )
        throw new PythonSyntaxError(
          "duplicate-python-definition",
          `Duplicate Python definition "${aliasMatch[1]}".`,
          position,
        );
      assertPythonIdentifier(aliasMatch[1]!, position, "alias");
      aliases.push({
        name: aliasMatch[1]!,
        annotation: aliasMatch[2]!.trim(),
        position,
      });
      active = undefined;
      classIndent = -1;
      offset += raw.length + 1;
      continue;
    }
    const classMatch = trimmed.match(
      /^class\s+([A-Za-z_][A-Za-z0-9_]*)(.*):$/u,
    );
    if (classMatch) {
      if (indent !== 0)
        throw new PythonSyntaxError(
          "unsupported-python-feature",
          "Nested lexical classes are not supported in Python V1.",
          position,
        );
      if (!pendingDataclass) {
        active = undefined;
        classIndent = -1;
        offset += raw.length + 1;
        continue;
      }
      if (classMatch[2]?.trim())
        throw new PythonSyntaxError(
          "unsupported-python-inheritance",
          "Python dataclass inheritance and generics are not supported in V1.",
          position,
        );
      if (
        classes.some((item) => item.name === classMatch[1]) ||
        aliases.some((item) => item.name === classMatch[1])
      )
        throw new PythonSyntaxError(
          "duplicate-python-definition",
          `Duplicate Python dataclass "${classMatch[1]}".`,
          position,
        );
      assertPythonIdentifier(classMatch[1]!, position, "class");
      active = { name: classMatch[1]!, dataclass: true, fields: [], position };
      classes.push(active);
      classIndent = indent;
      pendingDataclass = false;
      offset += raw.length + 1;
      continue;
    }
    if (!active) {
      throw new PythonSyntaxError(
        indent === 0 ? "unsupported-python-feature" : "invalid-python-syntax",
        indent === 0
          ? `Unsupported top-level Python syntax "${trimmed}".`
          : "Unexpected indented Python syntax outside a class body.",
        position,
      );
    }
    if (indent <= classIndent)
      throw new PythonSyntaxError(
        /^([A-Za-z_][A-Za-z0-9_]*)\s*:/u.test(trimmed)
          ? "invalid-python-syntax"
          : "unsupported-python-feature",
        /^([A-Za-z_][A-Za-z0-9_]*)\s*:/u.test(trimmed)
          ? "Python dataclass fields must be indented inside the class body."
          : `Unsupported top-level Python syntax "${trimmed}".`,
        position,
      );
    if (trimmed === "pass") {
      offset += raw.length + 1;
      continue;
    }
    const fieldMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/u);
    if (!fieldMatch)
      throw new PythonSyntaxError(
        "invalid-python-syntax",
        `Unsupported Python class body syntax "${trimmed}".`,
        position,
      );
    if (fieldMatch[2]!.includes("="))
      throw new PythonSyntaxError(
        "unsupported-python-default",
        "Python dataclass defaults and field(...) are not supported in V1.",
        position,
      );
    if (active.fields.some((field) => field.name === fieldMatch[1]))
      throw new PythonSyntaxError(
        "invalid-python-data-model",
        `Duplicate field "${fieldMatch[1]}" in dataclass "${active.name}".`,
        position,
      );
    assertPythonIdentifier(fieldMatch[1]!, position, "field");
    active.fields.push({
      name: fieldMatch[1]!,
      annotation: fieldMatch[2]!.trim(),
      position,
    });
    offset += raw.length + 1;
  }
  if (pendingDataclass)
    throw new PythonSyntaxError(
      "invalid-python-syntax",
      "Expected a class after @dataclass.",
      { offset: source.length, line: lines.length, column: 1 },
    );
  return { classes, aliases };
}

function assertPythonIdentifier(
  name: string,
  position: PythonPosition,
  kind: "class" | "field" | "alias",
): void {
  if (PYTHON_KEYWORDS.has(name))
    throw new PythonSyntaxError(
      "invalid-python-syntax",
      `Python ${kind} name "${name}" is a reserved keyword.`,
      position,
    );
}

const PYTHON_KEYWORDS = new Set([
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "case",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "False",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "match",
  "None",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "True",
  "try",
  "type",
  "while",
  "with",
  "yield",
]);

export interface PythonTypeSyntax {
  kind: "name" | "generic" | "union";
  name?: string;
  arguments?: PythonTypeSyntax[];
  members?: PythonTypeSyntax[];
}

export function parsePythonType(
  source: string,
  options: { allowQuoted?: boolean } = {},
): PythonTypeSyntax {
  const tokens =
    source.match(/[A-Za-z_][A-Za-z0-9_]*|"[^"\n]*"|(?:\[|\]|,|\|)/gu) ?? [];
  if (tokens.join("").replace(/\s+/gu, "") !== source.replace(/\s+/gu, ""))
    throw new PythonSyntaxError(
      "invalid-python-syntax",
      `Invalid Python type annotation "${source}".`,
    );
  let index = 0;
  const peek = () => tokens[index];
  const take = () => tokens[index++];
  function atom(): PythonTypeSyntax {
    const name = take();
    if (name?.startsWith('"') && name.endsWith('"')) {
      if (!options.allowQuoted)
        throw new PythonSyntaxError(
          "invalid-python-syntax",
          `Quoted Python type references are not supported in "${source}".`,
        );
      return parsePythonType(name.slice(1, -1), options);
    }
    if (!name || !/^[A-Za-z_]/u.test(name))
      throw new PythonSyntaxError(
        "invalid-python-syntax",
        `Expected a Python type in "${source}".`,
      );
    if (peek() !== "[") return { kind: "name", name };
    take();
    const arguments_: PythonTypeSyntax[] = [];
    while (peek() !== "]") {
      arguments_.push(union());
      if (peek() === ",") take();
      else break;
    }
    if (take() !== "]" || arguments_.length === 0)
      throw new PythonSyntaxError(
        "invalid-python-syntax",
        `Invalid generic Python type "${source}".`,
      );
    return { kind: "generic", name, arguments: arguments_ };
  }
  function union(): PythonTypeSyntax {
    const members = [atom()];
    while (peek() === "|") {
      take();
      members.push(atom());
    }
    return members.length === 1 ? members[0]! : { kind: "union", members };
  }
  const result = union();
  if (index !== tokens.length)
    throw new PythonSyntaxError(
      "invalid-python-syntax",
      `Unexpected Python type syntax in "${source}".`,
    );
  return result;
}

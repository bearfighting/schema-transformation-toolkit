import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const repoRoot = process.cwd();

const packageConfigs = [
  {
    name: "@aio/core",
    category: "core",
    root: path.join(repoRoot, "packages/core"),
  },
  {
    name: "@aio/sdk",
    category: "sdk",
    root: path.join(repoRoot, "packages/sdk"),
  },
  {
    name: "@aio/parser-json",
    category: "parser",
    root: path.join(repoRoot, "packages/parsers/json"),
  },
  {
    name: "@aio/parser-json-schema",
    category: "parser",
    root: path.join(repoRoot, "packages/parsers/json-schema"),
  },
  {
    name: "@aio/parser-typescript",
    category: "parser",
    root: path.join(repoRoot, "packages/parsers/typescript"),
  },
  {
    name: "@aio/generator-json-schema",
    category: "generator",
    root: path.join(repoRoot, "packages/generators/json-schema"),
  },
  {
    name: "@aio/generator-typescript",
    category: "generator",
    root: path.join(repoRoot, "packages/generators/typescript"),
  },
];

const packageByName = new Map(packageConfigs.map((pkg) => [pkg.name, pkg]));

const violations = [];

for (const pkg of packageConfigs) {
  for (const filePath of walkTypeScriptFiles(path.join(pkg.root, "src"))) {
    checkFile(pkg, filePath);
  }
}

if (violations.length > 0) {
  console.error("Package boundary violations found:\n");

  for (const violation of violations) {
    console.error(`- ${violation}`);
  }

  process.exitCode = 1;
} else {
  console.log("Package boundary checks passed.");
}

function walkTypeScriptFiles(dirPath) {
  const filePaths = [];

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      filePaths.push(...walkTypeScriptFiles(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".ts")) {
      filePaths.push(entryPath);
    }
  }

  return filePaths;
}

function checkFile(pkg, filePath) {
  const sourceText = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  visitNode(sourceFile, (specifier, node) => {
    if (specifier.startsWith("@aio/")) {
      checkWorkspaceSpecifier(pkg, filePath, specifier);
      return;
    }

    if (specifier.startsWith(".")) {
      checkRelativeSpecifier(pkg, filePath, specifier, node);
    }
  });
}

function visitNode(node, onSpecifier) {
  if (
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier &&
    ts.isStringLiteral(node.moduleSpecifier)
  ) {
    onSpecifier(node.moduleSpecifier.text, node);
  }

  if (
    ts.isImportTypeNode(node) &&
    ts.isLiteralTypeNode(node.argument) &&
    ts.isStringLiteral(node.argument.literal)
  ) {
    onSpecifier(node.argument.literal.text, node);
  }

  ts.forEachChild(node, (child) => visitNode(child, onSpecifier));
}

function checkWorkspaceSpecifier(pkg, filePath, specifier) {
  if (specifier.includes("/src/") || specifier.includes("/dist/")) {
    violations.push(
      `${relative(filePath)} imports deep workspace path "${specifier}". Public packages must import package roots only.`,
    );
    return;
  }

  const packageName = getWorkspacePackageName(specifier);
  const dependency = packageByName.get(packageName);

  if (!dependency) {
    violations.push(
      `${relative(filePath)} imports unknown workspace package "${specifier}".`,
    );
    return;
  }

  const allowedDependencies = getAllowedDependencies(pkg);

  if (!allowedDependencies.has(packageName)) {
    violations.push(
      `${relative(filePath)} imports "${specifier}", but ${pkg.name} may only depend on ${
        [...allowedDependencies].join(", ") || "no workspace packages"
      }.`,
    );
  }
}

function checkRelativeSpecifier(pkg, filePath, specifier, node) {
  const resolvedPath = resolveRelativeModule(filePath, specifier);

  if (resolvedPath === null) {
    violations.push(
      `${relative(filePath)} imports "${specifier}" but the target could not be resolved.`,
    );
    return;
  }

  if (!isWithinDirectory(resolvedPath, pkg.root)) {
    violations.push(
      `${relative(filePath)} imports "${specifier}" which resolves outside ${relative(pkg.root)}.`,
    );
  }

  if (
    ts.isImportDeclaration(node) &&
    ts.isStringLiteral(node.moduleSpecifier) &&
    node.moduleSpecifier.text.includes("/src/")
  ) {
    violations.push(
      `${relative(filePath)} imports relative path "${specifier}" containing /src/, which is treated as an internal-only path shape.`,
    );
  }
}

function resolveRelativeModule(filePath, specifier) {
  const basePath = path.resolve(path.dirname(filePath), specifier);
  const extensionlessBasePath = stripJavaScriptExtension(basePath);
  const candidates = [
    basePath,
    extensionlessBasePath,
    `${basePath}.ts`,
    `${extensionlessBasePath}.ts`,
    `${basePath}.mts`,
    `${extensionlessBasePath}.mts`,
    `${basePath}.cts`,
    `${extensionlessBasePath}.cts`,
    `${basePath}.js`,
    `${basePath}.mjs`,
    `${basePath}.cjs`,
    path.join(basePath, "index.ts"),
    path.join(extensionlessBasePath, "index.ts"),
    path.join(basePath, "index.js"),
    path.join(extensionlessBasePath, "index.js"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function stripJavaScriptExtension(filePath) {
  if (
    filePath.endsWith(".js") ||
    filePath.endsWith(".mjs") ||
    filePath.endsWith(".cjs")
  ) {
    return filePath.slice(0, filePath.lastIndexOf("."));
  }

  return filePath;
}

function getWorkspacePackageName(specifier) {
  const segments = specifier.split("/");

  return segments.length >= 2 ? `${segments[0]}/${segments[1]}` : specifier;
}

function getAllowedDependencies(pkg) {
  if (pkg.category === "core") {
    return new Set();
  }

  if (pkg.category === "parser" || pkg.category === "generator") {
    return new Set(["@aio/core"]);
  }

  return new Set([
    "@aio/core",
    "@aio/parser-json",
    "@aio/parser-json-schema",
    "@aio/parser-typescript",
    "@aio/generator-json-schema",
    "@aio/generator-typescript",
  ]);
}

function isWithinDirectory(targetPath, directoryPath) {
  const relativePath = path.relative(directoryPath, targetPath);

  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

function relative(targetPath) {
  return path.relative(repoRoot, targetPath).replaceAll(path.sep, "/");
}

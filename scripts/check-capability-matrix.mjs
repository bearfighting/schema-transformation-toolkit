import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const formatsSource = fs.readFileSync(
  path.join(root, "packages/sdk/src/builtin-formats.ts"),
  "utf8",
);
const matrix = fs.readFileSync(
  path.join(root, "docs/capability-matrix.md"),
  "utf8",
);

const sourceFormats = formatsForProperty("source");
const targetFormats = formatsForProperty("target");
const formats = [...new Set([...sourceFormats, ...targetFormats])];
const missingSource = sourceFormats.filter((format) => !hasMatrixRow(format));
const missingTarget = targetFormats.filter((format) => !hasMatrixRow(format));

if (missingSource.length > 0 || missingTarget.length > 0) {
  console.error(
    [
      missingSource.length > 0
        ? `source rows: ${missingSource.join(", ")}`
        : "",
      missingTarget.length > 0
        ? `target rows: ${missingTarget.join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("; "),
  );
  process.exit(1);
}

for (const heading of [
  "## Format capabilities",
  "## Builtin route families",
  "## Failure categories",
]) {
  if (!matrix.includes(heading)) {
    console.error(`Capability matrix is missing section: ${heading}`);
    process.exit(1);
  }
}

console.log(
  `Capability matrix covers ${formats.length} builtin formats (${sourceFormats.length} sources, ${targetFormats.length} targets).`,
);

function formatsForProperty(property) {
  return [
    ...formatsSource.matchAll(
      new RegExp(
        `^\\s*(?:"([a-z][a-z-]*)"|([a-z][a-z-]*)):\\s*\\{([^}]*)\\}`,
        "gm",
      ),
    ),
  ]
    .filter((match) => new RegExp(`\\b${property}:\\s*true\\b`).test(match[3]))
    .map((match) => match[1] ?? match[2]);
}

function hasMatrixRow(format) {
  const labels =
    format === "csharp" ? ["csharp", "C#"] : [format.replaceAll("-", " ")];
  return new RegExp(
    `^\\|\\s*(?:${labels.map(escapeRegExp).join("|")})\\s*\\|`,
    "mi",
  ).test(matrix);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

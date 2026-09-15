export const BUILTIN_FORMAT_CATALOG = {
  json: { source: true, target: true },
  csv: { source: true, target: true },
  "json-schema": { source: true, target: true },
  typescript: { source: true, target: true },
  openapi: { source: true, target: true },
  zod: { source: true, target: true },
  yaml: { source: true, target: true },
  toml: { source: true, target: true },
  rust: { source: true, target: true },
  python: { source: true, target: true },
  go: { source: true, target: true },
  java: { source: true, target: true },
  kotlin: { source: true, target: true },
  csharp: { source: true, target: true },
} as const;

type BuiltinFormat = keyof typeof BUILTIN_FORMAT_CATALOG;
type NonEmptyFormatList = readonly [BuiltinFormat, ...BuiltinFormat[]];

const builtinFormats = Object.keys(BUILTIN_FORMAT_CATALOG) as BuiltinFormat[];

export const BUILTIN_SOURCE_FORMATS = builtinFormats.filter(
  (format) => BUILTIN_FORMAT_CATALOG[format].source,
) as unknown as NonEmptyFormatList;

export const BUILTIN_TARGET_FORMATS = builtinFormats.filter(
  (format) => BUILTIN_FORMAT_CATALOG[format].target,
) as unknown as NonEmptyFormatList;

export type BuiltinSourceFormat = (typeof BUILTIN_SOURCE_FORMATS)[number];
export type BuiltinTargetFormat = (typeof BUILTIN_TARGET_FORMATS)[number];

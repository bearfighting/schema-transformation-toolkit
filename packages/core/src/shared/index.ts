export {
  capitalizeWord,
  createNamingStrategy,
  getRenderableWords,
  normalizeIdentifier,
  renderIdentifierName,
  toCamelCase,
  toPascalCase,
  toSnakeCase,
} from "./naming.js";
export {
  createSchemaObservation,
  pushSchemaObservation,
} from "./observations.js";

export type {
  NamingStrategy,
  NamingStrategyOptions,
  NamingStyle,
  RenderIdentifierOptions,
} from "./naming.js";
export type {
  SchemaObservationOptions,
  SchemaObservationPair,
} from "./observations.js";

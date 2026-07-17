import type { ConstraintDocument } from "../constraint/types.js";
import type { ShapeDocument } from "../shape/index.js";
import type { ValueDocument } from "../value/types.js";
import type { IrModel } from "./types.js";

export function irModel(
  name: string,
  options: {
    value?: ValueDocument;
    shape?: ShapeDocument;
    constraints?: ConstraintDocument;
  } = {},
): IrModel {
  return {
    name,
    ...options,
  };
}

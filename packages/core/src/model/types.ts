import type { ConstraintDocument } from "../constraint/types.js";
import type { ShapeDocument } from "../shape/index.js";
import type { ValueDocument } from "../value/types.js";

export interface IrModel {
  name: string;
  value?: ValueDocument;
  shape?: ShapeDocument;
  constraints?: ConstraintDocument;
}

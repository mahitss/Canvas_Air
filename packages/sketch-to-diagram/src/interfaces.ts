import { SketchRawInput, SemanticRepresentation, ClassificationResult, RelationshipGraph } from "./domain";

export interface ISketchParser {
  parse(input: SketchRawInput): SemanticRepresentation;
}

export interface IDiagramClassifier {
  classify(representation: SemanticRepresentation): Promise<ClassificationResult>;
}

export interface IRelationshipEngine {
  analyze(representation: SemanticRepresentation): RelationshipGraph;
}

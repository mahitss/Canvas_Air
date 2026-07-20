import { SketchParser } from "../parser/sketch_parser";
import { RelationshipEngine } from "../semantic/relationship_engine";
import { DiagramClassifier } from "../recognition/classifier";
import { DiagramGenerator, EditableDiagram } from "../generation/diagram_generator";
import { SketchRawInput } from "../domain";

export class DiagramIntegrationManager {
  private parser = new SketchParser();
  private relationshipEngine = new RelationshipEngine();
  private classifier = new DiagramClassifier();
  private generator = new DiagramGenerator();

  /**
   * Orchestrates multi-modal inputs: integrates handwriting readings, spatial shapes matching,
   * and diagram generation pipelines under one roof.
   */
  public async processMultiModalSketch(
    rawElements: SketchRawInput,
    options?: {
      shapeRecognitionProvider?: any;
      handwritingProvider?: any;
      orchestratorClient?: any;
    }
  ): Promise<{ diagram: EditableDiagram; diagramType: string; confidence: number }> {
    // 1. Process with Handwriting recognition if provider overrides properties
    if (options?.handwritingProvider) {
      for (const elem of rawElements.elements) {
        if (elem.type === "text" && !elem.properties?.text) {
          const content = await options.handwritingProvider.recognizeText(elem.geometry.points);
          elem.properties = elem.properties || {};
          elem.properties.text = content;
        }
      }
    }

    // 2. Process shapes normalization
    if (options?.shapeRecognitionProvider) {
      for (const elem of rawElements.elements) {
        if (elem.type === "shape" && !elem.properties?.shapeType) {
          const type = await options.shapeRecognitionProvider.classifyShape(elem.geometry.points);
          elem.properties = elem.properties || {};
          elem.properties.shapeType = type;
        }
      }
    }

    // 3. Parse representation
    const semanticRep = this.parser.parse(rawElements);

    // 4. Classify diagram type
    const classification = await this.classifier.classify(semanticRep);

    // 5. Build relationship graph and generate editable platform objects
    const graph = this.relationshipEngine.analyze(semanticRep);
    const diagram = this.generator.generate(graph);

    // 6. Notify orchestrator client if present
    if (options?.orchestratorClient) {
      await options.orchestratorClient.publishDiagramParsed({
        diagramId: diagram.metadata.generatedAt.toString(),
        type: classification.primaryType,
        nodesCount: diagram.nodes.length
      });
    }

    return {
      diagram,
      diagramType: classification.primaryType,
      confidence: classification.confidenceScore
    };
  }
}

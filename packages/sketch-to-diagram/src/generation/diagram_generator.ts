import { RelationshipGraph } from "../domain";

export interface EditablePort {
  id: string;
  location: "top" | "bottom" | "left" | "right";
  x: number;
  y: number;
}

export interface EditableNode {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string | undefined;
  ports: EditablePort[];
  properties: Record<string, any>;
}

export interface EditableEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromPortId: string;
  toPortId: string;
  type: string;
  label: string | undefined;
}

export interface EditableContainer {
  id: string;
  childNodeIds: string[];
  padding: number;
}

export interface EditableDiagram {
  nodes: EditableNode[];
  edges: EditableEdge[];
  containers: EditableContainer[];
  metadata: {
    generatedAt: number;
    engineVersion: string;
  };
}

export class DiagramGenerator {
  /**
   * Generates a fully structured and editable interactive diagram graph with ports, labels, and container mappings.
   */
  public generate(graph: RelationshipGraph): EditableDiagram {
    const nodes: EditableNode[] = [];
    const edges: EditableEdge[] = [];
    const containers: EditableContainer[] = [];

    // 1. Map nodes and attach default north/south/east/west ports
    for (const node of graph.nodes) {
      const w = 120;
      const h = 60;
      const x = 0; // Coordinates will be resolved by the auto layout engine
      const y = 0;

      const ports: EditablePort[] = [
        { id: `${node.id}-port-top`, location: "top", x: x + w / 2, y },
        { id: `${node.id}-port-bottom`, location: "bottom", x: x + w / 2, y: y + h },
        { id: `${node.id}-port-left`, location: "left", x, y: y + h / 2 },
        { id: `${node.id}-port-right`, location: "right", x: x + w, y: y + h / 2 }
      ];

      nodes.push({
        id: node.id,
        type: node.type,
        x,
        y,
        w,
        h,
        label: node.label,
        ports,
        properties: {
          style: { strokeColor: "#333", strokeWidth: 2 }
        }
      });
    }

    // 2. Map edges, linking to the closest directional ports
    for (const edge of graph.edges) {
      const fromNode = nodes.find((n) => n.id === edge.from);
      const toNode = nodes.find((n) => n.id === edge.to);

      const fromPortId = fromNode ? `${fromNode.id}-port-bottom` : `${edge.from}-port-bottom`;
      const toPortId = toNode ? `${toNode.id}-port-top` : `${edge.to}-port-top`;

      edges.push({
        id: edge.id,
        fromNodeId: edge.from,
        toNodeId: edge.to,
        fromPortId,
        toPortId,
        type: edge.type,
        label: edge.label
      });
    }

    // 3. Map containments to editable containers
    for (const [parentId, childIds] of graph.containments.entries()) {
      containers.push({
        id: `${parentId}-container`,
        childNodeIds: childIds,
        padding: 20
      });
    }

    return {
      nodes,
      edges,
      containers,
      metadata: {
        generatedAt: Date.now(),
        engineVersion: "2.0.0"
      }
    };
  }
}

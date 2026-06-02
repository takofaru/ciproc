// Traverses the node graph and executes the image processing pipeline
import type { EditorNode, EditorEdge } from "@/types/graph"
import { processImage } from "@/lib/pyodide/pyodide-client"

export interface Op {
  type: string
  params: Record<string, number>
}

/**
 * Performs a topological sort starting from the imageInput node,
 * following edges through the graph to the output.
 * Returns an ordered list of ops to send to the Python worker.
 */
export function buildPipeline(nodes: EditorNode[], edges: EditorEdge[]): Op[] {
  // Build adjacency map: nodeId → next nodeId
  const nextMap = new Map<string, string>()
  for (const e of edges) {
    if (e.source && e.target) nextMap.set(e.source, e.target)
  }

  // Find the imageInput node
  const startNode = nodes.find((n) => n.type === "imageInput")
  if (!startNode) return []

  const ops: Op[] = []
  let currentId: string | undefined = nextMap.get(startNode.id)

  while (currentId) {
    const node = nodes.find((n) => n.id === currentId)
    if (!node || node.type === "output") break

    const params: Record<string, number> = {}
    if (node.type === "brightness") params.value = node.data.value ?? 0
    if (node.type === "contrast") params.value = node.data.value ?? 1.0
    if (node.type === "blur") params.radius = node.data.radius ?? 1
    if (node.type === "sharpen") params.strength = node.data.strength ?? 1.0

    ops.push({ type: node.type!, params })
    currentId = nextMap.get(currentId)
  }

  return ops
}

export async function executePipeline(
  sourceImage: string,
  nodes: EditorNode[],
  edges: EditorEdge[],
  geometryParams?: Record<string, number>
): Promise<string> {
  const ops = buildPipeline(nodes, edges)
  return processImage(sourceImage, ops, geometryParams)
}

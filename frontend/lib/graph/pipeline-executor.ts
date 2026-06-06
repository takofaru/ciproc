// Traverses the node graph and executes the image processing pipeline
import type { EditorNode, EditorEdge } from "@/types/graph"
import { processImage } from "@/lib/pyodide/pyodide-client"

export interface Op {
  type: string
  params: Record<string, number | string>
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

    if (node.data?.disabled) {
      currentId = nextMap.get(currentId)
      continue
    }

    const params: Record<string, number | string> = {}
    
    if (node.type === "brightness") {
      params.value = node.data.value ?? 0
    } else if (node.type === "contrast") {
      params.value = node.data.value ?? 1.0
    } else if (node.type === "smooth") {
      params.method = node.data.method ?? "gaussian"
      params.radius = node.data.radius ?? 1
    } else if (node.type === "sharpen") {
      params.strength = node.data.strength ?? 1.0
    } else if (node.type === "edge") {
      params.method = node.data.method ?? "sobel"
    } else if (node.type === "channel_split") {
      params.channel = node.data.channel ?? "r"
    } else if (node.type === "hsl") {
      params.hue = node.data.hue ?? 0
      params.saturation = node.data.saturation ?? 1.0
      params.luminance = node.data.luminance ?? 1.0
    } else if (node.type === "threshold") {
      params.value = node.data.value ?? 128
    } else if (node.type === "morphology") {
      params.method = node.data.method ?? "erosion"
      params.size = node.data.size ?? 3
    }

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
  return processImage(sourceImage, ops as any, geometryParams)
}

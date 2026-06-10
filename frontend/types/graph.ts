import {
  Edge,
  Node,
  NodeChange,
  EdgeChange,
  Connection,
} from "reactflow"

export type NodeFilterType =
  | "imageInput"
  | "brightness"
  | "contrast"
  | "grayscale"
  | "invert"
  | "sepia"
  | "smooth"
  | "sharpen"
  | "edge"
  | "histogram_eq"
  | "channel_split"
  | "hsl"
  | "threshold"
  | "morphology"
  | "segmentation"
  | "scale"
  | "crop"
  | "output"

export type EditorNodeData = {
  label?: string
  value?: number
  radius?: number
  strength?: number
  method?: string
  channel?: string
  hue?: number
  saturation?: number
  luminance?: number
  size?: number
  // untuk scale
  mode?: "percent" | "pixel"
  scaleW?: number
  scaleH?: number
  width?: number
  height?: number
  keepAspect?: number
  // Crop
  cropX?: number
  cropY?: number
  cropW?: number
  cropH?: number
  // Segmentation
  k?: number
  iterations?: number
  low?: number
  high?: number
  maskMode?: string
  threshold?: number
  minSize?: number
  regionMode?: string

  disabled?: boolean
}

export type EditorNode = Node<EditorNodeData>

export type EditorEdge = Edge

export type EditorNodeChange = NodeChange

export type EditorEdgeChange = EdgeChange

export type EditorConnection = Connection
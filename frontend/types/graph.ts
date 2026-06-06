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
  disabled?: boolean
}

export type EditorNode = Node<EditorNodeData>

export type EditorEdge = Edge

export type EditorNodeChange = NodeChange

export type EditorEdgeChange = EdgeChange

export type EditorConnection = Connection
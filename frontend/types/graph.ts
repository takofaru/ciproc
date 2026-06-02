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
  | "blur"
  | "sharpen"
  | "edge"
  | "output"

export type EditorNodeData = {
  label?: string
  value?: number
  radius?: number
  strength?: number
}

export type EditorNode = Node<EditorNodeData>

export type EditorEdge = Edge

export type EditorNodeChange = NodeChange

export type EditorEdgeChange = EdgeChange

export type EditorConnection = Connection
import { NodeTypes } from "reactflow"
import { ImageInputNode } from "@/components/graph/nodes/ImageInputNode"
import { BrightnessNode } from "@/components/graph/nodes/BrightnessNode"
import { ContrastNode } from "@/components/graph/nodes/ContrastNode"
import { GrayscaleNode } from "@/components/graph/nodes/GrayscaleNode"
import { InvertNode } from "@/components/graph/nodes/InvertNode"
import { SepiaNode } from "@/components/graph/nodes/SepiaNode"
import { BlurNode } from "@/components/graph/nodes/BlurNode"
import { SharpenNode } from "@/components/graph/nodes/SharpenNode"
import { EdgeNode } from "@/components/graph/nodes/EdgeNode"
import { OutputNode } from "@/components/graph/nodes/OutputNode"

export const nodeTypes: NodeTypes = {
  imageInput: ImageInputNode,
  brightness: BrightnessNode,
  contrast: ContrastNode,
  grayscale: GrayscaleNode,
  invert: InvertNode,
  sepia: SepiaNode,
  blur: BlurNode,
  sharpen: SharpenNode,
  edge: EdgeNode,
  output: OutputNode,
}

export const NODE_CATALOG = [
  { type: "imageInput", label: "Image Input",  group: "Source",    color: "#22c55e" },
  { type: "brightness", label: "Brightness",   group: "Adjust",    color: "#facc15" },
  { type: "contrast",   label: "Contrast",     group: "Adjust",    color: "#f97316" },
  { type: "grayscale",  label: "Grayscale",    group: "Color",     color: "#94a3b8" },
  { type: "invert",     label: "Invert",       group: "Color",     color: "#c084fc" },
  { type: "sepia",      label: "Sepia",        group: "Color",     color: "#a16207" },
  { type: "blur",       label: "Blur",         group: "Convolve",  color: "#67e8f9" },
  { type: "sharpen",    label: "Sharpen",      group: "Convolve",  color: "#34d399" },
  { type: "edge",       label: "Edge Detect",  group: "Convolve",  color: "#fb7185" },
  { type: "output",     label: "Output",       group: "Sink",      color: "#f472b6" },
]

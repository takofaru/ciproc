import { NodeTypes } from "reactflow"
import { ImageInputNode } from "@/components/graph/nodes/ImageInputNode"
import { BrightnessNode } from "@/components/graph/nodes/BrightnessNode"
import { ContrastNode } from "@/components/graph/nodes/ContrastNode"
import { GrayscaleNode } from "@/components/graph/nodes/GrayscaleNode"
import { InvertNode } from "@/components/graph/nodes/InvertNode"
import { SepiaNode } from "@/components/graph/nodes/SepiaNode"
import { SmoothNode } from "@/components/graph/nodes/SmoothNode"
import { SharpenNode } from "@/components/graph/nodes/SharpenNode"
import { EdgeNode } from "@/components/graph/nodes/EdgeNode"
import { HistogramEqNode } from "@/components/graph/nodes/HistogramEqNode"
import { ChannelSplitNode } from "@/components/graph/nodes/ChannelSplitNode"
import { HSLNode } from "@/components/graph/nodes/HSLNode"
import { ThresholdNode } from "@/components/graph/nodes/ThresholdNode"
import { MorphologyNode } from "@/components/graph/nodes/MorphologyNode"
import { OutputNode } from "@/components/graph/nodes/OutputNode"
import { ScaleNode } from "@/components/graph/nodes/ScaleNode"
import { CropNode } from "@/components/graph/nodes/CropNode"
import { SegmentationNode } from "@/components/graph/nodes/SegmentationNode"

export const nodeTypes: NodeTypes = {
  imageInput: ImageInputNode,
  brightness: BrightnessNode,
  contrast: ContrastNode,
  grayscale: GrayscaleNode,
  invert: InvertNode,
  sepia: SepiaNode,
  smooth: SmoothNode,
  sharpen: SharpenNode,
  edge: EdgeNode,
  histogram_eq: HistogramEqNode,
  channel_split: ChannelSplitNode,
  hsl: HSLNode,
  threshold: ThresholdNode,
  morphology: MorphologyNode,
  output: OutputNode,
  scale: ScaleNode,
  crop: CropNode,
  segmentation: SegmentationNode,
}

export const NODE_CATALOG = [
  { type: "imageInput",   label: "Image Input",  group: "Source",    color: "#22c55e" },
  { type: "brightness",   label: "Brightness",   group: "Adjust",    color: "#facc15" },
  { type: "contrast",     label: "Contrast",     group: "Adjust",    color: "#f97316" },
  { type: "histogram_eq", label: "Histogram Eq", group: "Adjust",    color: "#eab308" },
  { type: "threshold",    label: "Threshold",    group: "Adjust",    color: "#a855f7" },
  { type: "grayscale",    label: "Grayscale",    group: "Color",     color: "#94a3b8" },
  { type: "invert",       label: "Invert",       group: "Color",     color: "#c084fc" },
  { type: "sepia",        label: "Sepia",        group: "Color",     color: "#a16207" },
  { type: "channel_split",label: "Channel Split",group: "Color",     color: "#3b82f6" },
  { type: "hsl",          label: "HSL Adjust",   group: "Color",     color: "#10b981" },
  { type: "smooth",       label: "Smooth/Blur",  group: "Convolve",  color: "#67e8f9" },
  { type: "sharpen",      label: "Sharpen",      group: "Convolve",  color: "#34d399" },
  { type: "edge",         label: "Edge Detect",  group: "Convolve",  color: "#fb7185" },
  { type: "morphology",   label: "Morphology",   group: "Convolve",  color: "#f43f5e" },
  { type: "segmentation", label: "Segmentation", group: "Segment", color: "#a78bfa" },
  { type: "scale",  label: "Scale/Resize", group: "Transform", color: "#818cf8" },
  { type: "crop",   label: "Crop",         group: "Transform", color: "#f59e0b" },
  { type: "output",       label: "Output",       group: "Sink",      color: "#f472b6" },
]

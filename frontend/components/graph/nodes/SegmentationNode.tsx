"use client"

import { useGraphStore } from "@/stores/graph-store"
import { BaseNode } from "./BaseNode"

interface Props {
  id: string
  data: {
    method?: string
    // K-Means
    k?: number
    iterations?: number
    // Mask
    low?: number
    high?: number
    channel?: string
    maskMode?: string
    // Region
    threshold?: number
    minSize?: number
    regionMode?: string
  }
}

type Method = "kmeans" | "mask" | "region"

const METHODS: { id: Method; label: string; desc: string }[] = [
  { id: "kmeans", label: "K-Means",  desc: "Color cluster grouping" },
  { id: "mask",   label: "Masking",  desc: "Intensity range selection" },
  { id: "region", label: "Regions",  desc: "Connected component extraction" },
]

function SliderParam({
  label, value, min, max, step = 1, display, onChange,
}: {
  label: string; value: number; min: number; max: number
  step?: number; display?: string; onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-zinc-500 uppercase font-semibold tracking-wide">{label}</span>
        <span className="text-zinc-400 font-mono">{display ?? value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  )
}

function SelectParam({
  label, value, options, onChange,
}: {
  label: string; value: string
  options: { id: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wide">{label}</span>
      <div className="flex gap-1 flex-wrap">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              value === o.id
                ? "bg-violet-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function SegmentationNode({ id, data }: Props) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData)
  const snapshot = useGraphStore((s) => s.snapshot)

  const method = (data.method ?? "kmeans") as Method

  const commit = (patch: Partial<typeof data>) => {
    snapshot()
    updateNodeData(id, patch)
  }

  return (
    <BaseNode id={id} title="Segmentation" color="#a78bfa">
      <div className="flex flex-col gap-3 min-w-[220px]">

        {/* Method selector */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wide">Method</span>
          <div className="flex flex-col gap-0.5">
            {METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => commit({ method: m.id })}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-colors ${
                  method === m.id
                    ? "bg-violet-600/30 border border-violet-500/50 text-violet-200"
                    : "hover:bg-zinc-800 text-zinc-400 border border-transparent"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  method === m.id ? "bg-violet-400" : "bg-zinc-700"
                }`} />
                <div>
                  <p className="text-xs font-medium leading-none">{m.label}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{m.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-zinc-800" />

        {/* K-Means params */}
        {method === "kmeans" && (
          <>
            <SliderParam
              label="Clusters (K)" value={data.k ?? 4} min={2} max={16}
              onChange={(v) => commit({ k: v })}
            />
            <SliderParam
              label="Iterations" value={data.iterations ?? 8} min={2} max={20}
              onChange={(v) => commit({ iterations: v })}
            />
            <p className="text-[10px] text-zinc-600">
              Higher K = more color groups. More iterations = more accurate but slower.
            </p>
          </>
        )}

        {/* Mask params */}
        {method === "mask" && (
          <>
            <SliderParam
              label="Range Low" value={data.low ?? 80} min={0} max={254}
              onChange={(v) => commit({ low: v })}
            />
            <SliderParam
              label="Range High" value={data.high ?? 200} min={1} max={255}
              onChange={(v) => commit({ high: v })}
            />
            <SelectParam
              label="Channel"
              value={data.channel ?? "gray"}
              options={[
                { id: "gray", label: "Gray" },
                { id: "r",    label: "R" },
                { id: "g",    label: "G" },
                { id: "b",    label: "B" },
              ]}
              onChange={(v) => commit({ channel: v })}
            />
            <SelectParam
              label="Output Mode"
              value={data.maskMode ?? "extract"}
              options={[
                { id: "mask",    label: "Mask B/W" },
                { id: "extract", label: "Extract" },
                { id: "invert",  label: "Invert" },
              ]}
              onChange={(v) => commit({ maskMode: v })}
            />
          </>
        )}

        {/* Region params */}
        {method === "region" && (
          <>
            <SliderParam
              label="Threshold" value={data.threshold ?? 128} min={0} max={255}
              onChange={(v) => commit({ threshold: v })}
            />
            <SliderParam
              label="Min Region Size" value={data.minSize ?? 300} min={10} max={5000} step={10}
              display={`${data.minSize ?? 300}px`}
              onChange={(v) => commit({ minSize: v })}
            />
            <SelectParam
              label="Output Mode"
              value={data.regionMode ?? "all"}
              options={[
                { id: "all",     label: "All Regions" },
                { id: "largest", label: "Largest" },
                { id: "boxes",   label: "Bounding Boxes" },
              ]}
              onChange={(v) => commit({ regionMode: v })}
            />
            <p className="text-[10px] text-zinc-600">
              Min size filters small noise regions. Bounding boxes overlay on original image.
            </p>
          </>
        )}
      </div>
    </BaseNode>
  )
}

"use client"

import { useCanvasStore } from "@/stores/canvas-store"
import { useGraphStore } from "@/stores/graph-store"
import { nanoid } from "nanoid"
import { useCallback } from "react"

const COLOR_ACTIONS = [
    { label: "RGB To Grayscale", type: "grayscale", desc: "BT.601 luminance-weighted", color: "#94a3b8" },
    { label: "Channel Red", type: "channel_split", desc: "Isolate red channel", color: "#f87171", params: { channel: "r" } },
    { label: "Channel Green", type: "channel_split", desc: "Isolate green channel", color: "#4ade80", params: { channel: "g" } },
    { label: "Channel Blue", type: "channel_split", desc: "Isolate blue channel", color: "#60a5fa", params: { channel: "b" } },
    { label: "HSL adjust", type:"hsl", desc: "Hue / Saturation / Luminance", color: "#10b981" },
    { label: "Sepia", type: "sepia", desc: "Warm vintage tone", color: "#a16207" },
    { label: "Invert", type: "invert", desc: "255 − pixel", color: "#c084fc" },
]

export function ColorPanel() {
    const processedImage = useCanvasStore((s) => s.processedImage)
    const nodes = useGraphStore((s) => s.nodes)
    const setNodes = useGraphStore((s) => s.setNodes)

    const addNode = useCallback((type: string, params?: Record<string, string | number>) => {
        const offset = (nodes.length % 6) * 40
        setNodes([
            ...nodes,
            {
                id: nanoid(),
                type,
                position: {
                    x: 200 + offset,
                    y: 100 + offset
                },
                data: params ?? {},
            },
        ])
    }, [nodes, setNodes])

    const hasImage = !!processedImage

    return (
        <div className="p-3 flex flex-col gap-4 overflow-auto h-full">
            {/* Color space info */}
            <section title="Color Space">
                <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: "#0d1117" }}>
                <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Mode</span>
                    <span className="text-zinc-300 font-mono">RGB (8-bit)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Channels</span>
                    <div className="flex gap-1.5">
                    {["R","G","B"].map((c, i) => (
                        <span key={c} className="px-1.5 py-0.5 rounded text-xs font-mono font-semibold"
                        style={{ background: ["#7f1d1d","#14532d","#1e3a5f"][i], color: ["#f87171","#4ade80","#60a5fa"][i] }}>
                        {c}
                        </span>
                    ))}
                    </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Depth</span>
                    <span className="text-zinc-300 font-mono">0 – 255</span>
                </div>
                </div>
            </section>

            {/* Channel visualization */}
            <section title="Channels">
                <div className="grid grid-cols-3 gap-1.5">
                {[
                    { label: "R", color: "#f87171", bg: "#7f1d1d" },
                    { label: "G", color: "#4ade80", bg: "#14532d" },
                    { label: "B", color: "#60a5fa", bg: "#1e3a5f" },
                ].map(({ label, color, bg }) => (
                    <button
                    key={label}
                    onClick={() => addNode("channel_split", { channel: label.toLowerCase() })}
                    title={`Add Channel Split (${label})`}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors hover:border-zinc-600 cursor-pointer"
                    style={{ background: bg, borderColor: color + "40" }}
                    >
                    <span className="text-sm font-bold" style={{ color }}>{label}</span>
                    <span className="text-xs text-zinc-500">channel</span>
                    </button>
                ))}
                </div>
                <p className="text-xs text-zinc-600">Click to add channel split node</p>
            </section>

            {/* Quick-add operations */}
            <section title="Operations">
                <div className="flex flex-col gap-1">
                {COLOR_ACTIONS.map((action) => (
                    <button
                    key={`${action.type}-${action.label}`}
                    onClick={() => addNode(action.type, action.params)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-left
                        hover:bg-zinc-800/60 transition-colors group"
                    >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: action.color }} />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-300 group-hover:text-zinc-100 transition-colors">{action.label}</p>
                        <p className="text-xs text-zinc-600">{action.desc}</p>
                    </div>
                    <span className="text-zinc-700 group-hover:text-zinc-500 text-xs transition-colors">+</span>
                    </button>
                ))}
                </div>
            </section>

            {!hasImage && (
                <p className="text-xs text-zinc-600 text-center pt-2">
                    Load an image to enable color analysis
                </p>
            )}
        </div>
    )
}
"use client"

import { useState } from "react"
import { useEditorStore } from "@/stores/editor-store"
import { useCanvasStore } from "@/stores/canvas-store"
import { ColorPanel } from "./ColorPanel"
import { HistogramPanel } from "./HistogramPanel"

// ── Shared sub-components ────────────────────────────────────
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-zinc-500">{label}</span>
      {children}
    </div>
  )
}

function SliderRow({
  label, value, min, max, step = 1, onChange, display,
}: {
  label: string; value: number; min: number; max: number
  step?: number; onChange: (v: number) => void; display?: string
}) {
  return (
    <Row label={label}>
      <div className="flex items-center gap-2">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-xs text-zinc-400 w-12 text-right tabular-nums">
          {display ?? value}
        </span>
      </div>
    </Row>
  )
}

// ── Inspector panel (original content) ───────────────────────
function InspectorPanel() {
  const selectedNode = useEditorStore((s) => s.selectedNode)
  const { viewport, imageTransform, setViewport, setImageTransform, resetViewport, resetImageTransform } = useCanvasStore()

  return (
    <div className="p-3 flex flex-col gap-4 overflow-auto h-full">
      {/* Node Info */}
      {selectedNode ? (
        <div className="flex flex-col gap-1 pb-3 border-b border-zinc-800">
          <p className="text-xs text-zinc-500">Selected Node</p>
          <p className="text-sm font-medium capitalize">{selectedNode.type}</p>
          <p className="text-xs text-zinc-600 break-all">{selectedNode.id}</p>
        </div>
      ) : (
        <p className="text-xs text-zinc-600 pb-3 border-b border-zinc-800">No node selected</p>
      )}

      {/* Viewport */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Viewport</p>
          <button onClick={resetViewport} className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors">Reset</button>
        </div>
        <SliderRow label="Zoom" value={viewport.zoom} min={0.05} max={10} step={0.05}
          onChange={(v) => setViewport({ zoom: v })} display={`${Math.round(viewport.zoom * 100)}%`} />
        <SliderRow label="Pan X" value={viewport.panX} min={-2000} max={2000}
          onChange={(v) => setViewport({ panX: v })} display={`${viewport.panX}px`} />
        <SliderRow label="Pan Y" value={viewport.panY} min={-2000} max={2000}
          onChange={(v) => setViewport({ panY: v })} display={`${viewport.panY}px`} />
      </div>

      {/* Transform */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Transform</p>
          <button onClick={resetImageTransform} className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors">Reset</button>
        </div>
        <SliderRow label="Rotation" value={imageTransform.rotation} min={-180} max={180}
          onChange={(v) => setImageTransform({ rotation: v })} display={`${imageTransform.rotation}°`} />
        <SliderRow label="Translate X" value={imageTransform.x} min={-1000} max={1000}
          onChange={(v) => setImageTransform({ x: v })} display={`${imageTransform.x}px`} />
        <SliderRow label="Translate Y" value={imageTransform.y} min={-1000} max={1000}
          onChange={(v) => setImageTransform({ y: v })} display={`${imageTransform.y}px`} />

        <div className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Flip</span>
          <div className="flex gap-2">
            <button
              onClick={() => setImageTransform({ scaleX: imageTransform.scaleX * -1 })}
              className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${
                imageTransform.scaleX < 0
                  ? "border-blue-500 bg-blue-500/20 text-blue-300"
                  : "border-zinc-700 hover:border-zinc-500 text-zinc-400"
              }`}
            >↔ H</button>
            <button
              onClick={() => setImageTransform({ scaleY: imageTransform.scaleY * -1 })}
              className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${
                imageTransform.scaleY < 0
                  ? "border-blue-500 bg-blue-500/20 text-blue-300"
                  : "border-zinc-700 hover:border-zinc-500 text-zinc-400"
              }`}
            >↕ V</button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Quick Rotate</span>
          <div className="flex gap-1">
            {[-90, -45, 45, 90].map((deg) => (
              <button key={deg}
                onClick={() => setImageTransform({ rotation: (imageTransform.rotation + deg + 360) % 360 - 180 })}
                className="flex-1 py-1 text-xs rounded border border-zinc-700 hover:border-zinc-500 text-zinc-400 transition-colors"
              >
                {deg > 0 ? "+" : ""}{deg}°
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tab definitions ───────────────────────────────────────────
type Tab = "inspector" | "color" | "histogram"

const TABS: { id: Tab; label: string }[] = [
  { id: "inspector", label: "Properties" },
  { id: "color",     label: "Color" },
  { id: "histogram", label: "Histogram" },
]

// ── Root component ────────────────────────────────────────────
export function Inspector() {
  const [activeTab, setActiveTab] = useState<Tab>("inspector")

  return (
    <aside className="editor-panel flex flex-col overflow-hidden border-l border-zinc-800">
      {/* Tab bar */}
      <div className="flex border-b border-zinc-800 shrink-0" style={{ background: "#161b22" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "text-zinc-100 border-b-2 border-blue-500"
                : "text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "inspector" && <InspectorPanel />}
        {activeTab === "color"     && <ColorPanel />}
        {activeTab === "histogram" && <HistogramPanel />}
      </div>
    </aside>
  )
}

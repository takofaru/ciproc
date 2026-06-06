"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useCanvasStore } from "@/stores/canvas-store"
import { computeHistogram } from "@/lib/pyodide/pyodide-client"

interface HistData {
  r: number[]
  g: number[]
  b: number[]
  gray: number[]
}

type Mode = "rgb" | "gray" | "compare"
type Channel = "r" | "g" | "b" | "gray"

const CHANNEL_COLORS: Record<Channel, string> = {
  r:    "#f87171",
  g:    "#4ade80",
  b:    "#60a5fa",
  gray: "#94a3b8",
}

function HistCanvas({
  data, channels, height = 80
}: {
  data: HistData | null
  channels: Channel[]
  height?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)

    // Dark background
    ctx.fillStyle = "#0d1117"
    ctx.fillRect(0, 0, W, H)

    // Find global max across selected channels
    let globalMax = 1
    for (const ch of channels) {
      const m = Math.max(...data[ch])
      if (m > globalMax) globalMax = m
    }

    const barW = W / 256

    for (const ch of channels) {
      ctx.globalAlpha = channels.length > 1 ? 0.65 : 0.9
      ctx.fillStyle = CHANNEL_COLORS[ch]
      for (let i = 0; i < 256; i++) {
        const h = (data[ch][i] / globalMax) * H
        ctx.fillRect(i * barW, H - h, barW, h)
      }
    }
    ctx.globalAlpha = 1
  }, [data, channels])

  if (!data) {
    return (
      <div
        className="w-full rounded flex items-center justify-center text-zinc-700 text-xs"
        style={{ height, background: "#0d1117" }}
      >
        No data
      </div>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      width={256}
      height={height}
      className="w-full rounded"
      style={{ imageRendering: "pixelated" }}
    />
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-300 font-mono">{value}</span>
    </div>
  )
}

function channelStats(arr: number[]) {
  const total = arr.reduce((s, v) => s + v, 0)
  let cumul = 0
  let median = 0
  let peak = 0
  let peakIdx = 0
  for (let i = 0; i < 256; i++) {
    if (arr[i] > arr[peakIdx]) { peak = arr[i]; peakIdx = i }
    cumul += arr[i]
    if (cumul >= total / 2 && median === 0) median = i
  }
  // Mean
  let weightedSum = 0
  for (let i = 0; i < 256; i++) weightedSum += i * arr[i]
  const mean = total > 0 ? (weightedSum / total).toFixed(1) : "—"
  return { mean, median, peak: peakIdx }
}

export function HistogramPanel() {
  const sourceImage = useCanvasStore((s) => s.sourceImage)
  const processedImage = useCanvasStore((s) => s.processedImage)
  const isPyodideReady = useCanvasStore((s) => s.isPyodideReady)

  const proxyImage = useCanvasStore((s) => s.proxyImage)
  const activeInputImage = proxyImage || sourceImage

  const [beforeData, setBeforeData] = useState<HistData | null>(null)
  const [afterData,  setAfterData]  = useState<HistData | null>(null)
  const [mode,       setMode]       = useState<Mode>("rgb")
  const [loadingBefore, setLoadingBefore] = useState(false)
  const [loadingAfter, setLoadingAfter] = useState(false)

  // Compute before histogram once when active input image changes
  useEffect(() => {
    if (!activeInputImage || !isPyodideReady) {
      setBeforeData(null)
      return
    }

    let isMounted = true
    setLoadingBefore(true)
    computeHistogram(activeInputImage)
      .then((data) => {
        if (isMounted) {
          setBeforeData(data)
        }
      })
      .catch(console.error)
      .finally(() => {
        if (isMounted) setLoadingBefore(false)
      })

    return () => {
      isMounted = false
    }
  }, [activeInputImage, isPyodideReady])

  // Compute after histogram when processedImage changes
  useEffect(() => {
    if (!isPyodideReady) {
      setAfterData(null)
      return
    }

    if (!processedImage) {
      setAfterData(beforeData)
      return
    }

    let isMounted = true
    setLoadingAfter(true)
    computeHistogram(processedImage)
      .then((data) => {
        if (isMounted) {
          setAfterData(data)
        }
      })
      .catch(console.error)
      .finally(() => {
        if (isMounted) setLoadingAfter(false)
      })

    return () => {
      isMounted = false
    }
  }, [processedImage, beforeData, isPyodideReady])

  const refresh = useCallback(async () => {
    if (!activeInputImage || !isPyodideReady) return
    setLoadingBefore(true)
    setLoadingAfter(true)
    try {
      const before = await computeHistogram(activeInputImage)
      setBeforeData(before)
      const after = processedImage ? await computeHistogram(processedImage) : before
      setAfterData(after)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingBefore(false)
      setLoadingAfter(false)
    }
  }, [activeInputImage, processedImage, isPyodideReady])

  const loading = loadingBefore || loadingAfter

  const activeChannels: Channel[] =
    mode === "gray" ? ["gray"] :
    mode === "rgb"  ? ["r", "g", "b"] :
    ["gray"] // compare uses gray

  const hasData = !!beforeData

  return (
    <div className="p-3 flex flex-col gap-4 overflow-auto h-full">
      {/* Mode tabs */}
      <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: "#0d1117" }}>
        {(["rgb","gray","compare"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
              mode === m
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {m === "compare" ? "Before/After" : m.toUpperCase()}
          </button>
        ))}
      </div>

      {!sourceImage ? (
        <p className="text-xs text-zinc-600 text-center pt-4">Load an image to view histogram</p>
      ) : !isPyodideReady ? (
        <p className="text-xs text-zinc-600 text-center pt-4">Waiting for Python engine…</p>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-zinc-600">
          <div className="w-4 h-4 rounded-full border border-zinc-700 border-t-blue-500 animate-spin" />
          <span className="text-xs">Computing…</span>
        </div>
      ) : mode === "compare" ? (
        /* ── Before / After comparison ── */
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-zinc-500">Before (source)</p>
            <HistCanvas data={beforeData} channels={["gray"]} height={64} />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs text-zinc-500">After (processed)</p>
            <HistCanvas data={afterData} channels={["gray"]} height={64} />
          </div>
          <button
            onClick={refresh}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors text-center"
          >
            ↺ Refresh
          </button>
        </div>
      ) : (
        /* ── RGB or Gray ── */
        <div className="flex flex-col gap-3">
          <HistCanvas data={afterData} channels={activeChannels} height={80} />

          {/* Per-channel stats */}
          {hasData && afterData && (
            <div className="flex flex-col gap-2">
              {activeChannels.map((ch) => {
                const stats = channelStats(afterData[ch])
                return (
                  <div key={ch} className="rounded-lg p-2.5 flex flex-col gap-1.5" style={{ background: "#0d1117" }}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: CHANNEL_COLORS[ch] }} />
                      <span className="text-xs font-semibold text-zinc-400 uppercase">{ch}</span>
                    </div>
                    <StatRow label="Mean"   value={stats.mean} />
                    <StatRow label="Median" value={String(stats.median)} />
                    <StatRow label="Peak"   value={`@ ${stats.peak}`} />
                  </div>
                )
              })}
            </div>
          )}

          <button
            onClick={refresh}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors text-center"
          >
            ↺ Refresh
          </button>
        </div>
      )}
    </div>
  )
}

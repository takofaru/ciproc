"use client"

import Image from "next/image"

import { useRef, useEffect, useCallback, useState } from "react"
import { useCanvasStore } from "@/stores/canvas-store"
import { CropOverlay } from "./CropOverlay"

export function CanvasPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const masterImageRef = useRef<HTMLImageElement | null>(null)
  const isPanningRef = useRef(false)
  const lastPanRef = useRef({ x: 0, y: 0 })

  const processedImage = useCanvasStore((s) => s.processedImage)
  const viewport = useCanvasStore((s) => s.viewport)
  const imageTransform = useCanvasStore((s) => s.imageTransform)
  const setViewport = useCanvasStore((s) => s.setViewport)
  const originalWidth = useCanvasStore((s) => s.originalWidth)
  const originalHeight = useCanvasStore((s) => s.originalHeight)
  const fitViewportTrigger = useCanvasStore((s) => s.fitViewportTrigger)
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })

  const [imageLoadedCount, setImageLoadedCount] = useState(0)
  const lastAppliedTriggerRef = useRef(-1)

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    const img = masterImageRef.current

    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw checkerboard in unscaled screen coordinates
    drawCheckerboard(ctx, canvas.width, canvas.height, viewport)

    // Viewport camera
    ctx.save()
    ctx.translate(viewport.panX, viewport.panY)
    ctx.scale(viewport.zoom, viewport.zoom)

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save()

      ctx.translate(imageTransform.x, imageTransform.y)

      const displayW = originalWidth > 0 ? originalWidth : img.naturalWidth
      const displayH = originalHeight > 0 ? originalHeight : img.naturalHeight

      const cx = displayW / 2
      const cy = displayH / 2

      ctx.translate(cx, cy)

      ctx.rotate((imageTransform.rotation * Math.PI) / 180)
      ctx.scale(imageTransform.scaleX, imageTransform.scaleY)

      ctx.translate(-cx, -cy)

      ctx.drawImage(img, 0, 0, displayW, displayH)

      ctx.restore()
    }

    ctx.restore()
  }, [viewport, imageTransform, originalWidth, originalHeight])

  useEffect(() => {
    if (!processedImage) {
      masterImageRef.current = null
      drawCanvas()
      return
    }

    const img = new window.Image()
    img.onload = () => {
      masterImageRef.current = img
      setImageLoadedCount((c) => c + 1)
      drawCanvas()
    }
    img.src = processedImage
  }, [processedImage])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const observer = new ResizeObserver(() => {
      const w = container.clientWidth
      const h = container.clientHeight
      canvas.width = w
      canvas.height = h
      setStageSize({ width: w, height: h })
      drawCanvas()
    })
    observer.observe(container)

    const w = container.clientWidth
    const h = container.clientHeight
    canvas.width = w
    canvas.height = h
    setStageSize({ width: w, height: h })

    return () => observer.disconnect()
  }, [drawCanvas])

  // Center and fit the image to the panel
  useEffect(() => {
    const img = masterImageRef.current

    const displayW = originalWidth > 0 ? originalWidth : (img?.naturalWidth ?? 0)
    const displayH = originalHeight > 0 ? originalHeight : (img?.naturalHeight ?? 0)

    if (fitViewportTrigger > lastAppliedTriggerRef.current) {
      if (displayW > 0 && displayH > 0 && stageSize.width > 0 && stageSize.height > 0) {
        const padding = 40 // nice gap
        const zoomX = (stageSize.width - padding) / displayW
        const zoomY = (stageSize.height - padding) / displayH
        const fitZoom = Math.min(1.0, zoomX, zoomY)

        const panX = (stageSize.width - displayW * fitZoom) / 2
        const panY = (stageSize.height - displayH * fitZoom) / 2

        setViewport({ zoom: fitZoom, panX, panY })
        lastAppliedTriggerRef.current = fitViewportTrigger
      }
    }
  }, [fitViewportTrigger, imageLoadedCount, originalWidth, originalHeight, stageSize.width, stageSize.height, setViewport])

  // ── Wheel zoom ─────────────────────────────────────────────
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      setViewport({ zoom: Math.min(10, Math.max(0.05, viewport.zoom * factor)) })
    },
    [viewport.zoom, setViewport]
  )

   const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || e.button === 0) {
        isPanningRef.current = true
        lastPanRef.current = { x: e.clientX, y: e.clientY }
      }
    },
    []
  )

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanningRef.current) return
      const dx = e.clientX - lastPanRef.current.x
      const dy = e.clientY - lastPanRef.current.y
      lastPanRef.current = { x: e.clientX, y: e.clientY }
      setViewport({ panX: viewport.panX + dx, panY: viewport.panY + dy })
    },
    [viewport, setViewport]
  )

  const onMouseUp = useCallback(() => {
    isPanningRef.current = false
  }, [])

  return (
    <section className="editor-panel flex items-center justify-center overflow-hidden relative bg-zinc-950">
      <div ref={containerRef} className="canvas-stage">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />
        <CropOverlay containerRef={containerRef} />
        {!processedImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 pointer-events-none select-none gap-2">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="8" y="12" width="32" height="24" rx="2" stroke="currentColor" strokeWidth="2" />
              <circle cx="18" cy="22" r="4" stroke="currentColor" strokeWidth="2" />
              <path d="M8 32 l10-10 6 6 6-8 10 12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            <p className="text-sm">Upload an image to begin</p>
            <p className="text-xs opacity-50">Scroll to zoom · Drag to pan</p>
          </div>
        )}
      </div>
    </section>
  )
}

function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  viewport: { panX: number; panY: number; zoom: number }
) {
  const size = 16
  // Offset the checkerboard by pan to make it feel like it moves, but keep the size constant
  // We use modulo to prevent coordinates from growing infinitely
  const offsetX = viewport.panX % (size * 2)
  const offsetY = viewport.panY % (size * 2)

  // Start drawing from -size*2 to cover the edges when panning
  const startX = -size * 2
  const startY = -size * 2
  const endX = w + size * 2
  const endY = h + size * 2

  for (let x = startX; x < endX; x += size) {
    for (let y = startY; y < endY; y += size) {
      // Calculate true grid coordinate to keep color selection stable during pan offset
      const gridX = Math.floor((x - offsetX) / size)
      const gridY = Math.floor((y - offsetY) / size)
      const isLight = (gridX + gridY) % 2 === 0
      ctx.fillStyle = isLight ? "#1a1d24" : "#141720"
      ctx.fillRect(x + offsetX, y + offsetY, size, size)
    }
  }
}
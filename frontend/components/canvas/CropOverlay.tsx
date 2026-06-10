"use client"

/**
 * CropOverlay — renders over the main canvas when crop mode is active.
 * Converts mouse events to image-space coordinates accounting for
 * viewport pan/zoom and imageTransform translation.
 *
 * Architecture:
 *   screen coords → subtract panX/panY → divide by zoom → image space
 */

import { useRef, useCallback, useEffect, useState } from "react"
import { useCropStore } from "@/stores/crop-store"
import { useCanvasStore } from "@/stores/canvas-store"
import { useGraphStore } from "@/stores/graph-store"
import type { EditorNodeData } from "@/types/graph"

type Handle = "tl" | "tr" | "bl" | "br" | "t" | "b" | "l" | "r" | "move" | null

interface DragState {
  handle: Handle
  startX: number   // screen
  startY: number
  origRect: { cropX: number, cropY: number, cropW: number, cropH: number }
}

function screenToImage(
  sx: number, sy: number,
  panX: number, panY: number, zoom: number,
  imgX: number, imgY: number
) {
  return {
    x: (sx - panX) / zoom - imgX,
    y: (sy - panY) / zoom - imgY,
  }
}

export function CropOverlay({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>
}) {
  const { isActive, rect, pendingNodeId, setRect, deactivate } = useCropStore()
  const { viewport, imageTransform, originalWidth, originalHeight } = useCanvasStore()
  const { updateNodeData, snapshot } = useGraphStore()

  const overlayRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const imgW = originalWidth  || 800
  const imgH = originalHeight || 600

  // Convert image rect to screen rect for display
  const toScreen = (ix: number, iy: number) => ({
    sx: ix * viewport.zoom + viewport.panX + imageTransform.x * viewport.zoom,
    sy: iy * viewport.zoom + viewport.panY + imageTransform.y * viewport.zoom,
  })

  const imgOriginScreen = toScreen(0, 0)

  // Screen dimensions of the image
  const imgScreenW = imgW * viewport.zoom
  const imgScreenH = imgH * viewport.zoom

  // Displayed rect in screen space
  const screenRect = rect ? {
    left:   rect.x      * viewport.zoom + imgOriginScreen.sx,
    top:    rect.y      * viewport.zoom + imgOriginScreen.sy,
    width:  rect.width  * viewport.zoom,
    height: rect.height * viewport.zoom,
  } : null

  const clampRect = (r: { x: number; y: number; width: number; height: number }) => ({
    x:      Math.max(0, Math.min(imgW - 1, r.x)),
    y:      Math.max(0, Math.min(imgH - 1, r.y)),
    width:  Math.max(1, Math.min(imgW - r.x, r.width)),
    height: Math.max(1, Math.min(imgH - r.y, r.height)),
  })

  // ── Mouse handlers ─────────────────────────────────────────
  const getImagePos = useCallback((e: React.MouseEvent | MouseEvent) => {
    const overlay = overlayRef.current
    if (!overlay) return { x: 0, y: 0 }
    const bounds = overlay.getBoundingClientRect()
    const sx = e.clientX - bounds.left
    const sy = e.clientY - bounds.top
    return screenToImage(sx, sy, imgOriginScreen.sx, imgOriginScreen.sy, viewport.zoom, 0, 0)
  }, [imgOriginScreen, viewport.zoom])

  const onOverlayMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const pos = getImagePos(e)
    // Start new selection
    dragRef.current = {
      handle: null,
      startX: pos.x,
      startY: pos.y,
      origRect: { cropX: pos.x, cropY: pos.y, cropW: 0, cropH: 0 },
    }
    setRect({ x: pos.x, y: pos.y, width: 1, height: 1 })
    setIsDragging(true)
  }, [getImagePos, setRect])

  const onHandleMouseDown = useCallback((e: React.MouseEvent, handle: Handle) => {
    if (!rect) return
    e.stopPropagation()
    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      origRect: { cropX: rect.x, cropY: rect.y, cropW: rect.width, cropH: rect.height },
    //   origRect: { ...rect },
    }
    setIsDragging(true)
  }, [rect])

  useEffect(() => {
    if (!isDragging) return

    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current
      if (!drag) return

      if (drag.handle === null) {
        // New selection drag
        const pos = screenToImage(
          e.clientX - (overlayRef.current?.getBoundingClientRect().left ?? 0),
          e.clientY - (overlayRef.current?.getBoundingClientRect().top  ?? 0),
          imgOriginScreen.sx, imgOriginScreen.sy, viewport.zoom, 0, 0
        )
        const x = Math.min(drag.startX, pos.x)
        const y = Math.min(drag.startY, pos.y)
        const w = Math.abs(pos.x - drag.startX)
        const h = Math.abs(pos.y - drag.startY)
        setRect(clampRect({ x, y, width: w, height: h }))
        return
      }

      const dx = (e.clientX - drag.startX) / viewport.zoom
      const dy = (e.clientY - drag.startY) / viewport.zoom
      const o = drag.origRect

      let nx = o.cropX, ny = o.cropY, nw = o.cropW, nh = o.cropH

      switch (drag.handle) {
        case "move": nx = o.cropX + dx; ny = o.cropY + dy; break
        case "tl":   nx = o.cropX + dx; ny = o.cropY + dy; nw = o.cropW - dx; nh = o.cropH - dy; break
        case "tr":                  ny = o.cropY + dy; nw = o.cropW + dx; nh = o.cropH - dy; break
        case "bl":   nx = o.cropX + dx;                nw = o.cropW - dx; nh = o.cropH + dy; break
        case "br":                                  nw = o.cropW + dx; nh = o.cropH + dy; break
        case "t":                   ny = o.cropY + dy;                     nh = o.cropH - dy; break
        case "b":                                                       nh = o.cropH + dy; break
        case "l":    nx = o.cropX + dx;                nw = o.cropW - dx;                     break
        case "r":                                   nw = o.cropW + dx;                     break
      }

      setRect(clampRect({ x: nx, y: ny, width: nw, height: nh }))
    }

    const onUp = () => {
      dragRef.current = null
      setIsDragging(false)
    }

    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup",   onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup",   onUp)
    }
  }, [isDragging, viewport.zoom, imgOriginScreen, setRect]) // eslint-disable-line

  const handleApply = () => {
    if (!rect || !pendingNodeId) return
    snapshot()
    updateNodeData(pendingNodeId, {
        cropX: Math.round(rect.x),
        cropY: Math.round(rect.y),
        cropW: Math.round(rect.width),
        cropH: Math.round(rect.height),
    } as Partial<EditorNodeData>)
    deactivate()
  }

  const handleCancel = () => deactivate()

  if (!isActive) return null

  // ── Render ──────────────────────────────────────────────────
  const HANDLE_SIZE = 8

  const handles: { id: Handle; style: React.CSSProperties; cursor: string }[] = screenRect ? [
    { id: "tl",   style: { top: -HANDLE_SIZE/2, left: -HANDLE_SIZE/2 },                                                   cursor: "nwse-resize" },
    { id: "tr",   style: { top: -HANDLE_SIZE/2, left: screenRect.width - HANDLE_SIZE/2 },                                 cursor: "nesw-resize" },
    { id: "bl",   style: { top: screenRect.height - HANDLE_SIZE/2, left: -HANDLE_SIZE/2 },                                cursor: "nesw-resize" },
    { id: "br",   style: { top: screenRect.height - HANDLE_SIZE/2, left: screenRect.width - HANDLE_SIZE/2 },              cursor: "nwse-resize" },
    { id: "t",    style: { top: -HANDLE_SIZE/2, left: screenRect.width/2 - HANDLE_SIZE/2 },                               cursor: "ns-resize"   },
    { id: "b",    style: { top: screenRect.height - HANDLE_SIZE/2, left: screenRect.width/2 - HANDLE_SIZE/2 },            cursor: "ns-resize"   },
    { id: "l",    style: { top: screenRect.height/2 - HANDLE_SIZE/2, left: -HANDLE_SIZE/2 },                              cursor: "ew-resize"   },
    { id: "r",    style: { top: screenRect.height/2 - HANDLE_SIZE/2, left: screenRect.width - HANDLE_SIZE/2 },            cursor: "ew-resize"   },
  ] : []

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-20"
      style={{ cursor: isDragging ? "crosshair" : "crosshair" }}
      onMouseDown={onOverlayMouseDown}
    >
      {/* Dark vignette outside selection */}
      {screenRect && (
        <>
          {/* top */}
          <div className="absolute" style={{ top: 0, left: 0, right: 0, height: screenRect.top, background: "rgba(0,0,0,0.55)" }} />
          {/* bottom */}
          <div className="absolute" style={{ top: screenRect.top + screenRect.height, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.55)" }} />
          {/* left */}
          <div className="absolute" style={{ top: screenRect.top, left: 0, width: screenRect.left, height: screenRect.height, background: "rgba(0,0,0,0.55)" }} />
          {/* right */}
          <div className="absolute" style={{ top: screenRect.top, left: screenRect.left + screenRect.width, right: 0, height: screenRect.height, background: "rgba(0,0,0,0.55)" }} />

          {/* Selection box */}
          <div
            className="absolute border-2 border-white"
            style={{
              left: screenRect.left, top: screenRect.top,
              width: screenRect.width, height: screenRect.height,
              cursor: "move",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
            }}
            onMouseDown={(e) => onHandleMouseDown(e, "move")}
          >
            {/* Rule-of-thirds grid lines */}
            <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.3 }}>
              <div className="absolute border-t border-white" style={{ top: "33.33%", left: 0, right: 0 }} />
              <div className="absolute border-t border-white" style={{ top: "66.66%", left: 0, right: 0 }} />
              <div className="absolute border-l border-white" style={{ left: "33.33%", top: 0, bottom: 0 }} />
              <div className="absolute border-l border-white" style={{ left: "66.66%", top: 0, bottom: 0 }} />
            </div>

            {/* Resize handles */}
            {handles.map(({ id, style, cursor }) => (
              <div
                key={id}
                className="absolute bg-white rounded-sm shadow-md"
                style={{ width: HANDLE_SIZE, height: HANDLE_SIZE, cursor, ...style }}
                onMouseDown={(e) => { e.stopPropagation(); onHandleMouseDown(e, id) }}
              />
            ))}
          </div>

          {/* Size label */}
          <div
            className="absolute px-2 py-0.5 rounded text-xs text-white font-mono pointer-events-none"
            style={{
              left:  screenRect.left,
              top:   screenRect.top + screenRect.height + 6,
              background: "rgba(0,0,0,0.7)",
            }}
          >
            {Math.round(rect?.width ?? 0)} × {Math.round(rect?.height ?? 0)} px
          </div>
        </>
      )}

      {/* Toolbar */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-xl shadow-2xl"
        style={{ background: "#1c2128", border: "1px solid #30363d", zIndex: 30 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span className="text-xs text-zinc-400 mr-1">Crop</span>
        <button
          onClick={handleCancel}
          className="px-3 py-1 rounded-md text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleApply}
          disabled={!rect || rect.width < 2 || rect.height < 2}
          className="px-3 py-1 rounded-md text-xs bg-blue-600 hover:bg-blue-500 text-white
            transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Apply Crop
        </button>
      </div>
    </div>
  )
}

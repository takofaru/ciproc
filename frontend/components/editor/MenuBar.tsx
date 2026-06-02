"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useProjectStore } from "@/stores/project-store"
import { useCanvasStore } from "@/stores/canvas-store"
import { useGraphStore } from "@/stores/graph-store"
import { projectApi } from "@/lib/api/project-api"
import { executePipeline } from "@/lib/graph/pipeline-executor"
import { nanoid } from "nanoid"
import type { EditorNode, EditorEdge } from "@/types/graph"

// ── Types ────────────────────────────────────────────────────
type MenuItemDef =
  | { label: string; shortcut?: string; action: () => void; disabled?: boolean }
  | { separator: true }

interface MenuDef {
  label: string
  items: MenuItemDef[]
}

// ── Dropdown ─────────────────────────────────────────────────
function MenuDropdown({
  items, onClose,
}: {
  items: MenuItemDef[]
  onClose: () => void
}) {
  return (
    <div className="menu-dropdown">
      {items.map((item, i) => {
        if ("separator" in item) {
          return <div key={i} className="menu-separator" />
        }
        return (
          <button
            key={i}
            disabled={item.disabled}
            onClick={() => { item.action(); onClose() }}
            className="menu-dropdown-item"
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="menu-shortcut">{item.shortcut}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── MenuBar ──────────────────────────────────────────────────
export function MenuBar() {
  const router = useRouter()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeProject = useProjectStore((s) => s.activeProject)
  const { sourceImage, processedImage, imageTransform, setSourceImage, setProcessedImage, setImageTransform, resetImageTransform, resetViewport, isPyodideReady, isProcessing } = useCanvasStore()
  const { nodes, edges, setNodes, setEdges } = useGraphStore()

  // Close on outside click
  useEffect(() => {
    if (!openMenu) return
    const handler = () => setOpenMenu(null)
    window.addEventListener("click", handler)
    return () => window.removeEventListener("click", handler)
  }, [openMenu])

  const toggle = (label: string) => (e: React.MouseEvent) => {
    e.stopPropagation()
    setOpenMenu((v) => (v === label ? null : label))
  }

  // ── Actions ─────────────────────────────────────────────────
  const saveProject = useCallback(async () => {
    if (!activeProject) return
    await projectApi.update(activeProject.id, {
      nodes: nodes as EditorNode[],
      edges: edges as EditorEdge[],
    })
  }, [activeProject, nodes, edges])

  const importImage = () => fileInputRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeProject) return
    // Show preview immediately
    const reader = new FileReader()
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string
      setSourceImage(b64)
      setProcessedImage(b64)
    }
    reader.readAsDataURL(file)
    // Upload to backend
    await projectApi.uploadImage(activeProject.id, file)
  }

  const exportImage = useCallback(async () => {
    if (!sourceImage) return
    const geoParams = {
      rotation: imageTransform.rotation,
      scaleX: imageTransform.scaleX,
      scaleY: imageTransform.scaleY,
      translateX: imageTransform.x,
      translateY: imageTransform.y,
    }
    const finalImage = await executePipeline(sourceImage, nodes, edges, geoParams)
    const link = document.createElement("a")
    link.href = finalImage
    link.download = `${activeProject?.name ?? "export"}.jpg`
    link.click()
  }, [sourceImage, imageTransform, nodes, edges, activeProject])

  const resetGraph = () => {
    const inputId = nanoid()
    const brightnessId = nanoid()
    const outputId = nanoid()
    setNodes([
      { id: inputId,      type: "imageInput", position: { x: 60, y: 120 },  data: {} },
      { id: brightnessId, type: "brightness",  position: { x: 280, y: 120 }, data: { value: 0 } },
      { id: outputId,     type: "output",      position: { x: 500, y: 120 }, data: {} },
    ])
    setEdges([
      { id: nanoid(), source: inputId, target: brightnessId },
      { id: nanoid(), source: brightnessId, target: outputId },
    ])
  }

  // ── Menu definitions ─────────────────────────────────────────
  const menus: MenuDef[] = [
    {
      label: "File",
      items: [
        { label: "Save",           shortcut: "⌘S",  action: saveProject, disabled: !activeProject },
        { separator: true },
        { label: "Import Image…",  shortcut: "⌘O",  action: importImage },
        { label: "Export as JPG",  shortcut: "⌘E",  action: exportImage, disabled: !processedImage },
        { separator: true },
        { label: "Back to Projects", action: () => router.push("/") },
      ],
    },
    {
      label: "Edit",
      items: [
        { label: "Reset Node Graph", action: resetGraph },
        { separator: true },
        { label: "Reset Transform",  action: resetImageTransform },
        { label: "Reset Viewport",   action: resetViewport },
      ],
    },
    {
      label: "Image",
      items: [
        { label: "Flip Horizontal", action: () => setImageTransform({ scaleX: imageTransform.scaleX * -1 }), disabled: !sourceImage },
        { label: "Flip Vertical",   action: () => setImageTransform({ scaleY: imageTransform.scaleY * -1 }), disabled: !sourceImage },
        { separator: true },
        { label: "Rotate 90° CW",   action: () => setImageTransform({ rotation: (imageTransform.rotation + 90) % 360 }), disabled: !sourceImage },
        { label: "Rotate 90° CCW",  action: () => setImageTransform({ rotation: (imageTransform.rotation - 90 + 360) % 360 }), disabled: !sourceImage },
        { label: "Rotate 180°",     action: () => setImageTransform({ rotation: (imageTransform.rotation + 180) % 360 }), disabled: !sourceImage },
      ],
    },
    {
      label: "Filter",
      items: [
        { label: "Apply via Node Graph", action: () => {}, disabled: true },
        { separator: true },
        { label: "Add Brightness Node", action: () => addNode("brightness") },
        { label: "Add Contrast Node",   action: () => addNode("contrast") },
        { label: "Add Grayscale Node",  action: () => addNode("grayscale") },
        { label: "Add Blur Node",       action: () => addNode("blur") },
        { label: "Add Sharpen Node",    action: () => addNode("sharpen") },
        { label: "Add Edge Detect",     action: () => addNode("edge") },
      ],
    },
    {
      label: "View",
      items: [
        { label: "Fit to Screen",  shortcut: "⌘0", action: () => resetViewport() },
        { label: "Zoom 100%",      shortcut: "⌘1", action: () => useCanvasStore.getState().setViewport({ zoom: 1 }) },
        { label: "Zoom 200%",      action: () => useCanvasStore.getState().setViewport({ zoom: 2 }) },
        { label: "Zoom 50%",       action: () => useCanvasStore.getState().setViewport({ zoom: 0.5 }) },
      ],
    },
  ]

  function addNode(type: string) {
    const offset = (nodes.length % 6) * 40
    setNodes([
      ...nodes,
      { id: nanoid(), type, position: { x: 200 + offset, y: 100 + offset }, data: {} },
    ])
  }

  return (
    <div className="menu-bar" onClick={(e) => e.stopPropagation()}>
      {/* Logo */}
      <div className="menu-logo">
        <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          PS
        </div>
      </div>

      {/* Menus */}
      {menus.map((menu) => (
        <div key={menu.label} className="relative">
          <button
            onClick={toggle(menu.label)}
            className={`menu-item ${openMenu === menu.label ? "menu-item-active" : ""}`}
          >
            {menu.label}
          </button>
          {openMenu === menu.label && (
            <MenuDropdown items={menu.items} onClose={() => setOpenMenu(null)} />
          )}
        </div>
      ))}

      {/* Project name */}
      <div className="menu-bar-center">
        <span className="text-sm text-zinc-400">
          {activeProject?.name ?? ""}
        </span>
        {isProcessing && (
          <span className="text-xs text-yellow-400 animate-pulse ml-3">● Processing…</span>
        )}
      </div>

      {/* Right side status */}
      <div className="menu-bar-right">
        <span className={`text-xs flex items-center gap-1.5 ${isPyodideReady ? "text-emerald-500" : "text-zinc-600"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isPyodideReady ? "bg-emerald-500" : "bg-zinc-600"}`} />
          {isPyodideReady ? "Python ready" : "Loading engine…"}
        </span>

        <button onClick={saveProject} disabled={!activeProject} className="menu-save-btn">
          Save
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

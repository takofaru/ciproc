"use client"

import { MenuBar } from "./MenuBar"
import { Inspector } from "./Inspector"
import { Statusbar } from "./Statusbar"
import { NodeEditor } from "../graph/NodeEditor"
import { CanvasPreview } from "../canvas/CanvasPreview"
import { useGraphStore } from "@/stores/graph-store"
import { useEffect } from "react"

export function EditorLayout() {
  // keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return 

      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        useGraphStore.getState().undo()
      }

      if (e.key === "z" && e.shiftKey || e.key === "y") {
        e.preventDefault()
        useGraphStore.getState().redo()
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, []
)
  return (
    <main className="editor-layout">
      <MenuBar />

      <section className="editor-main">
        <CanvasPreview />
        <Inspector />
      </section>

      <section className="editor-bottom">
        <NodeEditor />
      </section>

      <Statusbar />
    </main>
  )
}

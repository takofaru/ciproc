"use client"

import { MenuBar } from "./MenuBar"
import { Inspector } from "./Inspector"
import { Statusbar } from "./Statusbar"
import { NodeEditor } from "../graph/NodeEditor"
import { CanvasPreview } from "../canvas/CanvasPreview"

export function EditorLayout() {
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

"use client"

import { TopBar } from './Topbar';
import { Sidebar } from "./Sidebar"
import { Inspector } from "./Inspector"
import { Statusbar } from "./Statusbar"
import { NodeEditor } from "../graph/NodeEditor"
import { CanvasPreview } from "../canvas/CanvasPreview"

export function EditorLayout() {
  return (
    <main className="editor-layout">
      <TopBar />

      <section className="editor-main">
        <Sidebar />

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

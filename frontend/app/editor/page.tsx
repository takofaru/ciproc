import { redirect } from "next/navigation"

// /editor now redirects to dashboard
export default function EditorIndex() {
  redirect("/")
}

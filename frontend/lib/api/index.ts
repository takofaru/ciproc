/**
 * Toggle between real API and mock by changing one line here.
 *
 * Mode MOCK  → set USE_MOCK = true  (no backend needed)
 * Mode REAL  → set USE_MOCK = false (backend must be running)
 */

import { projectApi as realApi } from "./project-api"
import { mockProjectApi } from "./mock-project-api"

const USE_MOCK = false

export const projectApi = USE_MOCK ? mockProjectApi : realApi
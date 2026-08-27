/*
 * The fixed set of street-issue categories a citizen can choose from.
 *
 * These are deliberately locked (see the project scope: physical street
 * infrastructure only). The `id` is what the backend will store; the `label`
 * and `description` are what the citizen sees.
 *
 * Icons are `lucide-react` components. We pass the component itself (not JSX)
 * so the rendering component decides the size and colour.
 */
import {
  TrafficCone,
  Signpost,
  Lightbulb,
  Milestone,
  Footprints,
  Waves,
} from 'lucide-react'

export const categories = [
  {
    id: 'pothole',
    label: 'Potholes',
    description: 'Holes or broken patches in the road surface.',
    Icon: TrafficCone,
  },
  {
    id: 'road_sign',
    label: 'Damaged road signs',
    description: 'Signs that are bent, missing, faded or hard to read.',
    Icon: Signpost,
  },
  {
    id: 'streetlight',
    label: 'Broken streetlights',
    description: 'Lights that stay off at night or flicker.',
    Icon: Lightbulb,
  },
  {
    id: 'road_marking',
    label: 'Faded road markings',
    description: 'Worn-out lane lines, crossings or stop lines.',
    Icon: Milestone,
  },
  {
    id: 'footpath',
    label: 'Damaged footpaths',
    description: 'Cracked, blocked or uneven pavements.',
    Icon: Footprints,
  },
  {
    id: 'drain',
    label: 'Blocked roadside drains',
    description: 'Drains that overflow or are clogged with waste.',
    Icon: Waves,
  },
]

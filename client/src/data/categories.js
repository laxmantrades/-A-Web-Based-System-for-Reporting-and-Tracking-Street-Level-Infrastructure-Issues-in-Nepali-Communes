/*
 * The six report categories (fixed, street problems only).
 * id = saved in backend, label/description = what the citizen sees.
 * icon is a lucide component, tint = tile colours.
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
    tint: 'bg-orange-50 text-orange-600',
    label: 'Potholes',
    description: 'Holes or broken patches in the road surface.',
    Icon: TrafficCone,
  },
  {
    id: 'road_sign',
    tint: 'bg-blue-50 text-blue-600',
    label: 'Damaged road signs',
    description: 'Signs that are bent, missing, faded or hard to read.',
    Icon: Signpost,
  },
  {
    id: 'streetlight',
    tint: 'bg-amber-50 text-amber-600',
    label: 'Broken streetlights',
    description: 'Lights that stay off at night or flicker.',
    Icon: Lightbulb,
  },
  {
    id: 'road_marking',
    tint: 'bg-violet-50 text-violet-600',
    label: 'Faded road markings',
    description: 'Worn-out lane lines, crossings or stop lines.',
    Icon: Milestone,
  },
  {
    id: 'footpath',
    tint: 'bg-teal-50 text-teal-600',
    label: 'Damaged footpaths',
    description: 'Cracked, blocked or uneven pavements.',
    Icon: Footprints,
  },
  {
    id: 'drain',
    tint: 'bg-cyan-50 text-cyan-600',
    label: 'Blocked roadside drains',
    description: 'Drains that overflow or are clogged with waste.',
    Icon: Waves,
  },
]

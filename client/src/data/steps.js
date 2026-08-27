/*
 * The three steps shown in the "How it works" section.
 *
 * `audience` lets the UI label who does each step (citizen vs ward officer),
 * which matches the two roles in the system.
 */
import { Camera, ClipboardCheck, BellRing } from 'lucide-react'

export const steps = [
  {
    id: 1,
    audience: 'You',
    title: 'Snap a photo and pick a category',
    body: 'Add a photo, choose what kind of problem it is, drop a location on the map and suggest how urgent it feels. It takes about a minute.',
    Icon: Camera,
  },
  {
    id: 2,
    audience: 'Ward officer',
    title: 'An officer reviews it',
    body: 'The report lands on the officer dashboard. An AI photo check gives the officer a quick hint about whether the photo matches the category — a person always makes the real decision.',
    Icon: ClipboardCheck,
  },
  {
    id: 3,
    audience: 'You',
    title: 'Track it until it is resolved',
    body: 'Every status change is recorded, so you can see when the report is acknowledged, scheduled and finally fixed.',
    Icon: BellRing,
  },
]

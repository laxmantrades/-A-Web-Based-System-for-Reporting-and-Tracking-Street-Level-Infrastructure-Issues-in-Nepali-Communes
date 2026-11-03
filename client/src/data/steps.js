/* The three "How it works" steps. audience = citizen or ward officer. */
import { Camera, ClipboardCheck, BellRing } from 'lucide-react'

export const steps = [
  {
    id: 1,
    audience: 'You',
    title: 'Snap a photo and pick a category',
    body: 'Add a photo, choose what kind of problem it is, and use your location or describe where it is. It takes about a minute.',
    Icon: Camera,
  },
  {
    id: 2,
    audience: 'Ward officer',
    title: 'An officer reviews it',
    body: 'The report lands on your ward office’s dashboard. An officer checks the photo and location and decides what happens next.',
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

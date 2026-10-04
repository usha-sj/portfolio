// DRAFT: rewrite in my own voice.
// The Maps app's route: one stop per chapter, in order. Experience entries join a stop via
// their `stop` field (src/content/experience/*.md).
//
// Positions are generated: stops sit near the river at uneven spacing and distances, sometimes
// switching banks (src/lib/mapgen.ts, run at build time). The route between them follows the
// generated roads. To pin a stop somewhere specific, give it
// `x` / `y` (map units, see mapSize). Change `seed` to try a different map.

export type StepKind = 'start' | 'arrive' | 'here';

export interface Stop {
  id: string;
  step: StepKind; // "Start", "Arrive" or "You are here" in the directions list
  city: string;
  country: string;
  dates: string;
  // Shown on the place card when the stop has no entries (e.g. "You are here")
  note?: string;
  // Pin glyph. Defaults to the most common type among the stop's entries; set to override.
  glyph?: 'work' | 'research' | 'education' | 'leadership';
  // Optional manual position override (map units)
  x?: number;
  y?: number;
}

// Any whole number. The same seed always draws the same map.
export const seed = 1; // picked for a gentle route (1.18× the straight-line distance), uneven spacing, mixed banks

export const mapSize = { width: 2800, height: 1400 };
// How large the map is drawn at zoom 1 (1 = map units as pixels).
export const mapScale = 0.55;

export const stops: Stop[] = [
  { id: 'phnom-penh', step: 'start', city: 'Phnom Penh', country: 'Cambodia', dates: '2020 – 2022' },
  { id: 'toronto-start', step: 'arrive', city: 'Toronto', country: 'Canada', dates: '2022 – 2024' },
  { id: 'toronto-cs', step: 'arrive', city: 'Toronto', country: 'Canada', dates: '2024 – 2025' },
  { id: 'montreal', step: 'arrive', city: 'Montreal', country: 'Canada', dates: 'Summer 2025' },
  { id: 'helsinki', step: 'arrive', city: 'Helsinki', country: 'Finland', dates: 'Fall 2025' },
  { id: 'toronto-2026', step: 'arrive', city: 'Toronto', country: 'Canada', dates: 'Winter 2026' },
  {
    id: 'here',
    step: 'here',
    city: 'You are here',
    country: '',
    dates: 'Jan 2027 →',
    note: 'Finishing my degree in January 2027 and looking for full-time software engineering, ML and product roles. Mail is in the dock if you’d like to say hi.',
  },
];

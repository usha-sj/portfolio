// DRAFT: rewrite in my own voice.
// The Maps app's route: one stop per chapter, in order. Experience entries join a stop via
// their `stop` field (src/content/experience/*.md).
//
// x / y: where the pin sits on the map canvas (mapSize below), in canvas pixels.
// The route is a left-to-right zigzag through the stops.

export type StepKind = 'start' | 'arrive' | 'here';

export interface Stop {
  id: string;
  step: StepKind; // "Start", "Arrive" or "You are here" in the directions list
  city: string;
  country: string;
  dates: string;
  caption: string;
  // Shown on the place card when the stop has no entries (e.g. "You are here")
  note?: string;
  x: number;
  y: number;
}

export const mapSize = { width: 2300, height: 1000 };
// How large the map is drawn (1 = canvas pixels). Smaller shows more stops at once.
export const mapScale = 0.62;

export const stops: Stop[] = [
  { id: 'phnom-penh', step: 'start', city: 'Phnom Penh', country: 'Cambodia', dates: '2020 – 2022', caption: 'where it started', x: 220, y: 640 },
  { id: 'toronto-start', step: 'arrive', city: 'Toronto', country: 'Canada', dates: '2022 – 2024', caption: 'politics & econ', x: 540, y: 360 },
  { id: 'toronto-cs', step: 'arrive', city: 'Toronto', country: 'Canada', dates: '2024 – 2025', caption: 'switching to CS', x: 860, y: 660 },
  { id: 'montreal', step: 'arrive', city: 'Montreal', country: 'Canada', dates: 'Summer 2025', caption: 'first SWE internship', x: 1180, y: 350 },
  { id: 'helsinki', step: 'arrive', city: 'Helsinki', country: 'Finland', dates: 'Fall 2025', caption: 'exchange semester', x: 1500, y: 620 },
  { id: 'toronto-2026', step: 'arrive', city: 'Toronto', country: 'Canada', dates: 'Winter 2026', caption: 'shipping things', x: 1820, y: 330 },
  {
    id: 'here',
    step: 'here',
    city: 'You are here',
    country: '',
    dates: 'Jan 2027 →',
    caption: 'what’s next',
    note: 'Finishing my degree in January 2027 and looking for full-time software engineering, ML and product roles. Mail is in the dock if you’d like to say hi.',
    x: 2100,
    y: 600,
  },
];

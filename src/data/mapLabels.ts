// DRAFT: rewrite in my own voice.
// Place names on the Maps (Experience) background. Placed automatically at build time
// (src/lib/mapgen.ts): a label with `nearStop` goes close to that stop (ids in src/data/route.ts),
// the rest are scattered. A label that can't fit without overlapping a pin, a stop label or
// another label is skipped (the build logs which ones).
//
// Types:
//   neighbourhood  small caps, upright
//   street / road  follow the street's curve (road = a major road)
//   park           gets its own green patch + a category badge
//   poi            a place with a category badge (school, café…), no patch
//   water          on the river, or on the lake with `on: 'lake'`
// Anything still containing [brackets] is hidden until you replace it.

export type MapLabelType = 'neighbourhood' | 'street' | 'road' | 'park' | 'poi' | 'water';
export type PoiCategory = 'park' | 'sports' | 'school' | 'cafe' | 'food' | 'spa' | 'landmark';

export interface MapLabel {
  text: string;
  type: MapLabelType;
  nearStop?: string;
  // Badge icon + colour for parks and POIs (parks default to 'park')
  category?: PoiCategory;
  // Water labels: river (default) or the lake
  on?: 'river' | 'lake';
}

// Little route shields on the highway, in order along it
export const highwayShields = ['2', '404'];

export const mapLabels: MapLabel[] = [
  { text: 'Tonlé Sap', type: 'water', on: 'lake' },
  { text: 'The Detour', type: 'water' },

  { text: 'Mekong Quarter', type: 'neighbourhood', nearStop: 'phnom-penh' },
  { text: 'Weteka Way', type: 'street', nearStop: 'phnom-penh' },
  { text: 'Podcast Lane', type: 'street', nearStop: 'phnom-penh' },

  { text: 'Pareto Heights', type: 'neighbourhood', nearStop: 'toronto-start' },
  { text: 'Keynes Crescent', type: 'street', nearStop: 'toronto-start' },
  { text: 'Supply & Demand St', type: 'street', nearStop: 'toronto-start' },

  { text: 'Cache Hill', type: 'neighbourhood', nearStop: 'toronto-cs' },
  { text: 'Dijkstra Ave', type: 'street', nearStop: 'toronto-cs' },
  { text: 'WallyHacks Commons', type: 'poi', category: 'school', nearStop: 'toronto-cs' },
  { text: 'Robot Soccer Field', type: 'park', category: 'sports', nearStop: 'toronto-cs' },

  { text: 'Bagel Bend', type: 'street', nearStop: 'montreal' },
  { text: 'Sprint Row', type: 'street', nearStop: 'montreal' },

  { text: 'Contraction Hwy', type: 'road', nearStop: 'helsinki' },
  { text: 'Sauna Square', type: 'poi', category: 'spa', nearStop: 'helsinki' },
  { text: 'Convolution Ct', type: 'street', nearStop: 'helsinki' },

  { text: 'SpendWise Gardens', type: 'park', nearStop: 'toronto-2026' },
  { text: 'Socrato Park', type: 'park', nearStop: 'toronto-2026' },
  { text: 'Merge Conflict', type: 'neighbourhood', nearStop: 'toronto-2026' },

  // It's all downhill from here
  { text: 'Gradient Descent Rd', type: 'road', nearStop: 'here' },
  { text: 'Office Hours', type: 'neighbourhood', nearStop: 'here' },

  { text: 'A* Expressway', type: 'road' },
  { text: 'Backprop Blvd', type: 'road' },
  { text: 'Deadline District', type: 'neighbourhood' },
  { text: '[my favourite café]', type: 'poi', category: 'cafe' },
  { text: '[a place I love]', type: 'poi', category: 'landmark' },
];

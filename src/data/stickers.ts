// Stickers on the Notes app. Put PNGs in public/stickers/ and set `src`
// (e.g. '/stickers/cat.png'). With an empty src a coloured placeholder shape is drawn.
//
// x / y: starting position of the sticker's top-left corner, as % of the note.
// Keep them near the edges so the text column in the middle stays clear.
// width: px at a 750px-wide note; scales with the note (and shrinks on phones). rotation: degrees.
// float: gently bobs while idle (use on a few, not all).

export type PlaceholderShape = 'star' | 'heart' | 'flower' | 'circle' | 'tape' | 'sparkle';

export interface Sticker {
  id: string;
  note: string; // note id from src/data/notes.ts
  src: string;
  alt: string; // empty = decorative
  x: number;
  y: number;
  rotation: number;
  width: number;
  float?: boolean;
  /**
   * sticker:  image (or a placeholder shape until `src` is set)
   * polaroid: photo print with a handwritten caption
   * emoji:    a Unicode emoji character; renders in the visitor's emoji font
   *           (Apple Color Emoji on Apple devices)
   * label:    a small handwritten pill with a gradient background
   */
  kind?: 'sticker' | 'polaroid' | 'emoji' | 'label';
  caption?: string; // polaroid only
  emoji?: string; // emoji only
  text?: string; // label only
  // Placeholder shape until a real image is added. Colours are token names from tokens.css;
  // add color2 for a gradient (top-left → bottom-right). Labels use these for their background.
  placeholder?: { shape: PlaceholderShape; color: string; color2?: string };
}

export const stickers: Sticker[] = [
  // ---- about me ----
  // The text column is roughly the middle 52% (x ≈ 24–76); keep stickers outside it.
  {
    id: 'me',
    note: 'about',
    kind: 'polaroid',
    src: '/photos/usha-polaroid.jpg',
    alt: 'Usha smiling by a waterfront railing, with the sea and mountains behind her',
    caption: 'that\'s me!',
    x: 76.5,
    y: 3,
    rotation: 4,
    width: 160,
  },
  { id: 'tape', note: 'about', src: '', alt: '', x: 81, y: 1, rotation: -8, width: 84, placeholder: { shape: 'tape', color: '--ink-200' } },

  // Small stickers sit beside the paragraph they're about (y ≈ where that paragraph is).
  // Paragraph bands (% of the note): title 6–12, "Hey" 15–18, heritage 21–36,
  // UofT switch 39–51, CS/Helsinki 54–72, "right now" 75–90.

  // Title + "Hey, I'm Usha."
  { id: 'star', note: 'about', src: '', alt: '', x: 4, y: 2, rotation: -12, width: 58, float: true, placeholder: { shape: 'star', color: '--burgundy-100', color2: '--burgundy-300' } },
  // Flags sit on the "Hey, I'm Usha." line, just after the text
  { id: 'flag-kh', note: 'about', kind: 'emoji', emoji: '🇰🇭', src: '', alt: '', x: 39.5, y: 14.8, rotation: -6, width: 30 },
  { id: 'flag-in', note: 'about', kind: 'emoji', emoji: '🇮🇳', src: '', alt: '', x: 44, y: 14.8, rotation: 6, width: 30 },

  // Cambodian + Indian, five countries, Google Maps
  { id: 'hanuman', note: 'about', src: '/stickers/hanuman.png', alt: '', x: 5, y: 12, rotation: -5, width: 88 },
  { id: 'lotus', note: 'about', kind: 'emoji', emoji: '🪷', src: '', alt: '', x: 13, y: 35, rotation: -6, width: 46, float: true },
  { id: 'plane', note: 'about', kind: 'emoji', emoji: '✈️', src: '', alt: '', x: 80, y: 29, rotation: -14, width: 38 },
  { id: 'map', note: 'about', kind: 'emoji', emoji: '🗺️', src: '', alt: '', x: 89, y: 31, rotation: 8, width: 42 },

  // Politics & Economics → CS at UofT
  { id: 'laptop', note: 'about', kind: 'emoji', emoji: '💻', src: '', alt: '', x: 81, y: 39, rotation: -6, width: 44 },
  { id: 'matcha', note: 'about', src: '/stickers/matcha.png', alt: '', x: 6, y: 42, rotation: 6, width: 72, float: true },

  // CS Specialist, Helsinki, contraction hierarchies (route-finding), AI + full-stack
  { id: 'grad', note: 'about', kind: 'emoji', emoji: '🎓', src: '', alt: '', x: 89, y: 45, rotation: -8, width: 44 },
  { id: 'snow', note: 'about', kind: 'emoji', emoji: '❄️', src: '', alt: '', x: 16, y: 61, rotation: 0, width: 30, float: true },
  { id: 'sparkles', note: 'about', kind: 'emoji', emoji: '✨', src: '', alt: '', x: 9, y: 67, rotation: 0, width: 34, float: true },
  { id: 'latte', note: 'about', src: '/stickers/latte.png', alt: '', x: 80, y: 56, rotation: -8, width: 92 },
  { id: 'compass', note: 'about', kind: 'emoji', emoji: '🧭', src: '', alt: '', x: 92, y: 66, rotation: 12, width: 34 },

  // right now: roles + "Mail is in the dock"
  { id: 'gold-star', note: 'about', kind: 'emoji', emoji: '⭐', src: '', alt: '', x: 17, y: 76, rotation: 12, width: 36 },
  { id: 'heart', note: 'about', src: '', alt: '', x: 6, y: 80, rotation: 10, width: 46, placeholder: { shape: 'heart', color: '--burgundy-300', color2: '--burgundy-700' } },
  { id: 'tulip', note: 'about', kind: 'emoji', emoji: '🌷', src: '', alt: '', x: 15, y: 87, rotation: -10, width: 40 },
  { id: 'letter', note: 'about', kind: 'emoji', emoji: '💌', src: '', alt: '', x: 81, y: 82, rotation: -6, width: 46, float: true },
  { id: 'sparkle', note: 'about', src: '', alt: '', x: 92, y: 77, rotation: 14, width: 36, placeholder: { shape: 'sparkle', color: '--burgundy-100', color2: '--burgundy-500' } },
  { id: 'mini-heart', note: 'about', src: '', alt: '', x: 93, y: 90, rotation: -12, width: 28, placeholder: { shape: 'heart', color: '--ink-200', color2: '--ink-500' } },

  // ---- currently ----
  { id: 'currently-tape', note: 'currently', src: '', alt: '', x: 80, y: 6, rotation: 10, width: 90, placeholder: { shape: 'tape', color: '--burgundy-100' } },
  { id: 'currently-coffee', note: 'currently', kind: 'emoji', emoji: '☕', src: '', alt: '', x: 85, y: 30, rotation: 8, width: 46, float: true },
  { id: 'currently-star', note: 'currently', src: '', alt: '', x: 5, y: 60, rotation: -10, width: 60, float: true, placeholder: { shape: 'star', color: '--ink-200', color2: '--ink-500' } },
  { id: 'currently-film', note: 'currently', kind: 'emoji', emoji: '🎞️', src: '', alt: '', x: 16, y: 79, rotation: -10, width: 44 },
  { id: 'currently-camera', note: 'currently', kind: 'emoji', emoji: '📸', src: '', alt: '', x: 70, y: 79, rotation: -10, width: 44 },

  // Hiking (left) + cake (right), with matching emoji
  {
    id: 'currently-hiking',
    note: 'currently',
    src: '/stickers/hiking.png',
    alt: 'DRAFT: Hiking in the rain in a hooded jacket, carrying a navy backpack',
    x: 4,
    y: 6,
    rotation: -3,
    width: 94,
  },
  { id: 'currently-rain', note: 'currently', kind: 'emoji', emoji: '🌧️', src: '', alt: '', x: 16, y: 3, rotation: 6, width: 38, float: true },
  { id: 'currently-mountain', note: 'currently', kind: 'emoji', emoji: '⛰️', src: '', alt: '', x: 15, y: 38, rotation: -4, width: 46 },
  { id: 'currently-boot', note: 'currently', kind: 'emoji', emoji: '🥾', src: '', alt: '', x: 17, y: 52, rotation: 10, width: 34 },
  { id: 'currently-cake', note: 'currently', src: '/stickers/cake.png', alt: '', x: 77, y: 44, rotation: 4, width: 132 },
  { id: 'currently-cupcake', note: 'currently', kind: 'emoji', emoji: '🧁', src: '', alt: '', x: 90, y: 62, rotation: -8, width: 36, float: true },

  // ---- things I love ----
  // Paper is 20 lines tall (minLines in notes.ts), so y is a % of 560px.
  {
    id: 'little-usha',
    note: 'loves',
    src: '/stickers/little-usha.png',
    alt: 'DRAFT: Usha as a toddler, grinning with her eyes scrunched shut, wearing a crown made of leaves',
    x: 4,
    y: 5.6,
    rotation: -4,
    width: 112,
  },
  { id: 'loves-heart', note: 'loves', src: '', alt: '', x: 84, y: 5.6, rotation: 8, width: 62, float: true, placeholder: { shape: 'heart', color: '--burgundy-100', color2: '--burgundy-500' } },
  { id: 'loves-map', note: 'loves', kind: 'emoji', emoji: '🗺️', src: '', alt: '', x: 80, y: 25.2, rotation: 8, width: 42 },
  { id: 'loves-idea', note: 'loves', kind: 'emoji', emoji: '💡', src: '', alt: '', x: 90, y: 37.8, rotation: -10, width: 36, float: true },
  { id: 'loves-pin', note: 'loves', kind: 'emoji', emoji: '📌', src: '', alt: '', x: 16, y: 49, rotation: -12, width: 34 },
  { id: 'loves-chopsticks', note: 'loves', kind: 'emoji', emoji: '🥢', src: '', alt: '', x: 81, y: 57.4, rotation: 12, width: 40 },

  // cooking for friends :)
  { id: 'loves-egg', note: 'loves', kind: 'emoji', emoji: '🍳', src: '', alt: '', x: 14, y: 70, rotation: -8, width: 44 },
  { id: 'loves-chili', note: 'loves', kind: 'emoji', emoji: '🌶️', src: '', alt: '', x: 29, y: 75.6, rotation: 14, width: 34, float: true },
  { id: 'loves-dumpling', note: 'loves', kind: 'emoji', emoji: '🥟', src: '', alt: '', x: 17, y: 85.4, rotation: 6, width: 42 },
  { id: 'loves-sparkles', note: 'loves', kind: 'emoji', emoji: '✨', src: '', alt: '', x: 46, y: 74.2, rotation: 0, width: 32, float: true },
  {
    id: 'loves-noodles',
    note: 'loves',
    src: '/stickers/noodle-bowl.png',
    alt: 'DRAFT: A bowl of black bean sauce noodles topped with cucumber, spring onion and sesame',
    x: 56,
    y: 50.4,
    rotation: 5,
    width: 150,
  },
];

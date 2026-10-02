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
    src: '',
    alt: 'DRAFT: Photo of Usha (describe the photo here)',
    caption: 'DRAFT: describe the photo here',
    x: 76.5,
    y: 3,
    rotation: 4,
    width: 160,
  },
  { id: 'tape', note: 'about', src: '', alt: '', x: 81, y: 1, rotation: -8, width: 84, placeholder: { shape: 'tape', color: '--ink-200' } },
  { id: 'star', note: 'about', src: '', alt: '', x: 4, y: 5, rotation: -12, width: 66, float: true, placeholder: { shape: 'star', color: '--burgundy-100', color2: '--burgundy-300' } },
  { id: 'lotus', note: 'about', kind: 'emoji', emoji: '🪷', src: '', alt: '', x: 9, y: 22, rotation: -6, width: 58, float: true },
  { id: 'hello', note: 'about', kind: 'label', text: 'hi, hello :)', src: '', alt: '', x: 2, y: 38, rotation: -7, width: 104, placeholder: { shape: 'circle', color: '--burgundy-300', color2: '--ink-500' } },
  { id: 'heart', note: 'about', src: '', alt: '', x: 8, y: 52, rotation: 10, width: 56, placeholder: { shape: 'heart', color: '--burgundy-300', color2: '--burgundy-700' } },
  { id: 'gold-star', note: 'about', kind: 'emoji', emoji: '⭐', src: '', alt: '', x: 17, y: 12, rotation: 12, width: 40 },
  { id: 'flower', note: 'about', src: '', alt: '', x: 82, y: 50, rotation: -6, width: 74, float: true, placeholder: { shape: 'flower', color: '--ink-200', color2: '--ink-500' } },
  { id: 'sparkles', note: 'about', kind: 'emoji', emoji: '✨', src: '', alt: '', x: 14, y: 68, rotation: 0, width: 38, float: true },
  { id: 'coffee', note: 'about', kind: 'label', text: 'runs on coffee', src: '', alt: '', x: 79, y: 68, rotation: 6, width: 112, placeholder: { shape: 'circle', color: '--ink-300', color2: '--ink-700' } },
  { id: 'circle', note: 'about', src: '', alt: '', x: 3, y: 80, rotation: 0, width: 58, placeholder: { shape: 'circle', color: '--oat-200', color2: '--oat-300' } },
  { id: 'film', note: 'about', kind: 'emoji', emoji: '🎞️', src: '', alt: '', x: 16, y: 89, rotation: -10, width: 44 },
  { id: 'sparkle', note: 'about', src: '', alt: '', x: 86, y: 82, rotation: 14, width: 50, float: true, placeholder: { shape: 'sparkle', color: '--burgundy-100', color2: '--burgundy-500' } },
  { id: 'mini-heart', note: 'about', src: '', alt: '', x: 93, y: 92, rotation: -12, width: 30, placeholder: { shape: 'heart', color: '--ink-200', color2: '--ink-500' } },

  // ---- currently ----
  { id: 'currently-tape', note: 'currently', src: '', alt: '', x: 80, y: 6, rotation: 10, width: 90, placeholder: { shape: 'tape', color: '--burgundy-100' } },
  { id: 'currently-coffee', note: 'currently', kind: 'emoji', emoji: '☕', src: '', alt: '', x: 85, y: 30, rotation: 8, width: 46, float: true },
  { id: 'currently-star', note: 'currently', src: '', alt: '', x: 5, y: 60, rotation: -10, width: 60, float: true, placeholder: { shape: 'star', color: '--ink-200', color2: '--ink-500' } },
  { id: 'currently-film', note: 'currently', kind: 'emoji', emoji: '🎞️', src: '', alt: '', x: 16, y: 89, rotation: -10, width: 44 },
  { id: 'currently-camera', note: 'currently', kind: 'emoji', emoji: '📸', src: '', alt: '', x: 70, y: 79, rotation: -10, width: 44 },

  // ---- things I love ----
  { id: 'loves-heart', note: 'loves', src: '', alt: '', x: 82, y: 10, rotation: 8, width: 70, float: true, placeholder: { shape: 'heart', color: '--burgundy-100', color2: '--burgundy-500' } },
  { id: 'loves-strawberry', note: 'loves', kind: 'emoji', emoji: '🍓', src: '', alt: '', x: 6, y: 40, rotation: -8, width: 48 },
  { id: 'loves-lotus', note: 'loves', kind: 'emoji', emoji: '🪷', src: '', alt: '', x: 86, y: 60, rotation: 6, width: 50, float: true },
];

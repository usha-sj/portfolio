// DRAFT: rewrite in my own voice.
// Notes app (About). Add a note by adding an entry; its stickers live in src/data/stickers.ts.

export type NoteBlock = { heading: string } | { text: string };

export interface Note {
  id: string;
  title: string;
  /** Shown in the header like macOS Notes, e.g. "2 October 2026 at 15:24" */
  updated: string; // ISO date-time
  body: NoteBlock[];
}

export const notes: Note[] = [
  {
    id: 'about',
    title: 'about me',
    updated: '2026-10-02T15:24',
    body: [
      { text: 'DRAFT. Hi, I’m Usha. A sentence or two about who you are and what you’re studying.' },
      { text: 'DRAFT. What you like building, and the kind of problems that keep you up at night (in a good way).' },
      { heading: 'right now' },
      { text: 'DRAFT. What you’re working on or looking for: roles, places, people.' },
      { text: 'DRAFT. Something small and specific that makes this feel like you.' },
    ],
  },
  {
    id: 'currently',
    title: 'currently',
    updated: '2026-09-28T09:10',
    body: [
      { text: 'DRAFT. reading: …' },
      { text: 'DRAFT. listening to: …' },
      { text: 'DRAFT. learning: …' },
    ],
  },
  {
    id: 'loves',
    title: 'things I love',
    updated: '2026-09-14T21:45',
    body: [
      { text: 'DRAFT. A short list of things you love.' },
      { text: 'DRAFT. One more.' },
    ],
  },
];

// UI text for the Notes window
export const notesUi = {
  sidebarLabel: 'Notes',
  tidyUp: 'Tidy up',
  tidyUpHint: 'Move the stickers back where they started',
  dateLocale: 'en-GB',
  timeZone: 'America/Toronto',
};

// DRAFT: rewrite in my own voice.
// Notes app (About). Add a note by adding an entry; its stickers live in src/data/stickers.ts.

export type NoteBlock = { heading: string } | { text: string };

export interface Note {
  id: string;
  title: string;
  /** Shown in the header like macOS Notes, e.g. "2 October 2026 at 15:24" */
  updated: string; // ISO date-time
  body: NoteBlock[];
  /** Optional: make the paper at least this many ruled lines tall (room for stickers below the text) */
  minLines?: number;
}
export const notes: Note[] = [
  {
    id: 'about',
    title: 'about me',
    updated: '2026-10-02T15:24',
    body: [
      { text: 'Hey, I’m Usha!' },
      { text: 'I’m Cambodian and Indian. I grew up in five countries across three continents. That teaches you a few things: how to start over, how to adapt, and how to lose an hour scrolling around Google Maps.' },
      { text: 'I came to UofT for Politics and Economics and switched to Computer Science in my third year. It’s why I like problems where the technical answer also has to make sense to real people.' },
      { text: 'I’m now finishing a CS Specialist and Math minor, graduating Summer 2027. At the University of Helsinki, I took graduate-level computer vision and AI and wrote a paper on contraction hierarchies, the trick behind fast route-finding. These days I build at the intersection of AI and full-stack engineering.' },
      { heading: 'right now' },
      { text: 'I’m looking for full-time SWE, ML and product roles starting in 2027. If that sounds like you, or you just want to say hi, Mail is in the dock :)' },
    ],
  },
  {
    id: 'currently',
    title: 'currently',
    updated: '2026-09-28T09:10',
    body: [
      { text: ' - finishing my last year at UofT!' },
      { text: ' - getting into graph neural networks' },
      { text: ' - reading: the silent patient' },
      // { text: 'DRAFT. listening to: …' },
      { text: ' - learning: better time management' },
      { text: ' - enjoying some fall activities!' },

    ],
  },
  {
    id: 'loves',
    title: 'things I love',
    updated: '2026-09-14T21:45',
    minLines: 20, // fits the window at its default size (no scrolling); keeps sticker positions consistent
    body: [
      { text: 'scrolling on Google Maps' },
      { text: 'an algorithm that\'s clever in a way that feels obvious afterwards' },
      { text: 'Pinterest moodboards' },
      { text: 'cooking for friends:)' },
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

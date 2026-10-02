// DRAFT: rewrite in my own voice.
// Every app that can open a window: dock label, window title, URL and size.
// Window ids double as dock ids. Project windows are added from the content collection.

export type WindowSize = 'default' | 'small' | 'large';

export interface AppDef {
  id: string;
  label: string; // dock tooltip + bold app name in the menu bar
  title: string; // window title bar
  path: string; // URL while this window is focused
  size: WindowSize;
  /** Optional image for the dock/home icon (e.g. '/icons/finder.png' in public/). Empty = built-in SVG. */
  icon?: string;
}

export const apps = {
  finder: { id: 'finder', label: 'Finder', title: 'Projects', path: '/projects', size: 'large' },
  notes: { id: 'notes', label: 'Notes', title: 'About', path: '/about', size: 'default' },
  preview: { id: 'preview', label: 'Preview', title: 'Resume', path: '/resume', size: 'default' },
  mail: { id: 'mail', label: 'Mail', title: 'Contact', path: '/contact', size: 'small' },
  terminal: { id: 'terminal', label: 'Terminal', title: 'Terminal', path: '/terminal', size: 'default' },
  trash: { id: 'trash', label: 'Trash', title: 'Trash', path: '/trash', size: 'small' },
} satisfies Record<string, AppDef>;

export type AppId = keyof typeof apps;

// Dock order (Trash always sits last, after the separator)
export const dockApps: AppId[] = ['finder', 'notes', 'preview', 'mail', 'terminal'];

// On phones: these four stay in the bottom dock row; the rest move to the home-screen grid
export const mobileDockApps: AppId[] = ['finder', 'notes', 'preview', 'mail'];

// Project windows live in Finder (menu bar shows "Finder" while one is focused)
export const projectApp = { label: 'Finder', size: 'default' as WindowSize, pathPrefix: '/projects/' };

// Placeholder window copy. Each window component reads its own section.
export const windowText = {
  notes: {
    heading: 'About',
    body: 'DRAFT. Placeholder for the About app. Who you are, what you like building, what you’re looking for.',
  },
  preview: {
    heading: 'Resume',
    body: 'DRAFT. Placeholder for the resume viewer. A PDF preview and download link will live here.',
  },
  mail: {
    heading: 'Contact',
    body: 'DRAFT. Placeholder for the contact app. Email, socials, maybe a little form.',
  },
  terminal: {
    heading: 'Terminal',
    body: 'DRAFT. Placeholder for an interactive terminal. Try `help` (eventually).',
  },
  trash: {
    heading: 'Trash',
    body: 'DRAFT. Placeholder for the Trash easter egg. Abandoned ideas, failed experiments, regrets.',
  },
  finder: {
    sidebarHeading: 'Favourites',
    sidebar: { projects: 'Projects', recents: 'Recents' },
    countLabel: '{n} items',
  },
  project: {
    yearLabel: 'Year',
    roleLabel: 'Role',
    techLabel: 'Stack',
    githubLabel: 'GitHub',
    demoLabel: 'Live demo',
    noCover: 'cover image',
  },
  mobileBack: '‹ Home',
};

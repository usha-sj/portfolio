// DRAFT: rewrite in my own voice.
// Every app that can open a window: dock label, window title, URL and size.
// Window ids double as dock ids. Project windows are added from the content collection.

export type WindowSize = 'default' | 'small' | 'large' | 'xl';

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
  notes: { id: 'notes', label: 'Notes', title: 'About', path: '/about', size: 'xl' },
  maps: { id: 'maps', label: 'Maps', title: 'Experience', path: '/experience', size: 'xl' },
  mail: { id: 'mail', label: 'Mail', title: 'New Message', path: '/contact', size: 'default' },
  terminal: { id: 'terminal', label: 'Terminal', title: 'Terminal', path: '/terminal', size: 'default' },
  trash: { id: 'trash', label: 'Trash', title: 'Trash', path: '/trash', size: 'small' },
} satisfies Record<string, AppDef>;

export type AppId = keyof typeof apps;

// Dock order (Trash always sits last, after the separator)
export const dockApps: AppId[] = ['finder', 'notes', 'maps', 'mail', 'terminal'];

// On phones: these four stay in the bottom dock row; the rest move to the home-screen grid
export const mobileDockApps: AppId[] = ['finder', 'notes', 'maps', 'mail'];

// A project opens as a Finder folder window at /projects/<slug>
export const projectApp = { label: 'Finder', size: 'default' as WindowSize, pathPrefix: '/projects/' };

// The folder's README (the project file's Markdown body) opens in TextEdit at /projects/<slug>/description
export const projectFileApp = {
  id: 'textedit',
  label: 'TextEdit',
  size: 'default' as WindowSize,
  pathSuffix: '/description',
  fileName: 'README.txt', // used if the project's files list has no txt entry
};

// Videos open in a QuickTime-style window (no URL of their own: the folder's URL stays)
export const videoApp = { id: 'quicktime', label: 'QuickTime Player', size: 'large' as WindowSize };

// Links show as <name>.webloc and open in a new tab
export const linkFileExt = '.webloc';

// Quick Look (image viewer) text
export const quickLookText = {
  label: 'Quick Look',
  close: 'Close',
  previous: 'Previous image',
  next: 'Next image',
  counter: '{i} of {n}',
};

// Placeholder window copy. Each window component reads its own section.
export const windowText = {
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
    countLabelOne: '1 item',
  },
  folder: {
    countLabel: '{n} items',
    countLabelOne: '1 item',
  },
  mobileBack: '‹ Home',
};

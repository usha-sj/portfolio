// DRAFT: rewrite in my own voice.
// All text and swappable assets for the desktop (wallpaper, menu bar, widgets).

export const desktopConfig = {
  /**
   * WALLPAPER: drop your image into public/ and change this path,
   * e.g. '/wallpaper.jpg'. It's scaled with `cover`, so it never stretches.
   */
  wallpaper: '/wallpaper-placeholder.svg',

  menuBar: {
    name: 'Usha',
    // Dropdown under "Usha". `window` opens that app's window (see src/config/apps.ts);
    // `href` is the fallback URL and the target for external links.
    profileLinks: [
      { label: 'Resume', href: '/resume', window: 'preview' },
      { label: 'GitHub', href: '#', external: true },
      { label: 'LinkedIn', href: '#', external: true },
      { label: 'Contact', href: '/contact', window: 'mail' },
    ],
    // Plain items next to "Usha" (hidden on mobile)
    items: [
      { label: 'Projects', href: '/projects', window: 'finder' },
      { label: 'About', href: '/about', window: 'notes' },
      { label: 'Experience', href: '/resume', window: 'preview' },
    ],
  },

  folders: {
    label: 'Project folders',
    // Screen-reader hint for desktop folders
    hint: 'Press Enter or double-click to open.',
  },

  // Phone home-screen app grid (screen-reader label)
  homeScreenLabel: 'Apps',

  // Dock (screen-reader label)
  dockLabel: 'Dock',

  clock: {
    timeZone: 'America/Toronto',
    label: 'Toronto',
  },

  calendar: {
    // Calendar uses this zone for "today" so it matches the clock widget
    timeZone: 'America/Toronto',
    weekdays: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  },

  sticky: {
    // {name} is the username typed into the loader (falls back to guestName)
    greeting: 'hi {name},',
    body: 'make yourself at home. the folders don’t bite.',
    signoff: '— u',
    guestName: 'guest',
  },

  /**
   * PHOTOS: put images in public/photos/ and set `src`, e.g. '/photos/me.jpg'.
   * Leave src empty to show the placeholder frame.
   */
  photos: [
    { src: '', alt: '', caption: 'photo 1' },
    { src: '', alt: '', caption: 'photo 2' },
    { src: '', alt: '', caption: 'photo 3' },
    { src: '', alt: '', caption: 'photo 4' },
  ],
};

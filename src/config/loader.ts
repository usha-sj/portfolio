// DRAFT: rewrite in my own voice.

export const loaderConfig = {
  // sessionStorage key used to show the loader once per browser session
  storageKey: 'usha-loader-seen',
  // sessionStorage key for the visitor's name (read by the desktop sticky note)
  usernameKey: 'usha-visitor-name',

  // Shown before each prompt line, and as the header above the info boxes
  host: 'usha@portfolio',

  // ASCII art lives in src/config/lotus.txt (replace that file to swap it)

  // Hardware box: playful stats. `bar` (0-100) draws [■■■■■····] 62%
  hardwareTitle: 'Hardware',
  hardware: [
    { label: 'CPU', value: 'one brain, 2 tabs open (mostly)' },
    { label: 'GPU', value: 'integrated imagination' },
    { label: 'RAM', value: 'remembers bugs, forgets names', bar: 79 },
    { label: 'CAFFEINE', value: 'dangerously adequate', bar: 92 },
    { label: 'STORAGE', value: 'side projects', bar: 97 },
    { label: 'SLEEP', value: 'final-year mode', bar: 18 },
  ],
  barWidth: 10,

  // Session box: real info from the visitor's browser. Shown only, never sent anywhere.
  sessionTitle: 'Session',
  sessionLabels: {
    user: 'USER',
    browser: 'BROWSER',
    os: 'OS',
    screen: 'SCREEN',
    cores: 'CORES',
    timezone: 'TIMEZONE',
    login: 'LOGIN',
  },
  sessionUnknown: 'unknown',
  sessionPendingUser: 'guest (not logged in)',

  // Colour swatch row at the bottom: names of colour tokens from tokens.css
  dots: ['--oat-50', '--oat-300', '--neutral-400', '--neutral-600', '--burgundy-100', '--burgundy-500', '--ink-500', '--ink-700'],

  // Boot log. Keep the total short (typing budget is ~2.4s).
  bootLines: [
    'booting usha.os v2.6 ...',
    'mounting /projects ........ 4 found, 2 finished',
    'loading skills: css, typescript, pixel-pushing',
    'checking coffee levels .... dangerously adequate',
    'suppressing imposter syndrome ... [ok]',
    'ready. mostly.',
  ],

  prompts: {
    username: 'login: ',
    password: 'password: ',
  },

  skip: 'skip →',

  // {name} is replaced with the username (or the guest name)
  welcome: 'Welcome, {name}.',
  guestName: 'guest',

  // Password is "password" (case-insensitive)
  easterEgg: 'Wow. You found the true password. Security team has been notified (it is me).',

  // Bad word in the username or password
  playNice: 'Let’s keep it friendly. You’re “guest” now.',

  // Everything else: picked at random
  randomResponses: [
    'Password accepted. I didn’t check it.',
    'Access granted. Low bar, but you cleared it.',
    'Authenticating... eh, close enough.',
    'Logged in. Please don’t touch anything important.',
    'Credentials noted. Sold to nobody.',
    'You’re in. Mind the unfinished projects.',
    'Session started. Coffee not included.',
    'Welcome back. Or welcome first time. I don’t keep track.',
  ],

  // Matched case-insensitively as substrings of username or password. Extend as needed.
  badWords: ['***REMOVED***', '***REMOVED***', '***REMOVED***', '***REMOVED***', '***REMOVED***', '***REMOVED***', '***REMOVED***', '***REMOVED***', '***REMOVED***'],
};

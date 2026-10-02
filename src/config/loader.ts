// DRAFT: rewrite in my own voice.

export const loaderConfig = {
  // sessionStorage key used to show the loader once per browser session
  storageKey: 'usha-loader-seen',

  // Shown before each prompt line
  host: 'usha@portfolio',

  // Boot log. Keep the total short (typing budget is ~3.5s).
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

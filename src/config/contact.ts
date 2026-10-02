// DRAFT: rewrite in my own voice.
// Text for the Mail (Contact) window. The Web3Forms key lives in .env (PUBLIC_WEB3FORMS_KEY).

export const contactConfig = {
  to: { name: 'Usha Sophea Janardhan', email: 'ushashasj@gmail.com' },

  labels: {
    to: 'To:',
    from: 'From:',
    subject: 'Subject:',
    name: 'Your name',
    email: 'Your email',
    message: 'Message',
  },
  placeholders: {
    name: 'Your name',
    email: 'you@example.com',
    subject: 'What’s this about?',
    message:
      'DRAFT: Hi! Say hello, tell me about a role you think I’d be good for, or just send me a song you’ve had on repeat. I read everything (eventually, and with coffee).',
  },

  copyEmail: 'Copy email',
  copied: 'Copied',
  copyFailed: 'Couldn’t copy',

  // Hidden spam trap (never shown to people)
  honeypotLabel: 'Leave this unchecked',

  send: 'Send',
  sending: 'Sending…',
  notInDemo: 'Not in this demo',
  // Decorative toolbar buttons (icons drawn in MailWindow.astro)
  tools: [
    { id: 'reply', label: 'Reply' },
    { id: 'format', label: 'Format' },
    { id: 'emoji', label: 'Emoji' },
    { id: 'header', label: 'Header fields' },
    { id: 'attach', label: 'Attach' },
    { id: 'later', label: 'Send later' },
  ],

  errors: {
    name: 'Please add your name.',
    email: 'That email doesn’t look quite right.',
    subject: 'A subject helps me find it later.',
    message: 'Don’t forget the message!',
  },

  sentTitle: 'Message sent',
  sentBody: 'Thanks for writing! I’ll get back to you soon.',
  sendAnother: 'Send another',

  errorTitle: 'That didn’t send',
  errorBody: 'Something went wrong on the way out. You can try again, or copy my email and write to me directly.',
  tryAgain: 'Try again',

  // Sent to Web3Forms as the sender name shown in your inbox
  fromName: 'Portfolio contact form',
  subjectPrefix: '[Portfolio] ',
};

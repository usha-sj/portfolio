## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)


## Project context

Personal portfolio for Usha, a final-year CS student looking for software/ML engineering roles. Concept: a terminal-style loading screen leading into a scrapbook-aesthetic macOS-style desktop. The site should feel handmade and personal, not like a template or an AI-generated site.

## Design rules

- All colours, fonts, spacing and shadows are CSS variables in src/styles/tokens.css. Never hardcode these values in components.
- Fonts (placeholders until I decide):
  - Display/headings: a characterful serif (e.g. Instrument Serif)
  - Body/UI: a clean sans that isn't Inter (e.g. DM Sans)
  - Terminal: a monospace (e.g. IBM Plex Mono)
  - Handwritten accents (sticky notes): one handwriting font (e.g. Caveat)
- Palette: warm and paper-like, max 2–3 main colours plus neutrals. Placeholder values are fine; I'll adjust them in tokens.css.
- Avoid: generic copy ("passionate about…")
- Prefer: slight rotations, overlaps, paper/tape/sticker textures, asymmetry, real-object feel.

## Code rules

- Plain CSS and vanilla JS. No UI libraries or new dependencies without asking me first.
- Don't add animations. Leave clear classes/hooks and comments; I add animations myself with GSAP.
- All user-facing text and swappable assets (images, links) go in config/data files, not hardcoded in components.
- Respect prefers-reduced-motion. Keep everything keyboard accessible.
- Explain your plan before large changes. Keep changes scoped to what I asked for.

## Commands

- Astro isn't installed globally: use `npx astro ...` (e.g. `npx astro dev stop`) or the npm scripts.

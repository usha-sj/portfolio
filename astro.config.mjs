// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Preview (résumé) was replaced by the Maps app; keep old links working
  redirects: {
    '/resume': '/experience',
  },
});

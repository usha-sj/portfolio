import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// One Markdown file per project in src/content/projects/.
// The file's frontmatter is validated against this schema; the body is the long write-up.
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(), // used in the URL: /projects/<slug>
    year: z.number(),
    role: z.string(),
    tech: z.array(z.string()),
    summary: z.string(),
    links: z
      .object({
        github: z.string().optional(),
        demo: z.string().optional(),
      })
      .default({}),
    // Path to an image in public/, e.g. '/projects/foo.jpg'. Leave out for a placeholder.
    cover: z.string().optional(),
    coverAlt: z.string().default(''),
    featured: z.boolean().default(false), // featured projects get a desktop folder
    order: z.number().default(0), // lower comes first
  }),
});

export const collections = { projects };

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
    // Extra files shown in the project's folder (beside <slug>.txt), e.g.
    // { name: 'demo.mp4', src: '/projects/foo/demo.mp4' }. They open in a new tab for now.
    files: z.array(z.object({ name: z.string(), src: z.string() })).default([]),
    featured: z.boolean().default(false), // featured projects get a desktop folder
    order: z.number().default(0), // lower comes first
  }),
});

// Résumé timeline (Preview app): one Markdown file per role in src/content/experience/.
// Dates are 'YYYY-MM'; `end` can also be 'present'. Bullets may contain [text](url) links.
const yearMonth = z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM');
const experience = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/experience' }),
  schema: z.object({
    title: z.string(),
    organisation: z.string(),
    location: z.string().optional(),
    start: yearMonth,
    end: z.union([yearMonth, z.literal('present')]),
    type: z.enum(['work', 'leadership', 'teaching', 'education']),
    description: z.string().optional(),
    bullets: z.array(z.string()).default([]),
    link: z.string().optional(),
    linkLabel: z.string().optional(),
    // Path to an image in public/, e.g. '/logos/uoft.svg'
    logo: z.string().optional(),
    // Tie-breaker when two entries have the same dates (lower comes first)
    order: z.number().default(0),
    // Education extras
    awards: z.array(z.string()).default([]),
    courses: z.array(z.string()).default([]),
  }),
});

export const collections = { projects, experience };

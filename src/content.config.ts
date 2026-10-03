import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// A file inside a project's folder. Assets live in public/projects/<slug>/.
// Files without a real path yet (video src '', link url '') are hidden until you add one.
const projectFile = z.discriminatedUnion('type', [
  // The project's README: the Markdown body of this file, opened in TextEdit
  z.object({ type: z.literal('txt'), name: z.string() }),
  z.object({ type: z.literal('image'), name: z.string(), src: z.string(), alt: z.string().default('') }),
  z.object({ type: z.literal('video'), name: z.string(), src: z.string().default(''), poster: z.string().optional() }),
  // Shown as <name>.webloc; opens the URL in a new tab
  z.object({ type: z.literal('link'), name: z.string(), url: z.string().default('') }),
]);

// One Markdown file per project in src/content/projects/.
// Frontmatter is validated against this schema; the body is the README.txt text.
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(), // used in the URL: /projects/<slug>
    year: z.number(),
    period: z.string().optional(), // e.g. 'Jan–Apr 2026'
    role: z.string(),
    tech: z.array(z.string()),
    summary: z.string(),
    // Path to the cover in public/ (shown as the folder thumbnail). Leave out for a plain folder.
    cover: z.string().optional(),
    coverAlt: z.string().default(''),
    files: z.array(projectFile).default([]),
    featured: z.boolean().default(false), // kept for later; nothing filters by it right now
    order: z.number().default(0), // lower comes first (desktop + Finder)
  }),
});

// Experience (Maps app): one Markdown file per role in src/content/experience/.
// Dates are 'YYYY-MM'; `end` can also be 'present'. Bullets may contain [text](url) links.
// `stop` is the route stop id in src/data/route.ts that the entry belongs to.
const yearMonth = z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM');
const experience = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/experience' }),
  schema: z.object({
    title: z.string(),
    organisation: z.string(),
    location: z.string().optional(),
    start: yearMonth,
    end: z.union([yearMonth, z.literal('present')]),
    type: z.enum(['work', 'research', 'leadership', 'education']),
    stop: z.string(),
    // One line shown on the place card before it's expanded
    summary: z.string(),
    // Optional big number on the card, e.g. { value: '4,300+', label: 'scholarships ingested' }.
    // The number part counts up when the stop opens.
    stat: z.object({ value: z.string(), label: z.string() }).optional(),
    tags: z.array(z.string()).default([]), // skill chips; the Skills filter is built from these
    project: z.string().optional(), // project slug: shows an "Open folder" button
    mode: z.enum(['on-site', 'hybrid', 'remote']).optional(),
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

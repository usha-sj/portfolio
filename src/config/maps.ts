// DRAFT: rewrite in my own voice.
// Text for the Maps (Experience) app. Stops: src/data/route.ts. Entries: src/content/experience/.

export const mapsConfig = {
  // Résumé PDF in public/
  pdf: '/Usha-Sophea-Janardhan-Resume.pdf',
  pdfFileName: 'Usha-Sophea-Janardhan-Resume.pdf',
  downloadLabel: 'Download PDF',

  // Sidebar header
  tldrHeading: 'TL;DR',
  tldr: [
    'Graduating January 2027 (CS Specialist, Math minor)',
    'Looking for full-time SWE, ML and product roles',
  ],
  topSkillsLabel: 'Top skills',
  topSkills: ['Python', 'TypeScript', 'React', 'LLM/RAG pipelines', 'PostgreSQL'],

  directionsHeading: 'Directions',
  stepLabels: { start: 'Start', arrive: 'Arrive', here: 'You are here' },

  layersHeading: 'Layers',
  layers: [
    { value: 'work', label: 'Work' },
    { value: 'research', label: 'Research' },
    { value: 'leadership', label: 'Leadership' },
    { value: 'education', label: 'Education' },
  ],

  skillsHeading: 'Skills',
  skillsHint: 'Pick a skill to see where I used it.',
  clearSkill: 'Clear',

  // Place card
  closeCard: 'Close',
  moreLabel: 'Details',
  lessLabel: 'Hide details',
  openFolder: 'Open folder',
  modeLabels: { 'on-site': 'On-site', hybrid: 'Hybrid', remote: 'Remote' },
  typeLabels: { work: 'Work', research: 'Research', leadership: 'Leadership', education: 'Education' },
  awardsLabel: 'Awards',
  coursesLabel: 'Relevant courses',

  // Map
  mapLabel: 'Map of my route',
  previousStop: 'Previous stop',
  nextStop: 'Next stop',
  // Label types that only appear once you zoom in (e.g. ['street']). Empty = all names show
  // at the default zoom.
  revealOnZoom: [] as ('neighbourhood' | 'street' | 'road' | 'park' | 'water')[],
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  compass: 'Face north (Shift + ← / → rotates the map)',
  recenter: 'Recenter on the selected stop',
  compassNorth: 'N',
  sheetHandle: 'Drag to resize the directions panel',
  present: 'Present',
};

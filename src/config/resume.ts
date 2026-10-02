// Text and assets for the résumé (Preview app). Entries live in src/content/experience/.

export const resumeConfig = {
  // File in public/. The toolbar button opens it in a new tab.
  pdf: '/Usha-Sophea-Janardhan-Resume.pdf',
  downloadLabel: 'Download PDF',

  filterLabel: 'Filter by type',
  filters: [
    { value: 'all', label: 'All' },
    { value: 'work', label: 'Work' },
    { value: 'leadership', label: 'Leadership' },
    { value: 'teaching', label: 'Teaching' },
    { value: 'education', label: 'Education' },
  ],
  // Announced to screen readers after filtering. {n} = count, {type} = filter label
  filterStatus: 'Showing {n} {type} entries',
  filterStatusAll: 'Showing all {n} entries',

  // Small label on each card
  typeLabels: {
    work: 'Work',
    leadership: 'Leadership',
    teaching: 'Teaching',
    education: 'Education',
  },

  present: 'Present',
  awardsLabel: 'Awards',
  coursesLabel: 'Relevant courses',
  linkLabel: 'View project',

  // From the PDF's Technical Skills section
  skillsHeading: 'Technical skills',
  skills: [
    {
      label: 'Languages',
      items: ['Python', 'C', 'Java', 'JavaScript', 'R', 'SQL (MySQL, PostgreSQL)', 'HTML/CSS', 'PHP', 'Bash'],
    },
    {
      label: 'Frameworks & Tools',
      items: [
        'React', 'Node.js', 'Next.js', 'Tailwind', 'FastAPI', 'Django', 'TensorFlow', 'scikit-learn',
        'NumPy', 'Pandas', 'OpenCV', 'Git', 'Jira', 'Figma', 'AWS', 'Azure', 'Docker', 'LLM/RAG pipelines',
      ],
    },
  ],
};

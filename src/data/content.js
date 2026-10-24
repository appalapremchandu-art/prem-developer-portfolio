// src/data/content.js
//
// Single source of truth for the portfolio's editable surface.
//
// Honesty contract: verified facts are shown; anything not yet supplied stays
// null/[] and the renderers route it through isSupplied/placeholder (or hide it).
// No invented experience, statistics, credentials, or URLs. No secrets.

export const sections = [
  { id: 'hero', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'education', label: 'Education' },
  { id: 'contact', label: 'Contact' },
];

export const content = {
  profile: {
    name: 'Prem Chandu Appala',            // supplied
    // Professional role / positioning (supplied).
    headline: 'Aspiring Software Developer | B.Tech CSE Student',
    // Hero headline statement; only the word shipping is accent-emphasized.
    heroHeadline: ['I build useful software. I learn by ', { text: 'shipping', accent: true }, '.'],
    // Suggested introduction (supplied) — neutral, no invented claims.
    tagline:
      'I build practical web applications, including RepairHub (a smart repair-quote and service-booking platform) and LifeLink (a blood-donor finder), while strengthening my core computer science fundamentals.',
    location: 'Thurukapally',              // supplied
  },

  links: {
    email: 'appalapremchandu@gmail.com',
    github: 'https://github.com/appalpremchandu-art', // supplied (username appalpremchandu-art)
    linkedin: null,                        // hidden for now; set a real URL to show it again
    phone: '+919703928082',
    phoneDisplay: '+91 97039 28082',
  },

  about: {
    summary:
      'Computer Science and Engineering student at VBIT, Aushapur, focused on software development and building practical web applications. I have built RepairHub, a repair quote comparison and service booking platform using PHP and MySQL, and LifeLink, a blood donor finder platform using Vite, JavaScript, Bootstrap 5, and Supabase, while continuing to strengthen my core computer science fundamentals.',
    highlights: [],
  },

  // EDITABLE: derived from the technologies used in your two projects and this
  // site's stack. Review and adjust freely.
  skills: [
    { category: 'Languages', items: ['HTML5', 'CSS3', 'JavaScript', 'PHP'] },
    { category: 'Frameworks & Libraries', items: ['Bootstrap 5'] },
    { category: 'Databases', items: ['MySQL', 'Supabase'] },
    { category: 'Tools & Platforms', items: ['Vite', 'Git'] },
  ],

  projects: [
    {
      name: 'RepairHub',
      tagline: 'Smart repair quote comparison and service booking platform',
      description: [],
      stack: ['PHP', 'MySQL'],
      demoUrl: 'https://repairhub-vbit.gt.tc/',
      repoUrl: null,
      preview: 'repairhub',
    },
    {
      name: 'LifeLink',
      tagline: 'Blood donor finder platform',
      description: [],
      stack: ['JavaScript', 'Bootstrap 5', 'Supabase', 'Vite'],
      demoUrl: 'https://lifelink-blood-donor-finder-five.vercel.app/',
      repoUrl: 'https://github.com/appalpremchandu-art/lifelink-blood-donor-finder',
      preview: 'lifelink',
    },
  ],

  // Add earned certifications here as { name, issuer, url } once verified.
  // While this list is empty, no Certifications section is shown (hidden until
  // you have a completed, verifiable credential). Do not list planned ones.
  certifications: [],

  education: [
    {
      qualification: 'B.Tech in Computer Science and Engineering',
      institution: 'VBIT, Aushapur',
      location: null,
      score: 'CGPA 7.81 / 10',
      graduationYear: '2028',
    },
    {
      qualification: 'Intermediate',
      institution: 'Abhyas Junior College',
      location: 'Bachupally',
      score: '94%',
      graduationYear: null,
    },
    {
      qualification: 'School Education',
      institution: 'Vijetha Techno School',
      location: 'Thurukapally',
      score: '95%',
      graduationYear: null,
    },
  ],

  seo: {
    title: 'Prem Chandu Appala — Aspiring Software Developer (B.Tech CSE)',
    description:
      'Portfolio of Prem Chandu Appala, a B.Tech Computer Science and Engineering student and aspiring software developer.',
    ogImage: '/og-image.png',
  },
};
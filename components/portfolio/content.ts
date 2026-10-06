/**
 * Everything personal on the v2 page lives here. Edit this file to change copy,
 * hobbies, passions, the timeline or projects - the layout reads from it.
 */

export const PROFILE = {
  name: "Ved",
  fullName: "Vedank Gaur",
  email: "vedank0522@gmail.com",
  linkedin: "https://www.linkedin.com/in/vedank-gaur/",
  github: "https://github.com/ved-casm",
  behance: "https://www.behance.net/vedankgaur",
  whatsapp: "https://wa.me/918302534154",
  portfolio: "https://ved-portfolio-nine.vercel.app",
  location: "Jaipur, IN",
  timeZone: "Asia/Kolkata",
  /** Drop your CV in /public (e.g. /resume.pdf) and set the path here to show the download button. */
  resume: "/resume/VedankGaur_ProductDesigner_Resume.pdf",
  logo: "/media/brand/monogram.png",
  portrait: "/media/brand/vedank-portrait-square.webp",
};

export const HERO = {
  titleLines: ["the", "flow of a", "product designer."],
  brainCaption: "a whirlpool of ideas, aka my brain.",
  welcome: "i design products from scratch, and ship them :)",
  introComment: "Hey there, Ved here.",
};

/** 3D icons generated with Higgsfield (GPT Image 2.5, transparent background). */
const C = "/media/icons";

export const HOBBIES = {
  eyebrow: "when i'm not pushing pixels,",
  headline: "i'm probably playing",
  footnote: "cricket, badminton or one more round of cs.",
  /** Six cutouts scattered around the headline. */
  items: [
    { src: `${C}/cricket.webp`, alt: "Cricket bat and ball", message: "gully cricket raised me. still the best format." },
    { src: `${C}/badminton.webp`, alt: "Badminton racket and shuttlecock", message: "badminton is my weekend cardio. smashes included." },
    { src: `${C}/bomb.webp`, alt: "Game-style C4 bomb, a nod to Counter-Strike", message: "counter-strike veteran. yes, i always plant the bomb." },
    { src: `${C}/headset.webp`, alt: "Gaming headphones", message: "headphones on means i'm designing or clutching a 1v5." },
    { src: `${C}/trophy.webp`, alt: "Trophy", message: "competitive in every game. even ludo." },
    { src: `${C}/keyboard.webp`, alt: "Keyboard", message: "wasd for cs, cmd+z for design. same hands." },
  ],
};

export const PASSIONS = {
  heading: "but few things have my heart.",
  items: [
    {
      src: `${C}/palette.webp`,
      alt: "Artist palette",
      title: "incredible designs.",
      body: "the kind of work that makes people stop scrolling. that's the bar i chase every time.",
    },
    {
      src: `${C}/laptop.webp`,
      alt: "Laptop",
      title: "product design.",
      body: "turning messy problems into products people actually enjoy using.",
    },
    {
      src: `${C}/gem.webp`,
      alt: "Iridescent crystal",
      title: "mesmerizing designs.",
      body: "motion, detail and polish: the little things that make an interface feel alive.",
    },
  ],
};

export type Milestone = { lines: { text: string; muted?: boolean }[]; year: string };

/** Milestones from your resume. */
export const TIMELINE: { intro: [string, string]; items: Milestone[] } = {
  intro: ["the story", " so far..."],
  items: [
    {
      lines: [{ text: "frontend developer intern" }, { text: "optisoft business solutions", muted: true }, { text: "6+ client projects" }],
      year: "2023",
    },
    {
      lines: [{ text: "frontend developer" }, { text: "optisoft · 30+ features shipped", muted: true }],
      year: "2024",
    },
    { lines: [{ text: "graduated, bca" }, { text: "university of rajasthan", muted: true }], year: "2024" },
    {
      lines: [
        { text: "designing & shipping products" },
        { text: "athlnk, clear place, greenfrog", muted: true },
        { text: "page loads up to 80% faster" },
      ],
      year: "now",
    },
    { lines: [{ text: "rebuilt my portfolio" }, { text: "as a product designer", muted: true }], year: "2026" },
  ],
};

export const OWNERSHIP = {
  lead: "shipping,",
  rest: " not handing off.",
  body: "i don't hand off designs. i ship them, from the first wireframe to the last line of production code.",
};

export const VENN = {
  labels: { top: "design", left: "code", right: "product" },
  /** Liquid that fills each circle: sunset water, ocean, lagoon. */
  colors: { top: "#FF8A3D", left: "#2F80FF", right: "#1FC7A0" },
  deep: { top: "#C2410C", left: "#1E40AF", right: "#0F766E" },
  comment: "that's pretty much my whole toolkit.",
  outro: { before: "i'm Ved, a designer ", italic: "who", after: " ships." },
  sub: "that was the flow behind my products.",
};

export const WORKS = {
  heading: "you must be waiting for this part already.",
  intro: "enough talk. here are the products i've designed, built and shipped.",
  sub: "every one of them went from a blank figma file to production code by my hands.",
  toolkitLabel: "my everyday toolkit",
  toolkit: ["Figma", "Next.js", "React", "TypeScript", "Tailwind", "Shadcn UI", "Aceternity UI", "Motion"],
  filterLabel: "want to look at a specific kind of work?",
  filters: ["UI/UX Design", "Web Development", "Branding", "Dashboards", "Graphic Design"],
};

export type Project = {
  /** URL segment of the case study: /work/<slug>. */
  slug: string;
  title: string;
  desc: string;
  /** What you owned on the project. */
  role: string;
  /** Optional - shown next to the role when set (e.g. "2025"). */
  year?: string;
  /** Optional - one measurable outcome (e.g. "3x faster profile search"). */
  impact?: string;
  /** Optional - the live product. */
  live?: string;
  bg: string;
  image: string;
  video?: string;
  tags: string[];
  url: string;
  /** Case study: what the product is, in one or two sentences. */
  overview: string;
  /** Case study: what you designed and built. */
  story: string;
  /** Every discipline / tool on the project, from your portfolio. */
  stack: string[];
  /** Number of screens in /media/projects/<slug>/ (01.avif …). */
  shots: number;
  /** Optional - add once you have them. */
  problem?: string;
  outcome?: string;
  /** Case study brief, in the order a reader needs it: what kind of product, what I did, for which field. */
  challenge: string;
  service: string;
  industry: string;
  /** The goal: what had to be true when the project shipped. */
  goal: string;
  /** How it was solved, introduced by one sentence and carried by three pillars. */
  solution: string;
  pillars: [Pillar, Pillar, Pillar];
  /** Desktop page captures in /media/projects/<slug>/pages/<key>-desktop.avif, shown page by page. */
  pages?: PageShot[];
  /** Phone captures in /media/projects/<slug>/pages/<key>-mobile.avif, shown in iPhone frames. */
  mobile?: PageShot[];
};

export type Pillar = { title: string; text: string };
export type PageShot = { key: string; label: string; path: string };

export const PROJECTS: Project[] = [
  {
    slug: "athlnk",
    impact: "100+ reusable components · 48% faster",
    live: "https://athlnk.com",
    title: "AthLnk",
    role: "product design + frontend",
    desc: "Product design and Next.js frontend for a platform connecting athletes, coaches and scouts.",
    bg: "#0B0F1A",
    image: "/media/projects/athlnk/card.avif",
    video: "/media/projects/athlnk/reel.mp4",
    tags: ["UI/UX Design", "Web Development", "Branding"],
    url: "/work/athlnk",
    challenge: "web platform",
    service: "product design, UX/UI, frontend",
    industry: "sports tech",
    goal: "Athletes, coaches, scouts and brands were scattered across DMs, spreadsheets and highlight reels. The goal was one place where an athlete's identity, discovery and deals all live in the same structure.",
    solution: "I designed AthLnk as a bold, editorial product and built it in Next.js, so a profile reads like a poster but works like a database. Three pillars carried every screen:",
    pillars: [
      { title: "identity", text: "Verified athlete profiles with one consistent structure, so every athlete is comparable at a glance." },
      { title: "discovery", text: "AI-powered search, three proprietary scores and filters that let brands and recruiters find the right match fast." },
      { title: "deal flow", text: "Automated outreach, CRM sync and a deal dashboard, all built from one system of 100+ reusable components." },
    ],
    pages: [
      { key: "home", label: "home page", path: "/" },
      { key: "features", label: "features", path: "/features" },
      { key: "how-it-works", label: "how it works", path: "/howitworks" },
      { key: "pricing", label: "pricing", path: "/pricing" },
    ],
    mobile: [
      { key: "home", label: "home", path: "/" },
      { key: "features", label: "features", path: "/features" },
      { key: "pricing", label: "pricing", path: "/pricing" },
    ],
    overview: "A platform that connects athletes, coaches and scouts in one place, designed to make talent easy to discover.",
    story: "I led the product design and built the frontend: a design system in Figma, responsive layouts in Next.js, TypeScript and Tailwind, and motion that keeps browsing profiles fast and clear.",
    stack: ["UI/UX","Next.js","TypeScript","Tailwind","Aceternity UI","Logo Design","Motion","Hero UI"],
    shots: 8,
  },
  {
    slug: "foreward-golf",
    impact: "+30% inquiry conversions · 86% faster load",
    live: "https://foreward.golf",
    title: "Foreward Golf",
    role: "brand, web design + development",
    desc: "A zero-gimmick brand website for golf clubs: logo, graphics, copy and parallax UI in React.",
    bg: "#10261A",
    image: "/media/projects/foreward-golf/card.avif",
    tags: ["Web Development", "Branding", "Graphic Design"],
    url: "/work/foreward-golf",
    challenge: "brand website",
    service: "branding, copywriting, web design + development",
    industry: "golf equipment",
    goal: "Club fitting is full of brand bias and sales talk. Foreward needed a site that says the opposite: brand-agnostic fitting, clubs designed with zero gimmicks and a fitting that's guaranteed.",
    solution: "I designed the brand from the logo up, wrote the copy and built the site in React with parallax sections, so every page leads to one of two actions: book a fitting or find a fitter.",
    pillars: [
      { title: "honesty", text: "Copy written by golfers, not salesmen: plain promises like a refund if the fitting can't beat your current set." },
      { title: "focus", text: "Every page ends in the same two buttons. Inquiry conversions went up 30%." },
      { title: "speed", text: "Lean React and optimised media: the site loads 86% faster, full-bleed photography included." },
    ],
    pages: [
      { key: "home", label: "club fitting", path: "/club-fitting" },
      { key: "golf-clubs", label: "golf clubs", path: "/golf-clubs" },
      { key: "about", label: "about us", path: "/about-us" },
      { key: "fitter-locator", label: "find a fitter", path: "/fitter/fitter-locator" },
    ],
    mobile: [
      { key: "home", label: "club fitting", path: "/club-fitting" },
      { key: "golf-clubs", label: "golf clubs", path: "/golf-clubs" },
      { key: "about", label: "about us", path: "/about-us" },
    ],
    overview: "A brand website for golf clubs designed with zero gimmicks, where the product and the craft behind it do the talking.",
    story: "I handled the logo, graphics and copy, and built the site in React with Bootstrap and custom CSS, using parallax sections to give each club room to breathe.",
    stack: ["React.js","Bootstrap","Inline CSS","Dynamic CSS","Graphic Design","Content Writing","Logo Design","Parallax UI"],
    shots: 8,
  },
  {
    slug: "cocogirl-ai",
    live: "https://cocogirl.up.railway.app",
    title: "Cocogirl AI",
    role: "product design + frontend",
    desc: "Messaging flows, brand mark and a Next.js frontend for an AI character chat app.",
    bg: "#1A0F1C",
    image: "/media/projects/cocogirl-ai/card.avif",
    tags: ["UI/UX Design", "Web Development", "Branding"],
    url: "/work/cocogirl-ai",
    challenge: "AI chat app",
    service: "product design, branding, frontend",
    industry: "consumer AI",
    goal: "An AI chat app lives or dies by how personal it feels. The goal was to make finding a character, or creating your own, and starting a conversation feel effortless.",
    solution: "I designed the brand mark and the messaging flows and built the interface in Next.js, with layouts people already know from the apps they use every day:",
    pillars: [
      { title: "discovery", text: "A browsable feed of character cards, filtered by personality, so the right match is a scroll away." },
      { title: "creation", text: "A step-by-step character builder that starts with one simple choice: realistic or anime." },
      { title: "conversation", text: "A familiar messenger layout, so chatting needs no learning at all." },
    ],
    pages: [
      { key: "home", label: "explore", path: "/" },
      { key: "create-character", label: "create a character", path: "/create-character" },
    ],
    mobile: [
      { key: "home", label: "explore", path: "/" },
      { key: "create-character", label: "create a character", path: "/create-character" },
      { key: "messages", label: "messages", path: "/messages" },
    ],
    overview: "An AI chat experience built around character profiles, where conversations should feel personal and effortless.",
    story: "I designed the messaging flows and the brand mark, and built the interface in Next.js and TypeScript with Tailwind, Shadcn UI and subtle motion.",
    stack: ["Next.js","TypeScript","Motion","Tailwind","Aceternity","Logo Design","Shadcn UI","Messaging Design"],
    shots: 7,
  },
  {
    slug: "clear-place",
    impact: "40+ modules unified in one dashboard",
    live: "https://clear.place",
    title: "Clear Place",
    role: "dashboard design + development",
    desc: "CRM dashboard, payment portal and kanban boards in one platform, built in React.",
    bg: "#E8EEFB",
    image: "/media/projects/clear-place/card.avif",
    tags: ["Dashboards", "Web Development"],
    url: "/work/clear-place",
    challenge: "SaaS dashboard",
    service: "dashboard design + development",
    industry: "marketing & CRM",
    goal: "Brands juggle separate tools for links, QR codes, events, payments and customers. Clear Place had to put every one of them behind a single sign-in.",
    solution: "I designed and built the platform in React around one question, “what would you like to create today?”, with the CRM, payment portal and kanban boards behind it.",
    pillars: [
      { title: "one place", text: "40+ modules unified in one dashboard: links, pages, events, QR codes, customers and payments." },
      { title: "templates first", text: "Every creation starts from a template, so a new link, page or event is a few clicks away." },
      { title: "readable data", text: "Dense CRM and payment data kept scannable, so the next action is always obvious." },
    ],
    pages: [
      { key: "home", label: "create", path: "/" },
      { key: "events", label: "events", path: "/events" },
      { key: "login", label: "sign in", path: "/login" },
    ],
    mobile: [
      { key: "home", label: "create", path: "/" },
      { key: "events", label: "events", path: "/events" },
      { key: "signup", label: "sign up", path: "/signup" },
    ],
    overview: "One platform with every tool a brand needs: customers, payments and projects managed from a single place.",
    story: "I designed and built the CRM dashboard, payment portal and kanban boards in React with Bootstrap, keeping dense data readable and quick to act on.",
    stack: ["React.js","Bootstrap","Inline CSS","Dynamic CSS","CRM Dashboard","Logo Design","Payment Portal","Kanban Boards"],
    shots: 8,
  },
  {
    slug: "ascension-healthcare",
    title: "Ascension Healthcare",
    role: "frontend engineering",
    desc: "A patient report dashboard with live updates over web sockets, in React and Terra UI.",
    bg: "#EAF4F4",
    image: "/media/projects/ascension-healthcare/card.avif",
    tags: ["Dashboards", "Web Development"],
    url: "/work/ascension-healthcare",
    challenge: "clinical dashboard",
    service: "frontend engineering",
    industry: "healthcare",
    goal: "Patient reports are long and dense. Clinicians needed summaries they can scan at a glance, and updates that arrive without refreshing the page.",
    solution: "I built the interface in React with Terra UI and Tailwind, integrated the reporting APIs and wired web sockets so every report stays current.",
    pillars: [
      { title: "clarity", text: "Report summaries designed to be scanned, not read line by line." },
      { title: "live", text: "Web sockets push report updates the moment they happen." },
      { title: "integration", text: "Reporting APIs connected end to end, inside the hospital's design system." },
    ],
    overview: "A healthcare dashboard that turns patient reports into clear summaries clinicians can scan at a glance.",
    story: "I built the interface in React with Terra UI and Tailwind, integrated the reporting APIs and used web sockets so report updates arrive live.",
    stack: ["React.js","Terra UI","Tailwind CSS","Dashboard","Patient Report","Report Summary","API Integration","Web Sockets"],
    shots: 8,
  },
  {
    slug: "greenfrog-cleaning",
    impact: "+48% booking-flow completion · built for 90% mobile traffic",
    live: "https://greenfrogcleaning.com",
    title: "GreenFrog Cleaning",
    role: "brand + booking product",
    desc: "Brand mark, booking portal, CRM and payment flows for a cleaning company.",
    bg: "#EAF6E9",
    image: "/media/projects/greenfrog-cleaning/card.avif",
    tags: ["Web Development", "Dashboards", "Branding"],
    url: "/work/greenfrog-cleaning",
    challenge: "booking product",
    service: "branding, booking portal, CRM",
    industry: "home services",
    goal: "Almost all of GreenFrog's customers arrive on a phone. Booking a clean had to take a few taps, and the team needed every job in one place.",
    solution: "I designed the brand mark and built the booking portal, CRM and payment flows in React, mobile first from the very first screen:",
    pillars: [
      { title: "booking", text: "A short, phone-first booking flow. Booking completion went up 48%." },
      { title: "operations", text: "A CRM dashboard where the team sees and manages every job." },
      { title: "payments", text: "Payments handled inside the same flow, so nobody leaves to pay." },
    ],
    overview: "A cleaning company's online home, where customers book in a few taps and the team manages every job from one dashboard.",
    story: "I designed the brand mark and built the booking portal, CRM and payment flows in React with Bootstrap and custom CSS.",
    stack: ["React.js","Bootstrap","Inline CSS","Dynamic CSS","CRM Dashboard","Logo Design","Payment Portal","Booking Portal"],
    shots: 8,
  },
  {
    slug: "the-flow",
    title: "The Flow",
    role: "product design + design engineering",
    year: "2026",
    impact: "WebGL water on every section · light & dark mode",
    desc: "This portfolio: one continuous stream of water, from a whirlpool of ideas to a lake where every project ends up shipped.",
    bg: "#06080b",
    image: "/media/projects/the-flow/card.avif",
    tags: ["UI/UX Design", "Web Development", "Branding"],
    url: "/work/the-flow",
    challenge: "portfolio",
    service: "product design, design engineering",
    industry: "personal brand",
    goal: "A portfolio for a product designer who also ships code. It had to show the taste and the engineering at the same time, without reading like a template.",
    solution: "One continuous stream of water, rendered in WebGL, carries you from a whirlpool of ideas to a lake where every project ends up shipped. It stands on three pillars:",
    pillars: [
      { title: "story", text: "One stream ties every section together, from who I am to what I've shipped." },
      { title: "craft", text: "Real-time water, liquid-filled badges and a 3D screening room for the case studies, in light and dark." },
      { title: "performance", text: "Server-rendered pages, AVIF media and lazy WebGL, with 100 for accessibility, best practices and SEO." },
    ],
    pages: [
      { key: "home", label: "home page", path: "/" },
      { key: "all-works", label: "all works", path: "/work" },
      { key: "case-study", label: "case study", path: "/work/athlnk" },
    ],
    mobile: [
      { key: "home", label: "home", path: "/" },
      { key: "all-works", label: "all works", path: "/work" },
      { key: "case-study", label: "case study", path: "/work/athlnk" },
    ],
    overview:
      "My own portfolio, designed as a single stream of water that carries you from who I am, through what I've shipped, to a lake where the conversation starts.",
    story:
      "I designed and built it end to end: a Three.js stream that follows the scroll, realistic liquid shaders inside every vessel, a reflective day-and-night lake, and case studies generated from one content file.",
    stack: ["UI/UX", "Next.js", "TypeScript", "Three.js", "GLSL", "WebGL", "Motion", "Logo Design"],
    shots: 6,
  },
];

/** Your process, from ved-portfolio - each stage plays its clip when the water reaches it. */
export const PROCESS = {
  eyebrow: "the process",
  heading: ["how i ship", "a product."],
  sub: "design and development aren't two handoffs. they're one continuous thread, start to finish.",
  steps: [
    {
      title: "discover",
      body: "Every project starts with understanding the actual problem, not direct Figma. I map user flows and business goals first, so the interface solves something real instead of just looking good.",
      video: "/media/brand/process1.mp4",
      poster: "/media/brand/process1-poster.webp",
      color: "#2F80FF",
      deep: "#1E40AF",
    },
    {
      title: "design",
      body: "UI design that balances usability with personality - wireframes to high-fidelity Figma files, built with production in mind from the first screen, not redesigned twice.",
      video: "/media/brand/process2.mp4",
      poster: "/media/brand/process2-poster.webp",
      color: "#FF8A3D",
      deep: "#C2410C",
    },
    {
      title: "build",
      body: "Design becomes a real, responsive interface - built with Next.js, React, and Tailwind CSS, coded the way it was designed, pixel for pixel.",
      video: "/media/brand/process3.mp4",
      poster: "/media/brand/process3-poster.webp",
      color: "#8B5CF6",
      deep: "#5B21B6",
    },
    {
      title: "ship & optimize",
      body: "Launch is the start, not the finish. I tune load times, fix layout shift, and clean up the small details that separate a finished site from a fast, polished one.",
      video: "/media/brand/process4.mp4",
      poster: "/media/brand/process4-poster.webp",
      color: "#1FC7A0",
      deep: "#0F766E",
    },
  ],
};

export const CLIENTS = {
  label: "products i've shipped for",
  names: ["AthLnk", "Cocogirl AI", "Clear Place", "Ascension Healthcare", "Foreward Golf", "GreenFrog Cleaning"],
};

export type Testimonial = { quote: string; name: string; role: string };

/** Add real quotes from clients here - the section stays hidden until there is at least one. */
export const TESTIMONIALS: Testimonial[] = [];

export const CONTACT = {
  eyebrow: "what's next?",
  heading: { before: "got a product in mind?", lead: "let's ", italic: "ship", after: " it." },
  availability: "available for new products",
  emailHint: "click to copy",
  copied: "copied! talk soon :)",
  footer: "designed, built & shipped by vedank gaur",
  lake: "every stream ends somewhere. this one ends here.",
  lakeHint: "move your cursor across the water",
};

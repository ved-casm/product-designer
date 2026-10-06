import type { Metadata, Viewport } from "next";
import { ldJson, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const TITLE = "Vedank Gaur | Product Designer & Design Engineer";
const DESCRIPTION =
  "Vedank Gaur is a product designer and design engineer from Jaipur who designs products from scratch, builds them in Next.js and ships them - AthLnk, Cocogirl AI, Clear Place and more.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s | Vedank Gaur" },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Vedank Gaur", url: SITE_URL }],
  creator: "Vedank Gaur",
  keywords: [
    "Vedank Gaur",
    "product designer",
    "design engineer",
    "UI/UX designer",
    "Next.js developer",
    "frontend developer",
    "Jaipur",
    "portfolio",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Vedank Gaur",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  // Google Search Console: set GOOGLE_SITE_VERIFICATION to the HTML-tag token (see .env.example).
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f5" },
    { media: "(prefers-color-scheme: dark)", color: "#06080b" },
  ],
};

const THEME_SCRIPT = `try{if("scrollRestoration" in history)history.scrollRestoration="manual";}catch(e){}try{var t=localStorage.getItem("ved-v2-theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;

const PERSON = {
  "@type": "Person",
  "@id": `${SITE_URL}/#person`,
  name: "Vedank Gaur",
  alternateName: "Ved",
  jobTitle: "Product Designer & Design Engineer",
  description: DESCRIPTION,
  url: SITE_URL,
  image: `${SITE_URL}/media/brand/vedank-portrait-square.webp`,
  email: "mailto:vedank0522@gmail.com",
  address: { "@type": "PostalAddress", addressLocality: "Jaipur", addressRegion: "Rajasthan", addressCountry: "IN" },
  sameAs: [
    "https://www.linkedin.com/in/vedank-gaur/",
    "https://github.com/ved-casm",
    "https://www.behance.net/vedankgaur",
    "https://ved-portfolio-nine.vercel.app",
  ],
  knowsAbout: ["Product design", "UI/UX design", "Design engineering", "Next.js", "React", "TypeScript", "Figma"],
};

// Person + WebSite in one graph, so search engines tie the site, its author and the case studies together.
const SITE_LD = {
  "@context": "https://schema.org",
  "@graph": [
    PERSON,
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: DESCRIPTION,
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#person` },
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="v2" suppressHydrationWarning>
      <head>
        {/* Apply the saved / system theme before first paint so there is no light-dark flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preload" href="/fonts/inter-500.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/newsreader-500-italic.woff2" as="font" type="font/woff2" crossOrigin="" />
        {/* Used above the fold on every page; discovered late without a hint, which shifts the headings. */}
        <link rel="preload" href="/fonts/newsreader-latin-500-normal-B66TYsaK.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/newsreader-latin-700-italic-Hha76oyf.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/inter-latin-400-normal-C38fXH4l.woff2" as="font" type="font/woff2" crossOrigin="" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={ldJson(SITE_LD)}
        />
      </head>
      <body>
        {children}
        {/* Accessible bio for screen readers and crawlers. Visually hidden. */}
        <div className="sr-only">
          <h2>About Vedank Gaur - Product Designer &amp; Design Engineer</h2>
          <p>
            I&apos;m Vedank Gaur (Ved), a product designer and design engineer based in Jaipur, India. I design
            products from scratch, build them in Next.js, React and TypeScript, and ship them - so nothing is lost
            between the idea and the browser.
          </p>
          <h2>Selected work</h2>
          <ul>
            <li>AthLnk - product design and Next.js frontend for a platform connecting athletes, coaches and scouts.</li>
            <li>Cocogirl AI - messaging flows, brand mark and frontend for an AI character chat app.</li>
            <li>Clear Place - CRM dashboard, payment portal and kanban boards in one platform.</li>
            <li>Ascension Healthcare - a live patient report dashboard.</li>
            <li>Foreward Golf and GreenFrog Cleaning - brand, web and booking products.</li>
          </ul>
          <h2>Contact</h2>
          <p>
            Email <a href="mailto:vedank0522@gmail.com">vedank0522@gmail.com</a>, LinkedIn{" "}
            <a href="https://www.linkedin.com/in/vedank-gaur/">vedank-gaur</a>, GitHub{" "}
            <a href="https://github.com/ved-casm">ved-casm</a>.
          </p>
        </div>
      </body>
    </html>
  );
}

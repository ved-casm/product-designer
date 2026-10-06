# Vedank Gaur - portfolio

"The flow of a product designer": a portfolio built as one continuous stream of water, from a whirlpool of ideas to a lake where every project ends up shipped.

**Live:** https://product-designer-five.vercel.app

Next.js 16 (App Router) · React 19 · TypeScript · three.js (WebGL water, liquid badges, the 3D screening room) · plain CSS.

## Getting started

Requires Node **22.18+** (the build scripts import TypeScript directly).

```bash
npm install
npm run dev        # http://localhost:3000
```

Before pushing:

```bash
npm run check      # typecheck + lint + tests, must be clean
npm run build      # production build
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev server, production build, production server |
| `npm run check` | `typecheck` + `lint` + `test` |
| `npm test` / `test:watch` / `test:coverage` | Jest + React Testing Library (see Testing below) |
| `npm run media` | Optimises everything in `public/media`: AVIF + WebP twins, 800w/480w twins for project screens, video posters. Set `FFMPEG_PATH` if ffmpeg is not on `PATH`. Safe to re-run; only missing files are written. |
| `npm run og` | Link-preview images for case studies (`public/media/projects/<slug>/share.jpg`): the main screenshot with the project name on it, ~80 KB JPEG. Re-run after changing a project's title, description, impact or `og.jpg`. |
| `npm run resume` | Builds `public/resume/VedankGaur_ProductDesigner_Resume.pdf` from `resume/resume.html` with headless Chrome (`CHROME_PATH` if it isn't found). |

## Where things live

```
app/                      routes + SEO files
  page.tsx                home (client-rendered: the water hero needs the viewport)
  work/page.tsx           all works (server-rendered)
  work/[slug]/page.tsx    case studies (server-rendered, static for every project)
  layout.tsx              fonts, theme script, site-wide metadata + JSON-LD
  sitemap.ts robots.ts manifest.ts opengraph-image.tsx
components/portfolio/
  content.ts              ALL copy and project data - edit this, not the components
  CaseStudy.tsx           case study page (brief, page-by-page designs, iPhone mockups, pipeline, gallery)
  Showcase.tsx            home "case studies" section; ProjectorRoom.tsx is its 3D room
  WaterStream.tsx         the WebGL water used everywhere
lib/site.ts               SITE_URL and helpers for absolute URLs / JSON-LD
public/media/projects/<slug>/
  01..08.avif|webp        gallery screens (+ -800w twins)
  card.avif|webp          card image (+ -480w twin)
  pages/<key>-desktop|mobile.avif|webp   page captures for "page by page" and the iPhone mockups
  og.jpg / share.jpg      main screenshot / link preview
scripts/                  media, OG and resume pipelines
```

## Adding a case study

1. Add an entry to `PROJECTS` in `components/portfolio/content.ts` (TypeScript lists every required field: `challenge`, `service`, `industry`, `goal`, `solution`, three `pillars`, ...). `pages` and `mobile` are optional; leave them out if there are no captures.
2. Put the images in `public/media/projects/<slug>/`: `01.webp`..`0N.webp` (set `shots: N`), `card.webp`, `og.jpg` (1200×630 main screenshot) and, optionally, `pages/<key>-desktop.png|webp` and `pages/<key>-mobile.webp` (390×844 @2x).
3. `npm run media` then `npm run og`.
4. `npm run check && npm run build`. The page, sitemap entry, structured data and link preview are generated from the content entry.

## Deploying (Vercel)

1. Import the repo in Vercel; no build settings needed.
2. Environment variables (see `.env.example`):
   - `NEXT_PUBLIC_SITE_URL` - your domain, e.g. `https://vedankgaur.com`. Without it the Vercel production URL is used. Canonical URLs, link previews, `sitemap.xml` and `robots.txt` all use it, so set it as soon as there's a custom domain.
   - `GOOGLE_SITE_VERIFICATION` - optional, for Google Search Console.

### Getting into Google

Already in place: `sitemap.xml` (with image entries), `robots.txt`, canonical URLs, Open Graph / Twitter cards, a web manifest, and JSON-LD (`Person` + `WebSite` site-wide, `CollectionPage` on `/work`, `CreativeWork` + `BreadcrumbList` on every case study).

After the first deploy:

1. [Google Search Console](https://search.google.com/search-console) → add the domain → verify (DNS, or the HTML-tag token in `GOOGLE_SITE_VERIFICATION` and redeploy).
2. Sitemaps → submit `https://<your-domain>/sitemap.xml`.
3. URL inspection → request indexing for `/`, `/work` and the case studies.

Check link previews with the [Open Graph debugger](https://www.opengraph.xyz/) or by pasting a case-study URL into WhatsApp/LinkedIn.

## Testing

Jest + React Testing Library, set up through `next/jest` (Next's SWC compiler, CSS mocks, `.env`). Tests live in `__tests__/`; `jest.setup.ts` adds the browser APIs jsdom lacks (IntersectionObserver, ResizeObserver, matchMedia, requestIdleCallback) and reports no WebGL, so the fallbacks get exercised.

What they cover:

- **content** - every project has its full brief, unique slug and every image it references on disk.
- **SEO** - sitemap (all pages, only existing images), robots, manifest icons, JSON-LD escaping.
- **Picture** - AVIF/WebP pairs and the srcset twins.
- **theme / useIsMobile** - one shared theme across providers, persisted on toggle; breakpoint on first render and on resize.
- **RevealLayer** - "back to top" brings the desktop hero back and stays there (regression test).
- **WorkGrid** - every card is a real link; filters.
- **CaseStudy** - brief, pillars, page-by-page designs, iPhone frames, lightbox, next project, heading order, switching case studies.
- **404** and **ProjectorRoom** (no-WebGL fallback).

WebGL itself (the water, the room, the lake) can't render in jsdom; check it in a browser.

## Notes for contributors

- This is Next.js 16: read `node_modules/next/dist/docs/` before using an API you remember from older versions (see `AGENTS.md`).
- Every WebGL component creates its context lazily and releases it on unmount (`forceContextLoss`): browsers cap live contexts at ~16 and kill the oldest.
- Theme lives in an external store (`components/portfolio/theme.tsx`) so server-rendered pages hydrate without mismatches; `useIsMobile` does the same for the breakpoint. Prefer CSS media queries over `useIsMobile` for layout on server-rendered pages.
- Images go through `components/Picture.tsx` (AVIF first, WebP fallback, optional `small` + `sizes` for the -800w/-480w twins).

## License

All rights reserved. The code is public to be read, not reused: see [LICENSE](LICENSE). For permission to use any part of it, write to vedank0522@gmail.com.

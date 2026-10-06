# Prompt: rebuild "v1 - the string" (coolestdesigner.com study)

Paste everything below this line into any capable coding model.

---

You are rebuilding, as a **private learning study**, the portfolio at **https://coolestdesigner.com/** inside a **Next.js (App Router) + TypeScript** project. The goal is a pixel- and motion-faithful recreation: every SVG draw, text reveal, hover and timing must match the live site. Do not invent new effects and do not "improve" anything.

## 0. Ground rules

1. The live site is a client-only Vite + React SPA. Fetch its HTML and its JS bundles (`/assets/index-*.js`, and the lazily-loaded `/assets/Works-*.js`), pretty-print them, and treat them as the source of truth. Port component by component. Never guess a number you can read from the bundle.
2. There is **no GSAP / Framer Motion / Lenis**. Every animation is CSS transitions, SVG `stroke-dasharray`/`stroke-dashoffset` (with `pathLength={1}`) and `requestAnimationFrame` loops. Reproduce them the same way.
3. Render the page client-only: a `"use client"` wrapper with `next/dynamic(..., { ssr: false })`, because layout depends on `window` (canvas width, path lengths, mobile check).
4. Reuse the site's **compiled CSS verbatim** (it is inlined in the HTML `<style>`): Tailwind v3 output + custom rules (`.appear`, `.is-visible`, custom SVG arrow cursor, hidden scrollbars, `prefers-reduced-motion`). Do not use Tailwind v4 utilities for these classes - v4 compiles `scale-*` differently.
5. Download every asset the bundles reference into `public/` (illustrations `.webp/.png`, work `.webp/.mp4`, logo `.svg`s, fonts). Fonts: Inter 400/500/600/700, Newsreader 500/600/700 + 500 italic + 700 italic. Preload Inter 500 and Newsreader 500 italic.
6. Extract the long SVG path strings **programmatically** from the minified bundle (regex for string literals starting with `M` longer than ~60 chars) into a `paths.ts`. Never retype them.
7. Remove the site's analytics (Mixpanel / `~flock.js`). Keep everything else.

## 1. Design tokens

- Background `#f5f5f5`; text primary `#000`, secondary `#404040`, tertiary `#808080`; hairlines `#999`; dark section `#181818`.
- Letter-spacing everywhere `-0.04 × font-size` unless stated.
- Type scale (copy exact values from the bundle's style object): `displayXL` Newsreader 500 `clamp(36px,7vw,48px)` lh 1; `displayL` Newsreader 500 `clamp(28px,5.5vw,36px)` ls −0.03em lh 1.15; `titleM` Inter 500 `clamp(16px,2.2vw,20px)`; `bodyL` Inter 400 `clamp(15px,2vw,18px)`; `bodyM` Inter 400 16px; `bodyS` Inter 400 14px ls −0.02em; `caption` Inter 500 13px; `wordleLetter` Inter 700 `clamp(36px,12vw,104px)` ls −0.05em; `cursorBubble` Inter 500 14px white.
- Breakpoint: mobile `< 768px` (state starts `false`, set in an effect - desktop renders first).

## 2. Desktop architecture (≥ 768px)

- A fixed full-screen **reveal layer** holds a horizontally scrolling `<main class="thin-scroll">` (100vh). Inside it, a canvas div of width `max(6710, round(6509 + viewportW/2) − 140)`.
- **Wheel → horizontal smooth scroll**: capture wheel on window; target += dominant delta; each frame `scrollLeft += (target − scrollLeft) × 0.18`. Velocity-based **motion blur** on the canvas div: `blur(min(3, px/ms × 0.5))`, decaying ×0.82 per frame.
- `progress = (scrollLeft + viewportW) / canvasW`. The venn triggers at `progress ≥ 6710 / canvasW`; when it first triggers, lock page scroll for **4200ms**.
- At the right end, further downward wheel (accumulated ≥ 12px) slides the reveal layer up (`translateY(-100vh)`, `700ms cubic-bezier(0.7,0,0.2,1)`) to reveal the **Works** section; scroll-up ≥ 80px at the top of Works slides it back. A 2px spacer keeps `scrollY = 2` as the "revealed" sentinel. Emits `works-revealed` / `works-hidden` window events.
- `.appear` blur-in (opacity 0, blur 14px, translateY 10px → visible, 700ms ease-out) on every absolute child of the canvas via an IntersectionObserver rooted on the scroller (`threshold 0.1, rootMargin 0px 10% 0px 10%`).

### 2.1 The string (SVG 6520×565, vertically centred +20px)
- **Scribble** ("brain", huge tangled path starting at x=0): stroke `#1a1a1a` 3px round, `pathLength=1`; draws `0 → 1` over **4s ease-in-out** ~150ms after load.
- **Main string** = reversed brain-hobbies path + line to `2961.53,369.215` + book/timeline path. It is revealed by `strokeDasharray = visible total` driven by scroll x → arc length (piecewise mapping across the segments 1527 → 2870.5 → 2961.53 → 6512.5), transition 1.2s ease-out. It shows a 3% teaser after the scribble finishes, is capped at the brain segment until scroll x ≥ 2870.5 (+250ms), and becomes fully drawn when the venn triggers.
- On venn trigger: after 1400ms the string and scribble **drain** from their start (dashoffset; 1000ms / 1600ms ease-in-out). An 8px cap line at `1523–1531, 384.404` and a 2.5r dot at `6512.5, 302` show at the joints.
- Caption arrow next to the scribble (`M2 30 C 12 22, 22 12, 40 6 L 32 2 L 40 6 L 36 14`, `#808080`): dashoffset 1→0 `1800ms ease-out 2000ms` delay, text "an accurate representation of my brain." fades in `500ms ease-out 3800ms` delay.

### 2.2 Content along the canvas (exact x / y offsets are in the bundle; y is `calc(50% + Npx)`)
- Bottom-left title "the / anatomy of a / cool designer." Inter 600 40px; bottom-right "or do i say, welcome to my portfolio :)" with two 160px buttons (outline "view work", black "let's talk" → mailto).
- Hobbies cluster (controller, microscope, cat with bottom gradient fade, camera, racket, duolingo owl) with the centred trio "i tinker with a lot of stuff. / a jack of all trades / what a cool way to say i've adhd". Images scale 1.1 on hover (300ms ease-out); hover shows the cursor bubble with each item's line.
- "but few things have my heart." + brain / computer / notebook illustrations with title+body text blocks.
- Timeline: 7 milestones (stem 2×90px `#999`, 8px dot, text above/below), each fading/translating in (900ms) when scroll x passes its threshold; "surprisingly, i also love..." blurs in (12px → 0, 900ms); "taking ownership." + the 90%-of-teams line.
- **Venn**: wavy badge path (267×267) - stage timers after trigger: 700ms draw design outline (1500ms, start at 0.5), 2300ms clone dev+business, 2500ms spread (`translate(±68/67px, 134px)`, 1100ms `cubic-bezier(0.42,0,0.58,1)`), 3800ms fill (`fill-opacity .5`, stroke → fill colour, labels fade in). Colours: design `#FF7D1A`, dev `#8A38F5`, business `#359C3C`. Outro "i'm Nik, *more* than a designer." + "that was the string theory of my designs." at 4100ms (800ms fade + 8px rise, sub delayed 150ms); cursor bubble "pretty much sums up my expertise." 400ms later.

### 2.3 Cursor comment bubble
Follows the mouse with lerp 0.28/frame, offset `translate(18px, 22px)`, blue `#2E90FA` with `2px #1570EF` border, radius `2px 24px 24px 24px`, types text char-by-char (32ms + random 35ms; +120 after comma, +180 after . ! ?, +25 after space; starts after 180ms; blinking caret), auto-hides 5s after finishing. Intro "Hey there, Nik here." at 5200ms. Hides when the active section changes. Driven by `cursor-comment:show` / `cursor-comment:hide` window events.

### 2.4 Nav (fixed, 88px)
"Nik" Newsreader 600 32px left; right links brain / work / linkedin / blogs? ("coming soon" bubble). Turns white over the Works section and gets a `#181818` bar once past the Works separator. "brain" rewinds the scroller (900ms ease-out cubic) and replays the hero.

## 3. Works section (`#181818`, lazy-loaded on idle)
- Sticky 100vh intro "you must be waiting for this part already." + **Wordle "WORKS"**: letters type in from 600ms every 220ms, then tiles flip `rotateX(180deg)` to `#538D4E` every 280ms (600ms `cubic-bezier(0.45,0,0.25,1)`); green bubble "we're friends if you recognize this animation ;)" after 2s.
- Sticky hairline separator, sticky left column (copy, "worked with builders from" logos, filter chips), right column of 4:3 cards (videos autoplay in the middle 30% of the viewport; hover overlay 0.62 black, tags + title + desc slide up 12px, 96px white "view" circle follows the cursor). Show 5, then "+N more. interested?".

## 4. Mobile (< 768px)
A 393×5120 artboard scaled to `innerWidth/393`: a vertical string in 5 weighted segments drawn by window scroll progress, illustrations, the same copy, a vertical timeline, a 179px venn (timers 400/2000/2200/3400ms) and a hamburger menu. Scroll-velocity blur on the artboard.

## 5. Extra routes
`/link` - rickroll page (muted autoplay YouTube embed, unmute on hover, "you've been rickrolled."). 404 page in the same type scale.

## 6. Done when
Side-by-side with the live site at 1024×768, 1920×911 and 375×812: identical layout, identical timings, no console errors, `next build` passes.

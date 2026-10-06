"use client";

import dynamic from "next/dynamic";
import CursorComment from "../CursorComment";
import { CaseNav } from "./CaseStudy";
import { PROJECTS } from "./content";
import { ThemeProvider, V } from "./theme";
import { WorkGrid } from "./Works";

const Contact = dynamic(() => import("./Contact"), { ssr: false });

/** /work - every case study in one place. */
function Inner() {
  return (
    <>
      <CaseNav />
      <CursorComment introText="every one of these shipped." delay={2400} />
      <main className="work-index" style={{ background: V.works }}>
        <header className="work-index-head">
          <p className="case-eyebrow" style={{ color: "rgba(255,255,255,0.5)" }}>
            all works · {String(PROJECTS.length).padStart(2, "0")} products
          </p>
          <h1 className="work-index-title">
            the whole <em>stream.</em>
          </h1>
        </header>
        <WorkGrid />
      </main>
      <Contact />
    </>
  );
}

export default function WorkIndex() {
  return (
    <ThemeProvider>
      <Inner />
    </ThemeProvider>
  );
}

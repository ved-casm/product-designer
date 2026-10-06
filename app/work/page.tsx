import type { Metadata } from "next";
import WorkIndex from "@/components/portfolio/WorkIndex";
import { PROJECTS } from "@/components/portfolio/content";
import { abs, ldJson, SITE_URL } from "@/lib/site";

const TITLE = "All works";
const DESCRIPTION = "Every product Vedank Gaur has designed, built and shipped - case studies with process, ownership and screens.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/work" },
  openGraph: { type: "website", url: "/work", title: `${TITLE} | Vedank Gaur`, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: `${TITLE} | Vedank Gaur`, description: DESCRIPTION },
};

// The case studies as an ordered list, so search engines see the collection and where each one lives.
const LD = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": `${abs("/work")}#page`,
  url: abs("/work"),
  name: `${TITLE} | Vedank Gaur`,
  description: DESCRIPTION,
  isPartOf: { "@id": `${SITE_URL}/#website` },
  author: { "@id": `${SITE_URL}/#person` },
  mainEntity: {
    "@type": "ItemList",
    itemListElement: PROJECTS.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p.title, url: abs(p.url) })),
  },
};

export default function WorkPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={ldJson(LD)} />
      <WorkIndex />
    </>
  );
}

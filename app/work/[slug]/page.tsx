import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CaseStudy from "@/components/portfolio/CaseStudy";
import { PROJECTS } from "@/components/portfolio/content";
import { abs, ldJson, SITE_URL } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

// The share image is the main screenshot with the project name on it, made by `npm run og` (scripts/build-og.mjs).
const shareImage = (slug: string, title: string) => ({
  url: `/media/projects/${slug}/share.jpg`,
  width: 1200,
  height: 630,
  type: "image/jpeg",
  alt: `${title} - case study by Vedank Gaur`,
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = PROJECTS.find((p) => p.slug === slug);
  if (!project) return {};
  const title = `${project.title} - case study`;
  const image = shareImage(slug, project.title);
  return {
    title,
    description: project.overview,
    alternates: { canonical: `/work/${slug}` },
    openGraph: { type: "article", title, description: project.overview, url: `/work/${slug}`, siteName: "Vedank Gaur", images: [image] },
    twitter: { card: "summary_large_image", title, description: project.overview, images: [image] },
  };
}

export default async function CaseStudyPage({ params }: Props) {
  const { slug } = await params;
  const project = PROJECTS.find((p) => p.slug === slug);
  if (!project) notFound();
  const url = abs(`/work/${slug}`);
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CreativeWork",
        "@id": `${url}#work`,
        name: project.title,
        headline: `${project.title} - case study`,
        description: project.overview,
        abstract: project.goal,
        url,
        image: [abs(`/media/projects/${slug}/share.jpg`), abs(`/media/projects/${slug}/og.jpg`)],
        genre: project.challenge,
        keywords: [...project.tags, ...project.stack].join(", "),
        about: project.industry,
        ...(project.year ? { dateCreated: project.year } : {}),
        ...(project.live ? { sameAs: project.live } : {}),
        creator: { "@id": `${SITE_URL}/#person` },
        isPartOf: { "@id": `${SITE_URL}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: abs("/") },
          { "@type": "ListItem", position: 2, name: "All works", item: abs("/work") },
          { "@type": "ListItem", position: 3, name: project.title, item: url },
        ],
      },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={ldJson(ld)} />
      <CaseStudy slug={slug} />
    </>
  );
}

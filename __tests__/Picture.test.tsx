import { render, screen } from "@testing-library/react";
import Picture from "@/components/Picture";

describe("<Picture>", () => {
  it("serves AVIF first with a WebP fallback", () => {
    const { container } = render(<Picture src="/media/projects/athlnk/01.avif" alt="AthLnk cover" />);
    const source = container.querySelector("source");
    expect(source).toHaveAttribute("type", "image/avif");
    expect(source).toHaveAttribute("srcset", "/media/projects/athlnk/01.avif");
    expect(screen.getByAltText("AthLnk cover")).toHaveAttribute("src", "/media/projects/athlnk/01.webp");
  });

  it("offers the small twin through srcset when given a size hint", () => {
    const { container } = render(<Picture src="/media/projects/athlnk/02.webp" small={800} sizes="(max-width: 767px) 100vw, 640px" alt="" />);
    const source = container.querySelector("source")!;
    expect(source.getAttribute("srcset")).toBe("/media/projects/athlnk/02-800w.avif 800w, /media/projects/athlnk/02.avif 1600w");
    expect(source).toHaveAttribute("sizes", "(max-width: 767px) 100vw, 640px");
    expect(container.querySelector("img")?.getAttribute("srcset")).toBe("/media/projects/athlnk/02-800w.webp 800w, /media/projects/athlnk/02.webp 1600w");
  });

  it("falls back to a plain <img> for other formats", () => {
    const { container } = render(<Picture src="/media/brand/monogram.png" alt="VV" />);
    expect(container.querySelector("picture")).toBeNull();
    expect(screen.getByAltText("VV")).toHaveAttribute("src", "/media/brand/monogram.png");
  });

  it("passes through loading hints", () => {
    render(<Picture src="/a.avif" alt="x" loading="lazy" decoding="async" />);
    expect(screen.getByAltText("x")).toHaveAttribute("loading", "lazy");
  });
});

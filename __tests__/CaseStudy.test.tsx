import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CaseStudy from "@/components/portfolio/CaseStudy";
import { PROJECTS } from "@/components/portfolio/content";

// The water is WebGL and the contact footer has its own tests; the page around them is what these tests cover.
jest.mock("@/components/portfolio/LazyWaterStream", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/portfolio/Contact", () => ({ __esModule: true, GO_FLOW_EVENT: "v2-go-flow", default: () => <footer>contact</footer> }));
jest.mock("@/components/portfolio/WaterBadge", () => ({ __esModule: true, default: ({ label }: { label?: string }) => <span>{label}</span> }));

const athlnk = PROJECTS.find((p) => p.slug === "athlnk")!;
const withoutPages = PROJECTS.find((p) => !p.pages)!;

// The footer is loaded with next/dynamic; wait for it so every test sees the finished page.
async function renderCase(slug: string) {
  const view = render(<CaseStudy slug={slug} />);
  await screen.findByText("contact");
  return view;
}

describe("<CaseStudy>", () => {
  it("leads with the title and the brief: challenge, service, industry", async () => {
    await renderCase("athlnk");
    expect(screen.getByRole("heading", { level: 1, name: athlnk.title })).toBeInTheDocument();
    const meta = screen.getByText("challenge").closest("dl")!;
    expect(within(meta).getByText(athlnk.challenge)).toBeInTheDocument();
    expect(within(meta).getByText(athlnk.service)).toBeInTheDocument();
    expect(within(meta).getByText(athlnk.industry)).toBeInTheDocument();
  });

  it("states the goal, the solution and its three pillars, then links to the live product", async () => {
    await renderCase("athlnk");
    expect(screen.getByText(athlnk.goal)).toBeInTheDocument();
    expect(screen.getByText(athlnk.solution)).toBeInTheDocument();
    for (const p of athlnk.pillars) {
      expect(screen.getByRole("heading", { level: 3, name: p.title })).toBeInTheDocument();
      expect(screen.getByText(p.text)).toBeInTheDocument();
    }
    const visit = screen.getByRole("link", { name: /visit website/i });
    expect(visit).toHaveAttribute("href", athlnk.live);
    expect(visit).toHaveAttribute("target", "_blank");
    expect(visit.getAttribute("rel")).toMatch(/noopener/);
  });

  it("shows every page design in a browser frame, numbered, with its address", async () => {
    await renderCase("athlnk");
    const pages = athlnk.pages!;
    pages.forEach((pg, i) => {
      const button = screen.getByRole("button", { name: `Enlarge ${pg.label}` });
      const figure = button.closest("figure")!;
      expect(within(figure).getByText(`/ dsgn ${String(i + 1).padStart(2, "0")}`)).toBeInTheDocument();
      expect(within(button).getByAltText(`${athlnk.title}: ${pg.label}, desktop`)).toBeInTheDocument();
      expect(button).toHaveTextContent(`athlnk.com${pg.path === "/" ? "" : pg.path}`);
    });
  });

  it("shows the mobile screens in iPhone frames", async () => {
    const { container } = await renderCase("athlnk");
    expect(container.querySelectorAll(".iphone")).toHaveLength(athlnk.mobile!.length);
    for (const s of athlnk.mobile!) expect(screen.getByAltText(`${athlnk.title}: ${s.label}, on iPhone`)).toBeInTheDocument();
  });

  it("leaves out the design and phone sections for a project without captures", async () => {
    const { container } = await renderCase(withoutPages.slug);
    expect(screen.queryByText("the designs")).toBeNull();
    expect(container.querySelector(".iphone")).toBeNull();
    expect(screen.getByText(withoutPages.goal)).toBeInTheDocument();
  });

  it("opens a design in the lightbox and closes it with Escape", async () => {
    await renderCase("athlnk");
    // While closed it is aria-hidden, which also empties its accessible name: find it by role, check the label.
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog).toHaveAttribute("aria-label", "Enlarged screen");
    expect(dialog).toHaveAttribute("aria-hidden", "true");

    await userEvent.click(screen.getByRole("button", { name: `Enlarge ${athlnk.pages![0].label}` }));
    expect(dialog).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByRole("dialog", { name: "Enlarged screen" })).toBe(dialog);
    expect(dialog.querySelector("img")).toHaveAttribute("src", `/media/projects/athlnk/pages/${athlnk.pages![0].key}-desktop.webp`);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(dialog).toHaveAttribute("aria-hidden", "true");
  });

  it("links on to the next project, wrapping from the last to the first", async () => {
    const last = PROJECTS[PROJECTS.length - 1];
    await renderCase(last.slug);
    expect(screen.getByText("next project").closest("a")).toHaveAttribute("href", PROJECTS[0].url);
  });

  it("never skips a heading level", async () => {
    const { container } = await renderCase("athlnk");
    const levels = [...container.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((h) => Number(h.tagName[1]));
    expect(levels[0]).toBe(1);
    expect(levels.filter((l) => l === 1)).toHaveLength(1);
    for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
  });

  it("moves from one case study to another without crashing (regression: null node during the swap)", async () => {
    const { rerender } = await renderCase("greenfrog-cleaning");
    expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName("GreenFrog Cleaning");
    expect(() =>
      act(() => {
        rerender(<CaseStudy slug="the-flow" />);
        // ResizeObserver callbacks can land while React swaps the nodes.
        window.dispatchEvent(new Event("resize"));
      }),
    ).not.toThrow();
    expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName("The Flow");
  });
});

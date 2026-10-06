import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PROJECTS } from "@/components/portfolio/content";
import { WorkGrid } from "@/components/portfolio/Works";

// Works.tsx also exports the home showcase (projector room + router); the grid doesn't use it.
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }) }));

const cardTitles = () => screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent?.replace("↗", "").trim());

describe("<WorkGrid> (/work)", () => {
  it("shows every project as a real link to its case study (crawlable, opens in a new tab)", () => {
    render(<WorkGrid />);
    for (const p of PROJECTS) {
      const heading = screen.getByRole("heading", { level: 3, name: new RegExp(`^${p.title}`) });
      const link = heading.closest("a");
      expect(link).not.toBeNull();
      expect(link).toHaveAttribute("href", p.url);
    }
  });

  it("filters by discipline and clears the filter on a second click", async () => {
    render(<WorkGrid />);
    expect(cardTitles()).toHaveLength(PROJECTS.length);

    const dashboards = screen.getByRole("button", { name: "Dashboards" });
    await userEvent.click(dashboards);
    const expected = PROJECTS.filter((p) => p.tags.includes("Dashboards")).map((p) => p.title);
    expect(cardTitles()).toEqual(expected);

    await userEvent.click(dashboards);
    expect(cardTitles()).toHaveLength(PROJECTS.length);
  });

  it("combines filters as either-or", async () => {
    render(<WorkGrid />);
    await userEvent.click(screen.getByRole("button", { name: "Dashboards" }));
    await userEvent.click(screen.getByRole("button", { name: "Graphic Design" }));
    const expected = PROJECTS.filter((p) => p.tags.some((t) => t === "Dashboards" || t === "Graphic Design")).map((p) => p.title);
    expect(cardTitles()).toEqual(expected);
  });

  it("shows the impact line where a project has one", () => {
    render(<WorkGrid />);
    const withImpact = PROJECTS.find((p) => p.impact)!;
    const card = screen.getByRole("heading", { level: 3, name: new RegExp(`^${withImpact.title}`) }).closest("a")!;
    expect(within(card).getByText(withImpact.impact!)).toBeInTheDocument();
  });

  it("introduces the grid with a section heading (regression: h1 jumped straight to h3)", () => {
    render(<WorkGrid />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/designed, built and shipped/i);
  });
});

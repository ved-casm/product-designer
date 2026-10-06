import { render, screen } from "@testing-library/react";
import NotFound, { metadata } from "@/app/not-found";

describe("404 page", () => {
  it("says the page is missing and offers a way home and to all works", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/this stream ran dry/i);
    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /all works/i })).toHaveAttribute("href", "/work");
  });

  it("is kept out of search results and names the right person", () => {
    expect(metadata.robots).toMatchObject({ index: false });
    expect(String(metadata.description)).toMatch(/Vedank Gaur/);
    expect(String(metadata.title)).not.toMatch(/Nik/);
  });
});

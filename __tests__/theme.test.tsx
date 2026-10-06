import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "@/components/portfolio/theme";
import { useIsMobile } from "@/components/useIsMobile";

function ThemeProbe() {
  const { theme, toggle } = useTheme();
  return (
    <button type="button" onClick={toggle}>
      theme: {theme}
    </button>
  );
}

describe("theme store", () => {
  it("starts from the theme the inline script already applied, and toggles + remembers it", async () => {
    // Read once per page and shared by every provider; this file gets a fresh module, so set it first.
    document.documentElement.dataset.theme = "dark";
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("theme: dark");

    await userEvent.click(button);
    expect(button).toHaveTextContent("theme: light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("ved-v2-theme")).toBe("light");
  });

  it("keeps every provider on the page in sync", async () => {
    render(
      <>
        <ThemeProvider>
          <ThemeProbe />
        </ThemeProvider>
        <ThemeProvider>
          <ThemeProbe />
        </ThemeProvider>
      </>,
    );
    const [a, b] = screen.getAllByRole("button");
    const before = a.textContent;
    await userEvent.click(a);
    expect(a.textContent).not.toBe(before);
    expect(b.textContent).toBe(a.textContent);
  });
});

describe("useIsMobile", () => {
  const setWidth = (w: number) => Object.defineProperty(window, "innerWidth", { configurable: true, value: w });

  it("is true below the 768px breakpoint on the first client render", () => {
    setWidth(390);
    expect(renderHook(() => useIsMobile()).result.current).toBe(true);
  });

  it("is false on desktop widths", () => {
    setWidth(1440);
    expect(renderHook(() => useIsMobile()).result.current).toBe(false);
  });

  it("follows a resize", () => {
    setWidth(1440);
    const listeners: (() => void)[] = [];
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({ ...original(q), addEventListener: (_: string, fn: () => void) => listeners.push(fn) })) as unknown as typeof window.matchMedia;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    setWidth(390);
    act(() => listeners.forEach((fn) => fn()));
    expect(result.current).toBe(true);
    window.matchMedia = original;
  });
});

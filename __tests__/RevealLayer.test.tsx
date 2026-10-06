import { act, render } from "@testing-library/react";
import RevealLayer from "@/components/RevealLayer";
import { REVEAL_OFFSET as N } from "@/components/assets";

const setScrollY = (y: number) => Object.defineProperty(window, "scrollY", { configurable: true, value: y });
const scrollTo = (y: number) => {
  setScrollY(y);
  window.dispatchEvent(new Event("scroll"));
};

describe("<RevealLayer> (desktop hero over the works)", () => {
  let revealed: number;
  let hidden: number;
  const onRevealed = () => (revealed += 1);
  const onHidden = () => (hidden += 1);

  beforeEach(() => {
    jest.useFakeTimers();
    revealed = 0;
    hidden = 0;
    setScrollY(0);
    window.addEventListener("works-revealed", onRevealed);
    window.addEventListener("works-hidden", onHidden);
  });
  afterEach(() => {
    window.removeEventListener("works-revealed", onRevealed);
    window.removeEventListener("works-hidden", onHidden);
    jest.useRealTimers();
  });

  it("reveals the works once the page scrolls past the offset", () => {
    render(
      <RevealLayer unlocked>
        <p>hero</p>
      </RevealLayer>,
    );
    act(() => scrollTo(N + 400));
    expect(revealed).toBe(1);
  });

  it('"back to top" brings the hero back and stays there (regression: it re-revealed the case studies)', () => {
    render(
      <RevealLayer unlocked>
        <p>hero</p>
      </RevealLayer>,
    );
    act(() => scrollTo(5000)); // at the bottom of the page
    expect(revealed).toBe(1);

    act(() => {
      window.dispatchEvent(new Event("nav-go-hero"));
    });
    expect(hidden).toBe(1);

    // The slide parks the page at N before settling at 0: that stop must not count as scrolling into the works.
    act(() => scrollTo(N));
    act(() => {
      jest.advanceTimersByTime(720);
    });
    act(() => scrollTo(0));
    expect(revealed).toBe(1);
  });

  it("still lets the visitor scroll back into the works after the hero has returned", () => {
    render(
      <RevealLayer unlocked>
        <p>hero</p>
      </RevealLayer>,
    );
    act(() => scrollTo(5000));
    act(() => {
      window.dispatchEvent(new Event("nav-go-hero"));
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    act(() => scrollTo(N + 10));
    expect(revealed).toBe(2);
  });
});

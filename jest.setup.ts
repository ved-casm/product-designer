import "@testing-library/jest-dom";

// Browser APIs the site relies on that jsdom doesn't provide.

/** IntersectionObserver that reports every observed element as on screen, unless a test says otherwise. */
class MockIntersectionObserver {
  static intersecting = true;
  static instances: MockIntersectionObserver[] = [];
  readonly callback: IntersectionObserverCallback;
  readonly options?: IntersectionObserverInit;
  readonly targets = new Set<Element>();
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }
  observe(el: Element) {
    this.targets.add(el);
    this.callback([{ isIntersecting: MockIntersectionObserver.intersecting, target: el } as IntersectionObserverEntry], this as never);
  }
  unobserve(el: Element) {
    this.targets.delete(el);
  }
  disconnect() {
    this.targets.clear();
  }
  takeRecords() {
    return [];
  }
}
Object.defineProperty(window, "IntersectionObserver", { writable: true, value: MockIntersectionObserver });

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, "ResizeObserver", { writable: true, value: MockResizeObserver });

// matchMedia answers from the current window width for (max-width) queries; everything else is false.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => {
    const max = /max-width:\s*(\d+)px/.exec(query);
    return {
      matches: max ? window.innerWidth <= Number(max[1]) : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    };
  },
});

Object.defineProperty(window, "requestIdleCallback", {
  writable: true,
  value: (cb: IdleRequestCallback) => window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 0),
});
Object.defineProperty(window, "cancelIdleCallback", { writable: true, value: (id: number) => window.clearTimeout(id) });

// jsdom logs "not implemented" for scrolling; tests move scrollY themselves.
window.scrollTo = jest.fn() as unknown as typeof window.scrollTo;
Element.prototype.scrollIntoView = jest.fn();

// No canvas contexts: the WebGL probe sees a browser without WebGL (the fallback path), quietly.
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", { writable: true, value: () => null });

// Media elements: jsdom has no playback.
Object.defineProperty(HTMLMediaElement.prototype, "play", { writable: true, value: () => Promise.resolve() });
Object.defineProperty(HTMLMediaElement.prototype, "pause", { writable: true, value: () => {} });

export { MockIntersectionObserver };

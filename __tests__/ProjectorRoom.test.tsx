import { render, waitFor } from "@testing-library/react";
import ProjectorRoom from "@/components/portfolio/ProjectorRoom";

// jsdom has no WebGL, which is exactly the case to cover: old GPUs, blocked drivers, locked-down browsers.
describe("<ProjectorRoom> without WebGL", () => {
  it("shows the painted fallback instead of a blank box, and never creates a canvas", async () => {
    const { container } = render(
      <ProjectorRoom slides={[{ image: "/media/projects/athlnk/01.webp" }]} index={0} theme="dark" onOpen={jest.fn()} onSwipe={jest.fn()} className="showcase-room" />,
    );
    const host = container.firstElementChild!;
    await waitFor(() => expect(host).toHaveClass("room-fallback"));
    expect(host).toHaveClass("showcase-room");
    expect(container.querySelector("canvas")).toBeNull();
    expect(host).toHaveAttribute("aria-hidden", "true");
  });
});

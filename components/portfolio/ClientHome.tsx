"use client";

import dynamic from "next/dynamic";
import { HeroSkeleton } from "./Skeleton";

// Measured from the window and rendered with WebGL, so client-only - the skeleton paints instantly meanwhile.
const Home = dynamic(() => import("./Home"), { ssr: false, loading: () => <HeroSkeleton /> });

export default function ClientHome() {
  return <Home />;
}

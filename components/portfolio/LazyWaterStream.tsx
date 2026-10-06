"use client";

import dynamic from "next/dynamic";

/** three.js arrives in its own chunk, after the page has painted. */
const WaterStream = dynamic(() => import("./WaterStream"), { ssr: false });

export default WaterStream;

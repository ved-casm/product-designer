import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Vedank Gaur - the flow of a product designer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const asset = (file: string) => readFile(join(process.cwd(), "assets/og", file));

const STREAM = "M-20 508 C 200 476, 330 548, 530 506 S 820 404, 960 452 S 1130 522, 1240 442";

export default async function Image() {
  const [inter400, inter600, serif, serifItalic, portrait, mono] = await Promise.all([
    asset("inter-latin-400-normal.woff"),
    asset("inter-latin-600-normal.woff"),
    asset("newsreader-latin-500-normal.woff"),
    asset("newsreader-latin-500-italic.woff"),
    asset("portrait.jpg"),
    asset("monogram.png"),
  ]);
  const portraitSrc = `data:image/jpeg;base64,${portrait.toString("base64")}`;
  const monoSrc = `data:image/png;base64,${mono.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#06080b",
          color: "#eef2f6",
          fontFamily: "Inter",
        }}
      >
        {/* Glowing water stream: wide faint strokes fake the bloom. */}
        <svg width="1200" height="630" viewBox="0 0 1200 630" style={{ position: "absolute", left: 0, top: 0 }}>
          <defs>
            <linearGradient id="w" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#0a4f8a" />
              <stop offset="0.55" stopColor="#22c6ff" />
              <stop offset="1" stopColor="#e9fbff" />
            </linearGradient>
          </defs>
          <path d={STREAM} stroke="#3fdcff" strokeOpacity="0.06" strokeWidth="70" fill="none" strokeLinecap="round" />
          <path d={STREAM} stroke="#3fdcff" strokeOpacity="0.1" strokeWidth="40" fill="none" strokeLinecap="round" />
          <path d={STREAM} stroke="#3fdcff" strokeOpacity="0.18" strokeWidth="20" fill="none" strokeLinecap="round" />
          <path d={STREAM} stroke="url(#w)" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path
            d={STREAM}
            stroke="#f2feff"
            strokeOpacity="0.8"
            strokeWidth="2"
            strokeDasharray="14 30"
            fill="none"
            strokeLinecap="round"
          />
        </svg>

        <div style={{ display: "flex", flexDirection: "column", padding: "64px 0 0 72px", width: 720 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={monoSrc} width={52} height={49} alt="" />
            <div style={{ fontSize: 24, color: "#aab3bf", letterSpacing: "-0.5px" }}>vedank gaur · jaipur, in</div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 52,
              fontFamily: "Newsreader",
              fontSize: 84,
              lineHeight: 1,
              letterSpacing: "-3px",
            }}
          >
            <span>the flow of a</span>
            <span style={{ fontStyle: "italic", color: "#5be7ff" }}>product designer.</span>
          </div>
          <div style={{ marginTop: 28, fontSize: 28, color: "#aab3bf", letterSpacing: "-0.8px", lineHeight: 1.3, maxWidth: 560 }}>
            i design products from scratch, build them, and ship them.
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            right: 84,
            top: 96,
            width: 340,
            height: 340,
            borderRadius: 999,
            display: "flex",
            border: "3px solid #5be7ff",
            boxShadow: "0 0 60px rgba(63,220,255,0.45)",
            overflow: "hidden",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={portraitSrc} width={340} height={340} alt="" style={{ objectFit: "cover" }} />
        </div>

        <div
          style={{
            position: "absolute",
            left: 72,
            bottom: 48,
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 22,
            fontWeight: 600,
            color: "#eef2f6",
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: 99, background: "#22c55e" }} />
          available for new products
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: inter400, weight: 400, style: "normal" },
        { name: "Inter", data: inter600, weight: 600, style: "normal" },
        { name: "Newsreader", data: serif, weight: 500, style: "normal" },
        { name: "Newsreader", data: serifItalic, weight: 500, style: "italic" },
      ],
    },
  );
}

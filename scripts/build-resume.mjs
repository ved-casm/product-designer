// Renders resume/resume.html to public/resume/*.pdf with headless Chrome (text stays selectable for ATS).
import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const candidates = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].filter(Boolean);
const chrome = candidates.find((p) => existsSync(p));
if (!chrome) throw new Error("Chrome not found - set CHROME_PATH");

const src = pathToFileURL(resolve("resume/resume.html")).href;
const out = resolve("public/resume/VedankGaur_ProductDesigner_Resume.pdf");
execFileSync(chrome, [
  "--headless=new",
  "--disable-gpu",
  "--no-pdf-header-footer",
  "--allow-file-access-from-files",
  "--virtual-time-budget=4000",
  `--print-to-pdf=${out}`,
  src,
]);
console.log(`resume → ${out} (${Math.round(statSync(out).size / 1024)} KB)`);

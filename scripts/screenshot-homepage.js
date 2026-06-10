import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const outDir = path.resolve(process.cwd(), "screenshots");
const url = process.env.QARENA_LOCAL_URL || "http://localhost:5173/";

const protectedPaths = [
  "/subjects",
  "/subjects/search",
  "/predictions",
  "/questions",
  "/overview",
  "/generate-answer",
  "/answers",
  "/export/pdf",
  "/predictions/export/pdf",
  "/api/v1/subjects",
  "/api/v1/subjects/search",
  "/api/v1/generate-answer",
];

(async () => {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const requests = [];

  page.on("request", (request) => {
    const urlStr = request.url();
    const r = {
      url: urlStr,
      method: request.method(),
      resourceType: request.resourceType(),
      timestamp: Date.now(),
      matchedProtected: protectedPaths.some((p) => urlStr.includes(p)),
    };
    requests.push(r);
  });

  const sizes = [
    { name: "home-desktop-1440", width: 1440, height: 1024 },
    { name: "home-laptop-1024", width: 1024, height: 768 },
    { name: "home-tablet-768", width: 768, height: 1024 },
    { name: "home-mobile-390", width: 390, height: 844 },
  ];

  for (const s of sizes) {
    console.log(`Rendering ${s.name} ${s.width}x${s.height} ...`);
    await page.setViewportSize({ width: s.width, height: s.height });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const screenshotPath = path.join(outDir, `${s.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved ${screenshotPath}`);
  }

  const netLogPath = path.join(outDir, "network-log.json");
  fs.writeFileSync(netLogPath, JSON.stringify({ url, requested: requests, protectedPaths }, null, 2));
  console.log(`Saved network log to ${netLogPath}`);

  const flagged = requests.filter((r) => r.matchedProtected);
  console.log(`Total requests captured: ${requests.length}`);
  console.log(`Protected requests flagged: ${flagged.length}`);
  if (flagged.length > 0) {
    console.log(flagged.slice(0, 10));
  }

  await browser.close();
})();
